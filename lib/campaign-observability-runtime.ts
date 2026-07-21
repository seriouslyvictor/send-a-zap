import type { Writable } from "node:stream";

import type { Prisma } from "@prisma/client";
import pino from "pino";

import type {
  CampaignEventStore,
  CampaignEventWrite,
  CampaignLogger,
} from "@/lib/campaign-observability";
import { createCampaignObserver } from "@/lib/campaign-observability";
import { getPrisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1_000;
export const DEFAULT_CAMPAIGN_EVENT_RETENTION_DAYS = 30;

type CampaignEventPrisma = {
  campaignEvent: {
    create(args: { data: Prisma.CampaignEventUncheckedCreateInput }): Promise<unknown>;
    deleteMany(args: {
      where: { createdAt: { lt: Date } };
    }): Promise<{ count: number }>;
  };
};

export interface CampaignEventRetentionStore extends CampaignEventStore {
  deleteOlderThan(cutoff: Date): Promise<number>;
}

export function createPinoCampaignLogger({
  level = process.env.LOG_LEVEL ?? "info",
  destination,
}: {
  level?: string;
  destination?: Writable;
} = {}): CampaignLogger {
  return pino({ level }, destination);
}

export function createPrismaCampaignEventStore(
  prisma: CampaignEventPrisma = getPrisma(),
): CampaignEventRetentionStore {
  return {
    async append(event: CampaignEventWrite) {
      await prisma.campaignEvent.create({
        data: event as Prisma.CampaignEventUncheckedCreateInput,
      });
    },
    async deleteOlderThan(cutoff: Date) {
      const result = await prisma.campaignEvent.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      return result.count;
    },
  };
}

export function getCampaignEventRetentionDays(
  value = process.env.CAMPAIGN_EVENT_RETENTION_DAYS,
) {
  const parsed = Number(value ?? DEFAULT_CAMPAIGN_EVENT_RETENTION_DAYS);
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_CAMPAIGN_EVENT_RETENTION_DAYS;
}

export function createCampaignEventPruner({
  eventStore,
  retentionDays = getCampaignEventRetentionDays(),
  now = () => new Date(),
}: {
  eventStore: CampaignEventRetentionStore;
  retentionDays?: number;
  now?: () => Date;
}) {
  let nextPruneAt = 0;

  async function pruneNow() {
    const cutoff = new Date(now().getTime() - retentionDays * DAY_MS);
    return eventStore.deleteOlderThan(cutoff);
  }

  async function pruneIfDue() {
    const currentTime = now().getTime();
    if (currentTime < nextPruneAt) {
      return 0;
    }
    nextPruneAt = currentTime + DAY_MS;
    return pruneNow();
  }

  return { pruneIfDue, pruneNow };
}

export function createDefaultCampaignObserver() {
  const logger = createPinoCampaignLogger();
  const eventStore = createPrismaCampaignEventStore();
  const eventPruner = createCampaignEventPruner({ eventStore });

  return createCampaignObserver({ logger, eventStore, eventPruner });
}
