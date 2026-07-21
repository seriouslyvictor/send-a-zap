import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { CampaignExecutionError } from "@/lib/campaign-executor";

const startMock = vi.fn();
const findUniqueMock = vi.fn();

vi.mock("@/lib/campaign-runner", () => ({
  createDefaultCampaignRunner: vi.fn(() => ({ start: startMock })),
}));

vi.mock("@/lib/campaign-queue", () => ({
  getCampaignTickQueue: vi.fn(() => ({})),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    campaign: { findUnique: findUniqueMock },
  })),
}));

const { POST } = await import("./route");

function makeRequest() {
  return new NextRequest("http://localhost/api/campaigns/campaign-1/resume", {
    method: "POST",
  });
}

describe("POST /api/campaigns/[id]/resume", () => {
  afterEach(() => {
    vi.clearAllMocks();
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
    expect(body.message).toBe("Campaign resumed successfully");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the executor's status when the runner rejects with a CampaignExecutionError", async () => {
    startMock.mockRejectedValue(
      new CampaignExecutionError(
        "invalid_campaign_state",
        "Campaign cannot start from DRAFT",
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
      error: "Campaign cannot start from DRAFT",
    });
  });
});
