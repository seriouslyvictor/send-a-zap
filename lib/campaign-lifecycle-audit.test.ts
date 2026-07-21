import { describe, expect, it, vi } from "vitest";

import {
  createCampaignObserver,
  type CampaignEventWrite,
  type CampaignLogger,
} from "@/lib/campaign-observability";
import {
  createCampaignRunner,
  type CampaignRunnerExecutor,
} from "@/lib/campaign-runner";

describe("campaign lifecycle audit", () => {
  it("persists every runner lifecycle event with complete correlation", async () => {
    const rows: CampaignEventWrite[] = [];
    const logger: CampaignLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const observer = createCampaignObserver({
      logger,
      eventStore: {
        append: vi.fn().mockImplementation(async (event) => {
          rows.push(event);
        }),
      },
    });
    const executor: CampaignRunnerExecutor = {
      initialize: vi.fn().mockResolvedValue({ campaignId: "campaign-1" }),
      claim: vi
        .fn()
        .mockResolvedValueOnce({
          state: "claimed",
          campaignId: "campaign-1",
          messageId: "message-1",
          messageDelaySeconds: 2,
          batchDelaySeconds: 30,
          batchSize: 50,
          postSendDelaySeconds: 2,
        })
        .mockResolvedValueOnce({
          state: "waiting",
          campaignId: "campaign-1",
          waitSeconds: 10,
          reason: "retry_delay",
        })
        .mockResolvedValueOnce({ state: "paused", campaignId: "campaign-1" })
        .mockResolvedValueOnce({ state: "cancelled", campaignId: "campaign-1" })
        .mockResolvedValueOnce({ state: "completed", campaignId: "campaign-1" })
        .mockRejectedValueOnce(new Error("claim failed")),
      send: vi.fn().mockResolvedValue({
        state: "sent",
        providerMessageId: "provider-1",
      }),
      fail: vi.fn().mockResolvedValue({ state: "failed" }),
    };
    const runner = createCampaignRunner({
      executor,
      observer,
      queue: { enqueue: vi.fn().mockResolvedValue(undefined) },
      generateRunId: () => "run-1",
      now: () => 100,
    });

    await runner.start("campaign-1");
    for (let tick = 0; tick < 5; tick += 1) {
      await runner.tick({ campaignId: "campaign-1", runId: "run-1", tick });
    }
    await expect(
      runner.handleTick(
        { campaignId: "campaign-1", runId: "run-1", tick: 5 },
        3,
      ),
    ).rejects.toThrow("claim failed");

    expect(rows.map((row) => row.type)).toEqual([
      "initialized",
      "run_started",
      "tick_claimed",
      "send_attempted",
      "send_result",
      "wait_scheduled",
      "tick_claimed",
      "retry_scheduled",
      "wait_scheduled",
      "tick_claimed",
      "pause_detected",
      "tick_claimed",
      "cancel_detected",
      "tick_claimed",
      "run_completed",
      "run_failed",
    ]);
    for (const row of rows) {
      expect(row).toEqual(
        expect.objectContaining({
          campaignId: "campaign-1",
          runId: "run-1",
          type: expect.any(String),
          level: expect.any(String),
          message: expect.any(String),
          data: expect.objectContaining({
            tick: expect.any(Number),
            event: row.type,
            state: expect.any(String),
            durationMs: expect.any(Number),
          }),
        }),
      );
    }
    expect(rows.at(-1)).toEqual(
      expect.objectContaining({
        type: "run_failed",
        level: "error",
        data: expect.objectContaining({
          attempt: 3,
          stack: expect.stringContaining("claim failed"),
        }),
      }),
    );
  });

  it("continues sending when every audit write is unavailable", async () => {
    const logger: CampaignLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const observer = createCampaignObserver({
      logger,
      eventStore: {
        append: vi.fn().mockRejectedValue(new Error("audit database offline")),
      },
    });
    const send = vi.fn().mockResolvedValue({
      state: "sent",
      providerMessageId: "provider-1",
    });
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const runner = createCampaignRunner({
      observer,
      queue: { enqueue },
      executor: {
        initialize: vi.fn(),
        claim: vi.fn().mockResolvedValue({
          state: "claimed",
          campaignId: "campaign-1",
          messageId: "message-1",
          messageDelaySeconds: 2,
          batchDelaySeconds: 30,
          batchSize: 50,
          postSendDelaySeconds: 2,
        }),
        send,
        fail: vi.fn(),
      },
      now: () => 100,
    });

    await expect(
      runner.tick({ campaignId: "campaign-1", runId: "run-1", tick: 0 }),
    ).resolves.toEqual({ state: "claimed" });
    expect(send).toHaveBeenCalledWith("message-1");
    expect(enqueue).toHaveBeenCalledWith(
      { campaignId: "campaign-1", runId: "run-1", tick: 1 },
      2,
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: "audit_write_failed" }),
      "Campaign audit write failed",
    );
  });
});
