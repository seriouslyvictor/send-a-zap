import { timingSafeEqual } from "node:crypto";

import { CampaignStatus, MessageStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { EVOLUTION_CONNECTION_ID } from "@/lib/evolution-connection";
import {
  normalizeEvolutionWebhook,
} from "@/lib/evolution-webhook";
import {
  applyEvolutionMessageStatus,
  type EvolutionStatusStore,
  type StoredMessageStatus,
} from "@/lib/evolution-webhook-status";
import { getPrisma } from "@/lib/prisma";

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

function toPrismaStatus(status: StoredMessageStatus): MessageStatus {
  switch (status) {
    case "PENDING":
      return MessageStatus.PENDING;
    case "QUEUED":
      return MessageStatus.QUEUED;
    case "SENT":
      return MessageStatus.SENT;
    case "DELIVERED":
      return MessageStatus.DELIVERED;
    case "READ":
      return MessageStatus.READ;
    case "FAILED":
      return MessageStatus.FAILED;
  }
}

function fromPrismaStatus(status: MessageStatus): StoredMessageStatus {
  switch (status) {
    case MessageStatus.PENDING:
      return "PENDING";
    case MessageStatus.QUEUED:
      return "QUEUED";
    case MessageStatus.SENT:
      return "SENT";
    case MessageStatus.DELIVERED:
      return "DELIVERED";
    case MessageStatus.READ:
      return "READ";
    case MessageStatus.FAILED:
      return "FAILED";
  }
}

function prismaStatusStore(): EvolutionStatusStore {
  const prisma = getPrisma();
  return {
    transaction: (work) =>
      prisma.$transaction((transaction) =>
        work({
          findMessageByProviderId: async (messageId) => {
            const message = await transaction.message.findFirst({
              where: { messageId },
              select: { id: true, campaignId: true, status: true },
            });
            return message
              ? {
                  ...message,
                  status: fromPrismaStatus(message.status),
                }
              : null;
          },
          compareAndSetMessage: async (id, expectedStatus, update) => {
            const updated = await transaction.message.updateMany({
              where: { id, status: toPrismaStatus(expectedStatus) },
              data: {
                status: toPrismaStatus(update.status),
                sentAt: update.sentAt,
                deliveredAt: update.deliveredAt,
                readAt: update.readAt,
              },
            });
            return updated.count === 1;
          },
          incrementCampaign: async (campaignId, increments) => {
            await transaction.campaign.update({
              where: { id: campaignId },
              data: {
                sentCount:
                  increments.sent === 1 ? { increment: 1 } : undefined,
                deliveredCount:
                  increments.delivered === 1 ? { increment: 1 } : undefined,
                readCount:
                  increments.read === 1 ? { increment: 1 } : undefined,
              },
            });
          },
        }),
      ),
  };
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
    const statusStore = prismaStatusStore();
    for (const messageId of event.messageIds) {
      const campaignId = await applyEvolutionMessageStatus(
        statusStore,
        messageId,
        event.status,
        occurredAt,
      );
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
