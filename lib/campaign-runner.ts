import { randomUUID } from "node:crypto";

import type { CampaignClaim } from "@/lib/campaign-executor";
import {
  claimNextCampaignMessage,
  failCampaignExecution,
  initializeCampaignExecution,
  sendClaimedCampaignMessage,
} from "@/lib/campaign-executor";

export type CampaignTick = {
  campaignId: string;
  runId: string;
  tick: number;
};

export interface CampaignTickQueue {
  enqueue(tick: CampaignTick, delaySeconds: number): Promise<void>;
}

export interface CampaignRunnerExecutor {
  initialize(campaignId: string, runId: string): Promise<unknown>;
  claim(campaignId: string, runId: string): Promise<CampaignClaim>;
  send(messageId: string): Promise<unknown>;
  fail(
    target: { campaignId?: string; runId: string },
    errorMessage: string,
  ): Promise<unknown>;
}

type CampaignRunnerDependencies = {
  executor: CampaignRunnerExecutor;
  queue: CampaignTickQueue;
  generateRunId?: () => string;
};

export function createCampaignRunner({
  executor,
  queue,
  generateRunId = randomUUID,
}: CampaignRunnerDependencies) {
  async function start(campaignId: string) {
    const runId = generateRunId();
    const firstTick = { campaignId, runId, tick: 0 };

    await executor.initialize(campaignId, runId);
    try {
      await queue.enqueue(firstTick, 0);
    } catch (error) {
      await executor.fail(
        { campaignId, runId },
        error instanceof Error ? error.message : "Campaign enqueue failed",
      );
      throw error;
    }

    return { campaignId, runId };
  }

  async function tick(job: CampaignTick) {
    const claim = await executor.claim(job.campaignId, job.runId);

    if (claim.state === "claimed") {
      await executor.send(claim.messageId);
      await queue.enqueue(
        { ...job, tick: job.tick + 1 },
        claim.postSendDelaySeconds,
      );
    } else if (claim.state === "waiting") {
      await queue.enqueue(
        { ...job, tick: job.tick + 1 },
        claim.waitSeconds,
      );
    }

    return { state: claim.state };
  }

  async function handleTick(job: CampaignTick) {
    try {
      return await tick(job);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown campaign runner error";
      await executor.fail(
        { campaignId: job.campaignId, runId: job.runId },
        errorMessage,
      );
      throw error;
    }
  }

  return { start, tick, handleTick };
}

export function createDefaultCampaignRunner(queue: CampaignTickQueue) {
  return createCampaignRunner({
    queue,
    executor: {
      initialize: initializeCampaignExecution,
      claim: claimNextCampaignMessage,
      send: sendClaimedCampaignMessage,
      fail: failCampaignExecution,
    },
  });
}
