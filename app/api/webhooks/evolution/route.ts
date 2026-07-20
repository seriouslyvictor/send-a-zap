import { timingSafeEqual } from "node:crypto";

import { CampaignStatus, MessageStatus, type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { EVOLUTION_CONNECTION_ID } from "@/lib/evolution-connection";
import {
  normalizeEvolutionWebhook,
  type EvolutionMessageStatus,
} from "@/lib/evolution-webhook";
import { getPrisma } from "@/lib/prisma";

const STATUS_RANK: Record<MessageStatus, number> = {
  PENDING: 0,
  QUEUED: 1,
  SENT: 2,
  DELIVERED: 3,
  READ: 4,
  FAILED: -1,
};

function suppliedWebhookSecret(request: Request): string | null {
  return (
    request.headers.get("x-evolution-webhook-secret") ??
    new URL(request.url).searchParams.get("secret")
  );
}

function webhookSecretMatches(request: Request): boolean {
  const expected = process.env.EVOLUTION_WEBHOOK_SECRET;
  const supplied = suppliedWebhookSecret(request);
  if (!expected || !supplied) return false;

  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return (
    expectedBytes.length === suppliedBytes.length &&
    timingSafeEqual(expectedBytes, suppliedBytes)
  );
}

function eventTime(timestamp?: string): Date {
  const parsed = timestamp ? new Date(timestamp) : new Date(Number.NaN);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function transitionData(
  currentStatus: MessageStatus,
  nextStatus: EvolutionMessageStatus,
  occurredAt: Date,
): {
  message: Prisma.MessageUpdateManyMutationInput;
  campaign: Prisma.CampaignUpdateInput;
} | null {
  const next = nextStatus as MessageStatus;
  const currentRank = STATUS_RANK[currentStatus];
  const nextRank = STATUS_RANK[next];
  if (currentStatus === MessageStatus.FAILED || nextRank <= currentRank) {
    return null;
  }

  const message: Prisma.MessageUpdateManyMutationInput = { status: next };
  const campaign: Prisma.CampaignUpdateInput = {};

  if (currentRank < STATUS_RANK.SENT && nextRank >= STATUS_RANK.SENT) {
    message.sentAt = occurredAt;
    campaign.sentCount = { increment: 1 };
  }
  if (currentRank < STATUS_RANK.DELIVERED && nextRank >= STATUS_RANK.DELIVERED) {
    message.deliveredAt = occurredAt;
    campaign.deliveredCount = { increment: 1 };
  }
  if (currentRank < STATUS_RANK.READ && nextRank >= STATUS_RANK.READ) {
    message.readAt = occurredAt;
    campaign.readCount = { increment: 1 };
  }

  return { message, campaign };
}

async function applyStatus(
  messageId: string,
  status: EvolutionMessageStatus,
  occurredAt: Date,
): Promise<string | null> {
  const prisma = getPrisma();
  return prisma.$transaction(async (transaction) => {
    const current = await transaction.message.findFirst({
      where: { messageId },
      select: { id: true, campaignId: true, status: true },
    });
    if (!current) return null;

    const transition = transitionData(current.status, status, occurredAt);
    if (!transition) return current.campaignId;

    const updated = await transaction.message.updateMany({
      where: { id: current.id, status: current.status },
      data: transition.message,
    });
    if (updated.count !== 1) return current.campaignId;

    if (Object.keys(transition.campaign).length > 0) {
      await transaction.campaign.update({
        where: { id: current.campaignId },
        data: transition.campaign,
      });
    }

    return current.campaignId;
  });
}

async function completeCampaignWhenFinished(campaignId: string): Promise<void> {
  const prisma = getPrisma();
  const pendingCount = await prisma.message.count({
    where: {
      campaignId,
      status: { in: [MessageStatus.PENDING, MessageStatus.QUEUED] },
    },
  });
  if (pendingCount !== 0) return;

  await prisma.campaign.updateMany({
    where: { id: campaignId, status: CampaignStatus.RUNNING },
    data: { status: CampaignStatus.COMPLETED, completedAt: new Date() },
  });
}

export async function POST(request: Request) {
  if (!process.env.EVOLUTION_WEBHOOK_SECRET) {
    console.error("[EVOLUTION_WEBHOOK] EVOLUTION_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { success: false, error: "Webhook authentication is not configured" },
      { status: 503 },
    );
  }
  if (!webhookSecretMatches(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized webhook" },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const event = normalizeEvolutionWebhook(payload);
  if (!event) {
    return NextResponse.json({ success: true, message: "Event ignored" });
  }

  const connection = await getPrisma().evolutionConnection.findUnique({
    where: { id: EVOLUTION_CONNECTION_ID },
    select: { instanceId: true },
  });
  if (!connection || event.instanceId !== connection.instanceId) {
    return NextResponse.json({
      success: true,
      message: "Foreign Evolution instance ignored",
    });
  }

  try {
    const occurredAt = eventTime(event.timestamp);
    const campaignIds = new Set<string>();
    for (const messageId of event.messageIds) {
      const campaignId = await applyStatus(messageId, event.status, occurredAt);
      if (campaignId) campaignIds.add(campaignId);
    }
    for (const campaignId of campaignIds) {
      await completeCampaignWhenFinished(campaignId);
    }

    return NextResponse.json({
      success: true,
      data: {
        messageIds: event.messageIds,
        status: event.status,
      },
    });
  } catch (error) {
    console.error("[EVOLUTION_WEBHOOK] Status update failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update message status" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Evolution webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
