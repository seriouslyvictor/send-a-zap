import type { EvolutionMessageStatus } from "./evolution-webhook";

export type StoredMessageStatus =
  | "PENDING"
  | "QUEUED"
  | EvolutionMessageStatus
  | "FAILED";

export interface StoredEvolutionMessage {
  id: string;
  campaignId: string;
  status: StoredMessageStatus;
}

export interface StatusMessageUpdate {
  status: EvolutionMessageStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
}

export interface StatusCampaignIncrements {
  sent: 0 | 1;
  delivered: 0 | 1;
  read: 0 | 1;
}

export interface EvolutionStatusTransaction {
  findMessageByProviderId(
    messageId: string,
  ): Promise<StoredEvolutionMessage | null>;
  compareAndSetMessage(
    id: string,
    expectedStatus: StoredMessageStatus,
    update: StatusMessageUpdate,
  ): Promise<boolean>;
  incrementCampaign(
    campaignId: string,
    increments: StatusCampaignIncrements,
  ): Promise<void>;
}

export interface EvolutionStatusStore {
  transaction<T>(
    work: (transaction: EvolutionStatusTransaction) => Promise<T>,
  ): Promise<T>;
}

const STATUS_RANK: Record<StoredMessageStatus, number> = {
  PENDING: 0,
  QUEUED: 1,
  SENT: 2,
  DELIVERED: 3,
  READ: 4,
  FAILED: -1,
};

const MAX_CAS_ATTEMPTS = 8;

function transition(
  currentStatus: StoredMessageStatus,
  nextStatus: EvolutionMessageStatus,
  occurredAt: Date,
): {
  update: StatusMessageUpdate;
  increments: StatusCampaignIncrements;
} | null {
  const currentRank = STATUS_RANK[currentStatus];
  const nextRank = STATUS_RANK[nextStatus];
  if (currentStatus === "FAILED" || currentRank >= nextRank) return null;

  const update: StatusMessageUpdate = { status: nextStatus };
  const increments: StatusCampaignIncrements = {
    sent: 0,
    delivered: 0,
    read: 0,
  };
  if (currentRank < STATUS_RANK.SENT && nextRank >= STATUS_RANK.SENT) {
    update.sentAt = occurredAt;
    increments.sent = 1;
  }
  if (
    currentRank < STATUS_RANK.DELIVERED &&
    nextRank >= STATUS_RANK.DELIVERED
  ) {
    update.deliveredAt = occurredAt;
    increments.delivered = 1;
  }
  if (currentRank < STATUS_RANK.READ && nextRank >= STATUS_RANK.READ) {
    update.readAt = occurredAt;
    increments.read = 1;
  }

  return { update, increments };
}

export async function applyEvolutionMessageStatus(
  store: EvolutionStatusStore,
  messageId: string,
  status: EvolutionMessageStatus,
  occurredAt: Date,
): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt += 1) {
    const result = await store.transaction(async (transaction) => {
      const current = await transaction.findMessageByProviderId(messageId);
      if (!current) return { kind: "missing" } as const;

      const planned = transition(current.status, status, occurredAt);
      if (!planned) {
        return { kind: "settled", campaignId: current.campaignId } as const;
      }

      const updated = await transaction.compareAndSetMessage(
        current.id,
        current.status,
        planned.update,
      );
      if (!updated) return { kind: "retry" } as const;

      await transaction.incrementCampaign(
        current.campaignId,
        planned.increments,
      );
      return { kind: "settled", campaignId: current.campaignId } as const;
    });

    if (result.kind === "missing") return null;
    if (result.kind === "settled") return result.campaignId;
  }

  throw new Error(
    `Message ${messageId} status changed concurrently too many times`,
  );
}
