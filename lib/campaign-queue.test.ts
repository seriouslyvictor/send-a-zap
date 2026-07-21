import { describe, expect, it, vi } from "vitest";

import {
  createCampaignTickQueue,
  getCampaignTickJobId,
} from "@/lib/campaign-queue";

describe("campaign tick queue", () => {
  it("adds a delayed tick with an idempotent job id", async () => {
    const bullQueue = {
      add: vi.fn().mockResolvedValue({ id: "job-1" }),
    };
    const queue = createCampaignTickQueue(bullQueue);
    const tick = { campaignId: "campaign-1", runId: "run-1", tick: 4 };

    await queue.enqueue(tick, 12);

    expect(bullQueue.add).toHaveBeenCalledWith("tick", tick, {
      delay: 12_000,
      jobId: "campaign-1_run-1_4",
      removeOnComplete: { age: 86_400, count: 10_000 },
      removeOnFail: false,
    });
  });

  it("uses a BullMQ-safe deterministic id for each run tick", () => {
    expect(
      getCampaignTickJobId({
        campaignId: "campaign:1",
        runId: "run:1",
        tick: 2,
      }),
    ).toBe("campaign_1_run_1_2");
  });
});
