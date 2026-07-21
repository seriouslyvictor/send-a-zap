import { PassThrough } from "node:stream";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createCampaignEventPruner,
  createPinoCampaignLogger,
  createPrismaCampaignEventStore,
} from "@/lib/campaign-observability-runtime";

describe("campaign observability runtime", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses LOG_LEVEL and writes structured JSON through pino", () => {
    vi.stubEnv("LOG_LEVEL", "debug");
    const output = new PassThrough();
    let line = "";
    output.on("data", (chunk) => {
      line += chunk.toString();
    });
    const logger = createPinoCampaignLogger({
      destination: output,
    });

    logger.debug(
      { runId: "run-1", campaignId: "campaign-1", event: "run_started" },
      "Campaign run started",
    );

    expect(JSON.parse(line)).toEqual(
      expect.objectContaining({
        level: 20,
        runId: "run-1",
        campaignId: "campaign-1",
        event: "run_started",
        msg: "Campaign run started",
      }),
    );
  });

  it("persists audit rows and deletes only rows older than the cutoff", async () => {
    const prisma = {
      campaignEvent: {
        create: vi.fn().mockResolvedValue({ id: "event-1" }),
        deleteMany: vi.fn().mockResolvedValue({ count: 7 }),
      },
    };
    const eventStore = createPrismaCampaignEventStore(prisma);
    const event = {
      campaignId: "campaign-1",
      messageId: "message-1",
      runId: "run-1",
      type: "send_result",
      level: "info" as const,
      message: "Campaign Message sent",
      data: { tick: 2, event: "send_result", state: "sent" },
    };

    await eventStore.append(event);
    await expect(
      eventStore.deleteOlderThan(new Date("2026-06-21T00:00:00.000Z")),
    ).resolves.toBe(7);

    expect(prisma.campaignEvent.create).toHaveBeenCalledWith({ data: event });
    expect(prisma.campaignEvent.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: new Date("2026-06-21T00:00:00.000Z") } },
    });
  });

  it("prunes the configured retention window at most once per day", async () => {
    const eventStore = {
      append: vi.fn(),
      deleteOlderThan: vi.fn().mockResolvedValue(4),
    };
    const pruner = createCampaignEventPruner({
      eventStore,
      retentionDays: 30,
      now: () => new Date("2026-07-21T00:00:00.000Z"),
    });

    await expect(pruner.pruneIfDue()).resolves.toBe(4);
    await expect(pruner.pruneIfDue()).resolves.toBe(0);
    expect(eventStore.deleteOlderThan).toHaveBeenCalledOnce();
    expect(eventStore.deleteOlderThan).toHaveBeenCalledWith(
      new Date("2026-06-21T00:00:00.000Z"),
    );
  });
});
