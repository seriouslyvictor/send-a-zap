import { describe, expect, it, vi } from "vitest";

import {
  createCampaignObserver,
  type CampaignEventStore,
  type CampaignLogger,
} from "@/lib/campaign-observability";

function createHarness() {
  const logger: CampaignLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const eventStore: CampaignEventStore = {
    append: vi.fn().mockResolvedValue(undefined),
  };
  const observer = createCampaignObserver({ logger, eventStore });

  return { eventStore, logger, observer };
}

describe("campaign observability", () => {
  it("emits one correlated structured log and durable event with redacted PII", async () => {
    const { eventStore, logger, observer } = createHarness();

    await observer.record({
      runId: "run-1",
      campaignId: "campaign-1",
      messageId: "message-1",
      tick: 3,
      event: "send_result",
      state: "sent",
      durationMs: 125,
      level: "info",
      message: "Campaign Message sent",
      data: {
        providerMessageId: "provider-1",
        phone: "5511987654321",
        renderedMessage: "Olá João, seu pedido está pronto",
      },
    });

    const expectedData = {
      tick: 3,
      event: "send_result",
      state: "sent",
      durationMs: 125,
      providerMessageId: "provider-1",
      phone: "*********4321",
      renderedMessage: "[REDACTED]",
    };
    expect(logger.info).toHaveBeenCalledWith(
      {
        runId: "run-1",
        campaignId: "campaign-1",
        messageId: "message-1",
        tick: 3,
        event: "send_result",
        state: "sent",
        durationMs: 125,
        data: expectedData,
      },
      "Campaign Message sent",
    );
    expect(eventStore.append).toHaveBeenCalledWith({
      campaignId: "campaign-1",
      messageId: "message-1",
      runId: "run-1",
      type: "send_result",
      level: "info",
      message: "Campaign Message sent",
      data: expectedData,
    });

    const emitted = JSON.stringify({
      log: vi.mocked(logger.info).mock.calls,
      audit: vi.mocked(eventStore.append).mock.calls,
    });
    expect(emitted).not.toContain("5511987654321");
    expect(emitted).not.toContain("Olá João, seu pedido está pronto");
  });

  it("warns without rejecting when the durable audit write fails", async () => {
    const { eventStore, logger, observer } = createHarness();
    vi.mocked(eventStore.append).mockRejectedValue(new Error("database offline"));

    await expect(
      observer.record({
        runId: "run-1",
        campaignId: "campaign-1",
        tick: 4,
        event: "run_completed",
        state: "completed",
        durationMs: 0,
        level: "info",
        message: "Campaign run completed",
      }),
    ).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "run-1",
        campaignId: "campaign-1",
        tick: 4,
        event: "audit_write_failed",
        state: "completed",
        error: "database offline",
      }),
      "Campaign audit write failed",
    );
  });

  it("prunes opportunistically and treats pruning failures as best-effort", async () => {
    const logger: CampaignLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const observer = createCampaignObserver({
      logger,
      eventStore: { append: vi.fn().mockResolvedValue(undefined) },
      eventPruner: {
        pruneIfDue: vi.fn().mockRejectedValue(new Error("prune unavailable")),
      },
    });

    await expect(
      observer.record({
        runId: "run-1",
        campaignId: "campaign-1",
        tick: 0,
        event: "run_started",
        state: "running",
        durationMs: 0,
        level: "info",
        message: "Campaign run started",
      }),
    ).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "run-1",
        campaignId: "campaign-1",
        tick: 0,
        event: "retention_prune_failed",
        error: "prune unavailable",
      }),
      "Campaign audit retention prune failed",
    );
  });
});
