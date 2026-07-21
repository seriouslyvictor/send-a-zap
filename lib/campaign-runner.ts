import { randomUUID } from "node:crypto";

import type { CampaignObserver } from "@/lib/campaign-observability";
import { createDefaultCampaignObserver } from "@/lib/campaign-observability-runtime";
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
  send(messageId: string): Promise<{
    state: string;
    providerMessageId?: string | null;
  }>;
  fail(
    target: { campaignId?: string; runId: string },
    errorMessage: string,
  ): Promise<unknown>;
}

type CampaignRunnerDependencies = {
  executor: CampaignRunnerExecutor;
  queue: CampaignTickQueue;
  observer?: Pick<CampaignObserver, "record">;
  generateRunId?: () => string;
  now?: () => number;
};

const NOOP_OBSERVER: Pick<CampaignObserver, "record"> = {
  async record() {},
};

class CampaignRunnerTickError extends Error {
  constructor(
    error: unknown,
    readonly messageId: string,
  ) {
    super(error instanceof Error ? error.message : "Unknown campaign runner error", {
      cause: error,
    });
    this.name = "CampaignRunnerTickError";
    this.stack = error instanceof Error ? error.stack : this.stack;
  }
}

export function createCampaignRunner({
  executor,
  queue,
  observer = NOOP_OBSERVER,
  generateRunId = randomUUID,
  now = Date.now,
}: CampaignRunnerDependencies) {
  function durationSince(startedAt: number) {
    return Math.max(0, now() - startedAt);
  }

  async function recordFailure(
    job: CampaignTick,
    error: unknown,
    attempt: number,
  ) {
    const messageId =
      error instanceof CampaignRunnerTickError ? error.messageId : undefined;
    await observer.record({
      runId: job.runId,
      campaignId: job.campaignId,
      ...(messageId ? { messageId } : {}),
      tick: job.tick,
      event: "run_failed",
      state: "failed",
      durationMs: 0,
      level: "error",
      message: "Campaign run failed",
      data: {
        attempt,
        stack:
          error instanceof Error
            ? (error.stack ?? error.message)
            : String(error),
      },
    });
  }

  async function start(campaignId: string) {
    const runId = generateRunId();
    const firstTick = { campaignId, runId, tick: 0 };
    const runStartedAt = now();

    try {
      const initializeStartedAt = now();
      await executor.initialize(campaignId, runId);
      await observer.record({
        runId,
        campaignId,
        tick: 0,
        event: "initialized",
        state: "running",
        durationMs: durationSince(initializeStartedAt),
        level: "info",
        message: "Campaign initialized",
      });
      await queue.enqueue(firstTick, 0);
      await observer.record({
        runId,
        campaignId,
        tick: 0,
        event: "run_started",
        state: "running",
        durationMs: durationSince(runStartedAt),
        level: "info",
        message: "Campaign run started",
      });
    } catch (error) {
      await recordFailure(firstTick, error, 1);
      await executor.fail(
        { campaignId, runId },
        error instanceof Error ? error.message : "Campaign enqueue failed",
      );
      throw error;
    }

    return { campaignId, runId };
  }

  async function tick(job: CampaignTick, attempt = 1) {
    const claimStartedAt = now();
    const claim = await executor.claim(job.campaignId, job.runId);
    const messageId = claim.state === "claimed" ? claim.messageId : undefined;
    await observer.record({
      runId: job.runId,
      campaignId: job.campaignId,
      ...(messageId ? { messageId } : {}),
      tick: job.tick,
      event: "tick_claimed",
      state: claim.state,
      durationMs: durationSince(claimStartedAt),
      level: "info",
      message: "Campaign tick claimed",
    });

    if (claim.state === "claimed") {
      try {
        await observer.record({
          runId: job.runId,
          campaignId: job.campaignId,
          messageId: claim.messageId,
          tick: job.tick,
          event: "send_attempted",
          state: "queued",
          durationMs: 0,
          level: "info",
          message: "Campaign Message send attempted",
        });
        const sendStartedAt = now();
        let sendResult: Awaited<ReturnType<CampaignRunnerExecutor["send"]>>;
        try {
          sendResult = await executor.send(claim.messageId);
        } catch (error) {
          await observer.record({
            runId: job.runId,
            campaignId: job.campaignId,
            messageId: claim.messageId,
            tick: job.tick,
            event: "send_result",
            state: "failed",
            durationMs: durationSince(sendStartedAt),
            level: "error",
            message: "Campaign Message send failed",
            data: {
              attempt,
              stack:
                error instanceof Error
                  ? (error.stack ?? error.message)
                  : String(error),
            },
          });
          throw error;
        }
        await observer.record({
          runId: job.runId,
          campaignId: job.campaignId,
          messageId: claim.messageId,
          tick: job.tick,
          event: "send_result",
          state: sendResult.state,
          durationMs: durationSince(sendStartedAt),
          level: "info",
          message: "Campaign Message send completed",
          data: {
            ...(sendResult.providerMessageId
              ? { providerMessageId: sendResult.providerMessageId }
              : {}),
          },
        });
        await queue.enqueue(
          { ...job, tick: job.tick + 1 },
          claim.postSendDelaySeconds,
        );
        await observer.record({
          runId: job.runId,
          campaignId: job.campaignId,
          messageId: claim.messageId,
          tick: job.tick,
          event: "wait_scheduled",
          state: "waiting",
          durationMs: 0,
          level: "info",
          message: "Campaign next tick scheduled",
          data: {
            reason: "pacing",
            waitSeconds: claim.postSendDelaySeconds,
          },
        });
      } catch (error) {
        throw new CampaignRunnerTickError(error, claim.messageId);
      }
    } else if (claim.state === "waiting") {
      if (claim.reason === "retry_delay") {
        await observer.record({
          runId: job.runId,
          campaignId: job.campaignId,
          tick: job.tick,
          event: "retry_scheduled",
          state: "waiting",
          durationMs: 0,
          level: "info",
          message: "Campaign Message retry scheduled",
          data: {
            attempt,
            reason: claim.reason,
            waitSeconds: claim.waitSeconds,
          },
        });
      }
      await queue.enqueue(
        { ...job, tick: job.tick + 1 },
        claim.waitSeconds,
      );
      await observer.record({
        runId: job.runId,
        campaignId: job.campaignId,
        tick: job.tick,
        event: "wait_scheduled",
        state: "waiting",
        durationMs: 0,
        level: "info",
        message: "Campaign next tick scheduled",
        data: {
          reason: claim.reason,
          waitSeconds: claim.waitSeconds,
        },
      });
    } else if (claim.state === "paused") {
      await observer.record({
        runId: job.runId,
        campaignId: job.campaignId,
        tick: job.tick,
        event: "pause_detected",
        state: "paused",
        durationMs: 0,
        level: "info",
        message: "Campaign pause detected",
      });
    } else if (claim.state === "cancelled") {
      await observer.record({
        runId: job.runId,
        campaignId: job.campaignId,
        tick: job.tick,
        event: "cancel_detected",
        state: "cancelled",
        durationMs: 0,
        level: "info",
        message: "Campaign cancellation detected",
      });
    } else if (claim.state === "completed") {
      await observer.record({
        runId: job.runId,
        campaignId: job.campaignId,
        tick: job.tick,
        event: "run_completed",
        state: "completed",
        durationMs: 0,
        level: "info",
        message: "Campaign run completed",
      });
    }

    return { state: claim.state };
  }

  async function handleTick(job: CampaignTick, attempt = 1) {
    try {
      return await tick(job, attempt);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown campaign runner error";
      await recordFailure(job, error, attempt);
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
    observer: createDefaultCampaignObserver(),
    executor: {
      initialize: initializeCampaignExecution,
      claim: claimNextCampaignMessage,
      send: sendClaimedCampaignMessage,
      fail: failCampaignExecution,
    },
  });
}
