import { describe, expect, it, vi } from "vitest";

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
  const runner = createCampaignRunner({
    executor,
    queue,
    generateRunId: () => "run-1",
  });

  return { executor, queue, runner };
}

const firstTick: CampaignTick = {
  campaignId: "campaign-1",
  runId: "run-1",
  tick: 0,
};

describe("campaign runner", () => {
  it("initializes a run and enqueues its first tick with one runId", async () => {
    const { executor, queue, runner } = createHarness();

    await expect(runner.start("campaign-1")).resolves.toEqual({
      campaignId: "campaign-1",
      runId: "run-1",
    });
    expect(executor.initialize).toHaveBeenCalledWith("campaign-1", "run-1");
    expect(queue.enqueue).toHaveBeenCalledWith(firstTick, 0);
  });

  it("reconciles an initialized run when its first tick cannot be enqueued", async () => {
    const { executor, queue, runner } = createHarness();
    vi.mocked(queue.enqueue).mockRejectedValue(new Error("redis unavailable"));

    await expect(runner.start("campaign-1")).rejects.toThrow("redis unavailable");
    expect(executor.fail).toHaveBeenCalledWith(
      { campaignId: "campaign-1", runId: "run-1" },
      "redis unavailable",
    );
  });

  it("sends a claimed message and delays the next tick by the executor pacing", async () => {
    const { executor, queue, runner } = createHarness();
    vi.mocked(executor.claim).mockResolvedValue({
      state: "claimed",
      campaignId: "campaign-1",
      messageId: "message-1",
      messageDelaySeconds: 2,
      batchDelaySeconds: 30,
      batchSize: 50,
      postSendDelaySeconds: 32,
    });

    await expect(runner.tick(firstTick)).resolves.toEqual({ state: "claimed" });
    expect(executor.send).toHaveBeenCalledWith("message-1");
    expect(queue.enqueue).toHaveBeenCalledWith(
      { ...firstTick, tick: 1 },
      32,
    );
  });

  it("delays the next tick when the executor is waiting", async () => {
    const { executor, queue, runner } = createHarness();
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
  });

  it.each(["paused", "cancelled", "completed", "stopped"] as const)(
    "terminates the chain when the campaign is %s",
    async (state) => {
      const { executor, queue, runner } = createHarness();
      vi.mocked(executor.claim).mockResolvedValue({
        state,
        campaignId: "campaign-1",
      });

      await expect(runner.tick(firstTick)).resolves.toEqual({ state });
      expect(executor.send).not.toHaveBeenCalled();
      expect(queue.enqueue).not.toHaveBeenCalled();
    },
  );

  it("reconciles an escaped tick failure by campaign and run id", async () => {
    const { executor, runner } = createHarness();
    vi.mocked(executor.claim).mockRejectedValue(new Error("redispatched failure"));

    await expect(runner.handleTick(firstTick)).rejects.toThrow(
      "redispatched failure",
    );
    expect(executor.fail).toHaveBeenCalledWith(
      { campaignId: "campaign-1", runId: "run-1" },
      "redispatched failure",
    );
  });
});
