import { describe, expect, it, vi } from "vitest";

import type { CampaignObserver } from "@/lib/campaign-observability";
import {
  createCampaignRunner,
  type CampaignRunnerExecutor,
  type CampaignTick,
  type CampaignTickQueue,
} from "@/lib/campaign-runner";

function createHarness() {
  const executor: CampaignRunnerExecutor = {
    initialize: vi.fn().mockResolvedValue({ campaignId: "campaign-1" }),
    claim: vi.fn(),
    send: vi.fn().mockResolvedValue({ state: "sent" }),
    fail: vi.fn().mockResolvedValue({ state: "failed" }),
  };
  const queue: CampaignTickQueue = {
    enqueue: vi.fn().mockResolvedValue(undefined),
  };
  const observer: Pick<CampaignObserver, "record"> = {
    record: vi.fn().mockResolvedValue(undefined),
  };
  const runner = createCampaignRunner({
    executor,
    queue,
    observer,
    generateRunId: () => "run-1",
    now: () => 100,
  });

  return { executor, observer, queue, runner };
}

const firstTick: CampaignTick = {
  campaignId: "campaign-1",
  runId: "run-1",
  tick: 0,
};

describe("campaign runner", () => {
  it("initializes a run and enqueues its first tick with one runId", async () => {
    const { executor, observer, queue, runner } = createHarness();

    await expect(runner.start("campaign-1")).resolves.toEqual({
      campaignId: "campaign-1",
      runId: "run-1",
    });
    expect(executor.initialize).toHaveBeenCalledWith("campaign-1", "run-1");
    expect(queue.enqueue).toHaveBeenCalledWith(firstTick, 0);
    expect(observer.record).toHaveBeenNthCalledWith(1, {
      runId: "run-1",
      campaignId: "campaign-1",
      tick: 0,
      event: "initialized",
      state: "running",
      durationMs: 0,
      level: "info",
      message: "Campaign initialized",
    });
    expect(observer.record).toHaveBeenNthCalledWith(2, {
      runId: "run-1",
      campaignId: "campaign-1",
      tick: 0,
      event: "run_started",
      state: "running",
      durationMs: 0,
      level: "info",
      message: "Campaign run started",
    });
  });

  it("reconciles an initialized run when its first tick cannot be enqueued", async () => {
    const { executor, observer, queue, runner } = createHarness();
    vi.mocked(queue.enqueue).mockRejectedValue(new Error("redis unavailable"));

    await expect(runner.start("campaign-1")).rejects.toThrow("redis unavailable");
    expect(executor.fail).toHaveBeenCalledWith(
      { campaignId: "campaign-1", runId: "run-1" },
      "redis unavailable",
    );
    expect(observer.record).toHaveBeenLastCalledWith(
      expect.objectContaining({
        runId: "run-1",
        campaignId: "campaign-1",
        tick: 0,
        event: "run_failed",
        state: "failed",
        durationMs: 0,
        level: "error",
        data: expect.objectContaining({
          attempt: 1,
          stack: expect.stringContaining("redis unavailable"),
        }),
      }),
    );
  });

  it("sends a claimed message and delays the next tick by the executor pacing", async () => {
    const { executor, observer, queue, runner } = createHarness();
    vi.mocked(executor.claim).mockResolvedValue({
      state: "claimed",
      campaignId: "campaign-1",
      messageId: "message-1",
      messageDelaySeconds: 2,
      batchDelaySeconds: 30,
      batchSize: 50,
      postSendDelaySeconds: 32,
    });
    vi.mocked(executor.send).mockResolvedValue({
      state: "sent",
      providerMessageId: "provider-1",
    });

    await expect(runner.tick(firstTick)).resolves.toEqual({ state: "claimed" });
    expect(executor.send).toHaveBeenCalledWith("message-1");
    expect(queue.enqueue).toHaveBeenCalledWith(
      { ...firstTick, tick: 1 },
      32,
    );
    expect(vi.mocked(observer.record).mock.calls.map(([event]) => event)).toEqual([
      expect.objectContaining({
        event: "tick_claimed",
        state: "claimed",
        messageId: "message-1",
        tick: 0,
        durationMs: 0,
      }),
      expect.objectContaining({
        event: "send_attempted",
        state: "queued",
        messageId: "message-1",
        tick: 0,
        durationMs: 0,
      }),
      expect.objectContaining({
        event: "send_result",
        state: "sent",
        messageId: "message-1",
        tick: 0,
        durationMs: 0,
        data: { providerMessageId: "provider-1" },
      }),
      expect.objectContaining({
        event: "wait_scheduled",
        state: "waiting",
        messageId: "message-1",
        tick: 0,
        durationMs: 0,
        data: { reason: "pacing", waitSeconds: 32 },
      }),
    ]);
  });

  it("delays the next tick when the executor is waiting", async () => {
    const { executor, observer, queue, runner } = createHarness();
    vi.mocked(executor.claim).mockResolvedValue({
      state: "waiting",
      campaignId: "campaign-1",
      waitSeconds: 17,
      reason: "retry_delay",
    });

    await expect(runner.tick(firstTick)).resolves.toEqual({ state: "waiting" });
    expect(executor.send).not.toHaveBeenCalled();
    expect(queue.enqueue).toHaveBeenCalledWith(
      { ...firstTick, tick: 1 },
      17,
    );
    expect(vi.mocked(observer.record).mock.calls.map(([event]) => event)).toEqual([
      expect.objectContaining({ event: "tick_claimed", state: "waiting" }),
      expect.objectContaining({
        event: "retry_scheduled",
        state: "waiting",
        data: { attempt: 1, reason: "retry_delay", waitSeconds: 17 },
      }),
      expect.objectContaining({
        event: "wait_scheduled",
        state: "waiting",
        data: { reason: "retry_delay", waitSeconds: 17 },
      }),
    ]);
  });

  it("records a failed send result with attempt, stack, and latency", async () => {
    const { executor, observer, runner } = createHarness();
    vi.mocked(executor.claim).mockResolvedValue({
      state: "claimed",
      campaignId: "campaign-1",
      messageId: "message-1",
      messageDelaySeconds: 2,
      batchDelaySeconds: 30,
      batchSize: 50,
      postSendDelaySeconds: 2,
    });
    vi.mocked(executor.send).mockRejectedValue(new Error("provider offline"));

    await expect(runner.handleTick(firstTick, 2)).rejects.toThrow(
      "provider offline",
    );
    expect(observer.record).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "send_result",
        state: "failed",
        messageId: "message-1",
        tick: 0,
        durationMs: 0,
        level: "error",
        data: {
          attempt: 2,
          stack: expect.stringContaining("provider offline"),
        },
      }),
    );
  });

  it.each(["paused", "cancelled", "completed", "stopped"] as const)(
    "terminates the chain when the campaign is %s",
    async (state) => {
      const { executor, observer, queue, runner } = createHarness();
      vi.mocked(executor.claim).mockResolvedValue({
        state,
        campaignId: "campaign-1",
      });

      await expect(runner.tick(firstTick)).resolves.toEqual({ state });
      expect(executor.send).not.toHaveBeenCalled();
      expect(queue.enqueue).not.toHaveBeenCalled();
      const eventNames = vi
        .mocked(observer.record)
        .mock.calls.map(([event]) => event.event);
      expect(eventNames).toEqual(
        state === "paused"
          ? ["tick_claimed", "pause_detected"]
          : state === "cancelled"
            ? ["tick_claimed", "cancel_detected"]
            : state === "completed"
              ? ["tick_claimed", "run_completed"]
              : ["tick_claimed"],
      );
    },
  );

  it("reconciles an escaped tick failure by campaign and run id", async () => {
    const { executor, observer, runner } = createHarness();
    vi.mocked(executor.claim).mockRejectedValue(new Error("redispatched failure"));

    await expect(runner.handleTick(firstTick, 3)).rejects.toThrow(
      "redispatched failure",
    );
    expect(executor.fail).toHaveBeenCalledWith(
      { campaignId: "campaign-1", runId: "run-1" },
      "redispatched failure",
    );
    expect(observer.record).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "run-1",
        campaignId: "campaign-1",
        tick: 0,
        event: "run_failed",
        state: "failed",
        durationMs: 0,
        level: "error",
        data: {
          attempt: 3,
          stack: expect.stringContaining("redispatched failure"),
        },
      }),
    );
  });
});
