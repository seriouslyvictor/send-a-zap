import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { CampaignExecutionError } from "@/lib/campaign-executor";

const startMock = vi.fn();
const findUniqueMock = vi.fn();
const countMock = vi.fn();

vi.mock("@/lib/campaign-runner", () => ({
  createDefaultCampaignRunner: vi.fn(() => ({ start: startMock })),
}));

vi.mock("@/lib/campaign-queue", () => ({
  getCampaignTickQueue: vi.fn(() => ({})),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    campaign: { findUnique: findUniqueMock },
    message: { count: countMock },
  })),
}));

const { POST } = await import("./route");

function makeRequest() {
  return new NextRequest("http://localhost/api/campaigns/campaign-1/start", {
    method: "POST",
  });
}

describe("POST /api/campaigns/[id]/start", () => {
  beforeEach(() => {
    vi.stubEnv("CAMPAIGN_RECIPIENT_CAP", "10");
    vi.stubEnv("DAILY_SEND_CAP", "30");
    // Default to a low recipient count so tests stay under caps unless overridden.
    countMock.mockResolvedValue(1);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("drives the in-app campaign runner and returns the runId, without making an outbound webhook call", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    startMock.mockResolvedValue({ campaignId: "campaign-1", runId: "run-123" });
    findUniqueMock.mockResolvedValue({
      id: "campaign-1",
      name: "Test Campaign",
      status: "RUNNING",
      runId: "run-123",
      startedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: "campaign-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(startMock).toHaveBeenCalledWith("campaign-1");
    expect(body.success).toBe(true);
    expect(body.data.runId).toBe("run-123");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the executor's status when the runner rejects with a CampaignExecutionError", async () => {
    startMock.mockRejectedValue(
      new CampaignExecutionError(
        "invalid_campaign_state",
        "Campaign cannot start from RUNNING",
        409,
      ),
    );

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: "campaign-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      success: false,
      error: "Campaign cannot start from RUNNING",
    });
  });

  it("returns 403 with sending_cap_exceeded and does not start the runner when recipientCount exceeds the per-campaign cap", async () => {
    countMock.mockResolvedValueOnce(11); // recipientCount, over the cap of 10

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: "campaign-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.code).toBe("sending_cap_exceeded");
    expect(body.error).toContain("10");
    expect(startMock).not.toHaveBeenCalled();
  });

  it("returns 403 with sending_cap_exceeded and does not start the runner when the daily cap would be exceeded", async () => {
    countMock.mockResolvedValueOnce(5); // recipientCount, under the per-campaign cap
    countMock.mockResolvedValueOnce(28); // dailySendsSoFar, pushes total past 30

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: "campaign-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.code).toBe("sending_cap_exceeded");
    expect(body.error).toContain("30");
    expect(startMock).not.toHaveBeenCalled();
  });

  it("starts the runner and returns 200 when both caps are respected", async () => {
    countMock.mockResolvedValueOnce(5); // recipientCount
    countMock.mockResolvedValueOnce(10); // dailySendsSoFar
    startMock.mockResolvedValue({ campaignId: "campaign-1", runId: "run-456" });
    findUniqueMock.mockResolvedValue({
      id: "campaign-1",
      name: "Test Campaign",
      status: "RUNNING",
      runId: "run-456",
      startedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: "campaign-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(startMock).toHaveBeenCalledWith("campaign-1");
    expect(body.success).toBe(true);
    expect(body.data.runId).toBe("run-456");
  });
});
