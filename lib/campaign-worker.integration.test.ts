import { randomUUID } from "node:crypto";

import { Queue } from "bullmq";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createCampaignTickQueue,
  getRedisConnection,
} from "@/lib/campaign-queue";
import {
  createCampaignRunner,
  type CampaignRunnerExecutor,
  type CampaignTick,
} from "@/lib/campaign-runner";
import { createCampaignWorker } from "@/lib/campaign-worker";

async function waitFor(assertion: () => Promise<void> | void) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      await assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  throw lastError;
}

describe("campaign worker restart safety", () => {
  const connection = getRedisConnection();
  let bullQueue: Queue<CampaignTick> | undefined;
  let worker: ReturnType<typeof createCampaignWorker> | undefined;

  afterEach(async () => {
    await worker?.close(true);
    if (bullQueue) {
      await bullQueue.obliterate({ force: true });
      await bullQueue.close();
    }
  });

  it("keeps a delayed run across a worker restart without dropping or double-sending", async () => {
    const queueName = `campaign-restart-${randomUUID()}`;
    bullQueue = new Queue<CampaignTick>(queueName, { connection });
    const tickQueue = createCampaignTickQueue(bullQueue);
    const pendingMessages = ["message-1", "message-2"];
    const sentMessages: string[] = [];
    let completed = false;

    const executor: CampaignRunnerExecutor = {
      initialize: vi.fn().mockResolvedValue({ campaignId: "campaign-1" }),
      claim: vi.fn().mockImplementation(async (campaignId) => {
        const messageId = pendingMessages.shift();
        if (!messageId) {
          completed = true;
          return { state: "completed" as const, campaignId };
        }
        return {
          state: "claimed" as const,
          campaignId,
          messageId,
          messageDelaySeconds: 0,
          batchDelaySeconds: 0,
          batchSize: 10,
          postSendDelaySeconds: messageId === "message-1" ? 0.5 : 0,
        };
      }),
      send: vi.fn().mockImplementation(async (messageId: string) => {
        sentMessages.push(messageId);
        return { state: "sent" as const };
      }),
      fail: vi.fn().mockResolvedValue({ state: "failed" }),
    };
    const runner = createCampaignRunner({
      executor,
      queue: tickQueue,
      generateRunId: () => "run-1",
    });

    worker = createCampaignWorker({
      queueName,
      connection,
      processor: runner.handleTick,
    });
    await runner.start("campaign-1");

    await waitFor(async () => {
      expect(sentMessages).toEqual(["message-1"]);
      expect(await bullQueue!.getDelayedCount()).toBe(1);
    });

    await worker.close();
    worker = createCampaignWorker({
      queueName,
      connection,
      processor: runner.handleTick,
    });

    await waitFor(() => {
      expect(completed).toBe(true);
      expect(sentMessages).toEqual(["message-1", "message-2"]);
    });
    expect(new Set(sentMessages).size).toBe(2);
    expect(executor.fail).not.toHaveBeenCalled();
  });
});
