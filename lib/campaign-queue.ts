import { Queue, type ConnectionOptions } from "bullmq";

import type {
  CampaignTick,
  CampaignTickQueue,
} from "@/lib/campaign-runner";

export const CAMPAIGN_QUEUE_NAME = "campaign-runs";
const TICK_JOB_NAME = "tick" as const;

type BullCampaignQueue = {
  add(
    name: typeof TICK_JOB_NAME,
    data: CampaignTick,
    options: {
      delay: number;
      jobId: string;
      removeOnComplete: { age: number; count: number };
      removeOnFail: boolean;
    },
  ): Promise<unknown>;
};

declare global {
  var campaignQueue: Queue<CampaignTick, unknown, typeof TICK_JOB_NAME> | undefined;
}

let campaignQueue: Queue<CampaignTick, unknown, typeof TICK_JOB_NAME> | undefined;

export function getRedisConnection(
  redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
): ConnectionOptions {
  const url = new URL(redisUrl);
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
    throw new Error("REDIS_URL must use the redis: or rediss: protocol");
  }

  const database = url.pathname.slice(1);

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(database ? { db: Number(database) } : {}),
    ...(url.protocol === "rediss:" ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
  };
}

export function getCampaignTickJobId({
  campaignId,
  runId,
  tick,
}: CampaignTick) {
  return `${campaignId}_${runId}_${tick}`.replaceAll(":", "_");
}

export function createCampaignTickQueue(
  bullQueue: BullCampaignQueue,
): CampaignTickQueue {
  return {
    async enqueue(tick, delaySeconds) {
      await bullQueue.add(TICK_JOB_NAME, tick, {
        delay: Math.max(0, delaySeconds) * 1_000,
        jobId: getCampaignTickJobId(tick),
        removeOnComplete: { age: 86_400, count: 10_000 },
        removeOnFail: false,
      });
    },
  };
}

export function getCampaignQueue() {
  campaignQueue ??=
    globalThis.campaignQueue ??
    new Queue<CampaignTick, unknown, typeof TICK_JOB_NAME>(CAMPAIGN_QUEUE_NAME, {
      connection: getRedisConnection(),
    });

  if (process.env.NODE_ENV !== "production") {
    globalThis.campaignQueue = campaignQueue;
  }

  return campaignQueue;
}

export function getCampaignTickQueue() {
  return createCampaignTickQueue(getCampaignQueue());
}
