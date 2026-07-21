import { CampaignStatus, MessageStatus, type Prisma } from "@prisma/client";

import { EVOLUTION_CONNECTION_ID } from "@/lib/evolution-connection";
import { getEvolutionAPI } from "@/lib/evolution-api";
import { getPrisma } from "@/lib/prisma";

const CAMPAIGN_LOCK_NAMESPACE = "send-a-zap:campaign:";

type Transaction = Prisma.TransactionClient;

export type CampaignClaim =
  | {
      state: "claimed";
      campaignId: string;
      messageId: string;
      messageDelaySeconds: number;
      batchDelaySeconds: number;
      batchSize: number;
      postSendDelaySeconds: number;
    }
  | {
      state: "waiting";
      campaignId: string;
      waitSeconds: number;
      reason: "in_flight" | "retry_delay";
    }
  | {
      state: "paused" | "cancelled" | "completed" | "stopped";
      campaignId: string;
    };

async function lockCampaign(transaction: Transaction, campaignId: string) {
  await transaction.$executeRaw`
    SELECT pg_advisory_xact_lock(
      hashtext(${`${CAMPAIGN_LOCK_NAMESPACE}${campaignId}`})
    )
  `;
}

export async function initializeCampaignExecution(
  campaignId: string,
  runId: string,
) {
  return getPrisma().$transaction(async (transaction) => {
    await lockCampaign(transaction, campaignId);

    const campaign = await transaction.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      throw new CampaignExecutionError("campaign_not_found", "Campaign not found", 404);
    }

    const allowedStatuses: CampaignStatus[] = [
      CampaignStatus.DRAFT,
      CampaignStatus.FAILED,
      CampaignStatus.PAUSED,
    ];
    if (!allowedStatuses.includes(campaign.status)) {
      throw new CampaignExecutionError(
        "invalid_campaign_state",
        `Campaign cannot start from ${campaign.status}`,
        409,
      );
    }

    if (campaign.status === CampaignStatus.FAILED) {
      await transaction.message.updateMany({
        where: { campaignId, status: MessageStatus.FAILED },
        data: {
          status: MessageStatus.PENDING,
          retryCount: 0,
          lastRetryAt: null,
          errorMessage: null,
          messageId: null,
        },
      });
    }

    await transaction.message.updateMany({
      where: { campaignId, status: MessageStatus.QUEUED },
      data: { status: MessageStatus.PENDING },
    });

    const pendingCount = await transaction.message.count({
      where: { campaignId, status: MessageStatus.PENDING },
    });
    if (pendingCount === 0) {
      throw new CampaignExecutionError(
        "no_pending_messages",
        "Campaign has no pending messages",
        409,
      );
    }

    const updated = await transaction.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.RUNNING,
        startedAt: campaign.startedAt ?? new Date(),
        completedAt: null,
        runId,
        ...(campaign.status === CampaignStatus.FAILED
          ? { failedCount: 0 }
          : {}),
      },
    });

    return {
      campaignId: updated.id,
      status: updated.status,
      pendingCount,
      batchSize: updated.batchSize,
      messageDelaySeconds: updated.messageDelay,
      batchDelaySeconds: updated.batchDelay,
      autoRetry: updated.autoRetry,
      maxRetries: updated.maxRetries,
      retryDelayMinutes: updated.retryDelay,
    };
  });
}

export async function claimNextCampaignMessage(
  campaignId: string,
  runId: string,
): Promise<CampaignClaim> {
  return getPrisma().$transaction(async (transaction) => {
    await lockCampaign(transaction, campaignId);

    const campaign = await transaction.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      throw new CampaignExecutionError("campaign_not_found", "Campaign not found", 404);
    }

    if (campaign.status !== CampaignStatus.RUNNING) {
      const state =
        campaign.status === CampaignStatus.PAUSED
          ? "paused"
          : campaign.status === CampaignStatus.CANCELLED
            ? "cancelled"
            : campaign.status === CampaignStatus.COMPLETED
              ? "completed"
              : "stopped";
      return { state, campaignId };
    }

    if (campaign.runId !== runId) {
      return { state: "stopped", campaignId };
    }

    let message = await transaction.message.findFirst({
      where: { campaignId, status: MessageStatus.PENDING },
      orderBy: { createdAt: "asc" },
    });

    if (!message && campaign.autoRetry) {
      const retryable = await transaction.message.findFirst({
        where: {
          campaignId,
          status: MessageStatus.FAILED,
          retryCount: { lt: campaign.maxRetries },
        },
        orderBy: { lastRetryAt: "asc" },
      });

      if (retryable) {
        const eligibleAt =
          (retryable.lastRetryAt?.getTime() ?? 0) + campaign.retryDelay * 60_000;
        const remainingMs = eligibleAt - Date.now();
        if (remainingMs > 0) {
          return {
            state: "waiting",
            campaignId,
            waitSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
            reason: "retry_delay",
          };
        }

        const reclaimed = await transaction.message.updateMany({
          where: { id: retryable.id, status: MessageStatus.FAILED },
          data: {
            status: MessageStatus.QUEUED,
            errorMessage: null,
          },
        });
        if (reclaimed.count === 1) {
          await transaction.campaign.update({
            where: { id: campaignId },
            data: { failedCount: { decrement: 1 } },
          });
          message = { ...retryable, status: MessageStatus.QUEUED };
        }
      }
    }

    if (!message) {
      const inFlight = await transaction.message.count({
        where: { campaignId, status: MessageStatus.QUEUED },
      });
      if (inFlight > 0) {
        return {
          state: "waiting",
          campaignId,
          waitSeconds: 1,
          reason: "in_flight",
        };
      }

      await transaction.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.COMPLETED, completedAt: new Date() },
      });
      return { state: "completed", campaignId };
    }

    if (message.status === MessageStatus.PENDING) {
      const claimed = await transaction.message.updateMany({
        where: { id: message.id, status: MessageStatus.PENDING },
        data: { status: MessageStatus.QUEUED },
      });
      if (claimed.count !== 1) {
        return {
          state: "waiting",
          campaignId,
          waitSeconds: 1,
          reason: "in_flight",
        };
      }
    }

    return {
      state: "claimed",
      campaignId,
      messageId: message.id,
      messageDelaySeconds: campaign.messageDelay,
      batchDelaySeconds: campaign.batchDelay,
      batchSize: campaign.batchSize,
      postSendDelaySeconds:
        campaign.messageDelay +
        ((campaign.sentCount + campaign.failedCount + 1) %
          Math.max(1, campaign.batchSize) ===
        0
          ? campaign.batchDelay
          : 0),
    };
  });
}

export async function sendClaimedCampaignMessage(messageId: string) {
  const prisma = getPrisma();
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { campaign: true },
  });
  if (!message) {
    throw new CampaignExecutionError("message_not_found", "Message not found", 404);
  }

  const alreadySentStatuses: MessageStatus[] = [
    MessageStatus.SENT,
    MessageStatus.DELIVERED,
    MessageStatus.READ,
  ];
  if (alreadySentStatuses.includes(message.status)) {
    return {
      state: "already_sent" as const,
      campaignId: message.campaignId,
      messageId: message.id,
      providerMessageId: message.messageId,
    };
  }

  if (message.campaign.status !== CampaignStatus.RUNNING) {
    if (message.status === MessageStatus.QUEUED) {
      await prisma.message.updateMany({
        where: { id: message.id, status: MessageStatus.QUEUED },
        data: { status: MessageStatus.PENDING },
      });
    }
    return {
      state: "skipped" as const,
      campaignId: message.campaignId,
      messageId: message.id,
      reason: `campaign_${message.campaign.status.toLowerCase()}`,
    };
  }

  if (message.status !== MessageStatus.QUEUED) {
    throw new CampaignExecutionError(
      "invalid_message_state",
      `Message cannot send from ${message.status}`,
      409,
    );
  }

  const connection = await prisma.evolutionConnection.findUnique({
    where: { id: EVOLUTION_CONNECTION_ID },
  });
  if (!connection || connection.instanceName !== message.campaign.instanceName) {
    throw new CampaignExecutionError(
      "connection_mismatch",
      "Campaign connection is no longer active",
      409,
    );
  }

  try {
    const api = getEvolutionAPI();
    const providerMessageId = message.messageId
      ? await api.sendTrackedTextWithId(
          connection,
          message.phone,
          message.renderedMessage ?? "",
          message.messageId,
        )
      : await api.sendTrackedText(
          connection,
          message.phone,
          message.renderedMessage ?? "",
          async (preassignedId) => {
            const persisted = await prisma.message.updateMany({
              where: { id: message.id, status: MessageStatus.QUEUED, messageId: null },
              data: { messageId: preassignedId },
            });
            if (persisted.count !== 1) {
              throw new Error("Message was no longer claimable while assigning provider ID");
            }
          },
        );

    await prisma.$transaction(async (transaction) => {
      const updated = await transaction.message.updateMany({
        where: { id: message.id, status: MessageStatus.QUEUED },
        data: {
          status: MessageStatus.SENT,
          sentAt: new Date(),
          errorMessage: null,
        },
      });
      if (updated.count === 1) {
        await transaction.campaign.update({
          where: { id: message.campaignId },
          data: { sentCount: { increment: 1 } },
        });
      }
    });

    return {
      state: "sent" as const,
      campaignId: message.campaignId,
      messageId: message.id,
      providerMessageId,
    };
  } catch (error) {
    await prisma.$transaction(async (transaction) => {
      const failed = await transaction.message.updateMany({
        where: { id: message.id, status: MessageStatus.QUEUED },
        data: {
          status: MessageStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : "Unknown send error",
          retryCount: { increment: 1 },
          lastRetryAt: new Date(),
        },
      });
      if (failed.count === 1) {
        await transaction.campaign.update({
          where: { id: message.campaignId },
          data: { failedCount: { increment: 1 } },
        });
      }
    });
    throw error;
  }
}

export async function failClaimedCampaignMessage(
  messageId: string,
  errorMessage: string,
) {
  const prisma = getPrisma();
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { campaignId: true },
  });
  if (!message) {
    throw new CampaignExecutionError("message_not_found", "Message not found", 404);
  }

  const failed = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.message.updateMany({
      where: { id: messageId, status: MessageStatus.QUEUED },
      data: {
        status: MessageStatus.FAILED,
        errorMessage,
        retryCount: { increment: 1 },
        lastRetryAt: new Date(),
      },
    });
    if (updated.count === 1) {
      await transaction.campaign.update({
        where: { id: message.campaignId },
        data: { failedCount: { increment: 1 } },
      });
    }
    return updated.count;
  });

  return {
    state: failed === 1 ? ("failed" as const) : ("unchanged" as const),
    campaignId: message.campaignId,
    messageId,
    errorMessage,
  };
}

export async function failCampaignExecution(
  target: { campaignId?: string; runId: string },
  errorMessage: string,
) {
  const prisma = getPrisma();
  const campaignId =
    target.campaignId ??
    (
      await prisma.campaign.findFirst({
        where: { runId: target.runId },
        select: { id: true },
      })
    )?.id;
  if (!campaignId) {
    return {
      campaignId: null,
      state: "not_found" as const,
      errorMessage,
    };
  }
  return prisma.$transaction(async (transaction) => {
    await lockCampaign(transaction, campaignId);
    const campaign = await transaction.campaign.findUnique({
      where: { id: campaignId },
      select: { runId: true },
    });
    if (!campaign || campaign.runId !== target.runId) {
      return { count: 0 };
    }
    await transaction.message.updateMany({
      where: { campaignId, status: MessageStatus.QUEUED },
      data: { status: MessageStatus.PENDING },
    });
    return transaction.campaign.updateMany({
      where: { id: campaignId, status: CampaignStatus.RUNNING },
      data: {
        status: CampaignStatus.FAILED,
        completedAt: new Date(),
      },
    });
  }).then((result) => ({
    campaignId,
    state: result.count === 1 ? ("failed" as const) : ("unchanged" as const),
    errorMessage,
  }));
}

export class CampaignExecutionError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CampaignExecutionError";
  }
}
