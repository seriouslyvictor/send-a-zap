import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const findUniqueMock = vi.fn();
const deleteDemoConnectionMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    evolutionConnection: { findUnique: findUniqueMock },
  })),
}));

vi.mock("@/lib/evolution-connection", () => ({
  EVOLUTION_CONNECTION_ID: "demo",
  deleteDemoConnection: deleteDemoConnectionMock,
}));

const { POST } = await import("./route");

function makeRequest(options?: { secret?: string; useQuery?: boolean }) {
  const url = new URL("http://localhost/api/maintenance/idle-disconnect");
  const headers = new Headers();
  if (options?.secret !== undefined) {
    if (options.useQuery) {
      url.searchParams.set("secret", options.secret);
    } else {
      headers.set("x-maintenance-secret", options.secret);
    }
  }
  return new NextRequest(url, { method: "POST", headers });
}

describe("POST /api/maintenance/idle-disconnect", () => {
  beforeEach(() => {
    vi.stubEnv("MAINTENANCE_SECRET", "top-secret");
    vi.stubEnv("CONNECTION_IDLE_TTL_MINUTES", "60");
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns 401 and does not attempt deletion when no secret is supplied", async () => {
    const response = await POST(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ success: false, error: "Unauthorized" });
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(deleteDemoConnectionMock).not.toHaveBeenCalled();
  });

  it("returns 401 and does not attempt deletion when the wrong secret is supplied", async () => {
    const response = await POST(makeRequest({ secret: "wrong" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ success: false, error: "Unauthorized" });
    expect(deleteDemoConnectionMock).not.toHaveBeenCalled();
  });

  it("returns not_found when there is no demo connection", async () => {
    findUniqueMock.mockResolvedValue(null);

    const response = await POST(makeRequest({ secret: "top-secret" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, status: "not_found" });
    expect(deleteDemoConnectionMock).not.toHaveBeenCalled();
  });

  it("deletes the connection when idle past the TTL (via query secret)", async () => {
    vi.stubEnv("CONNECTION_IDLE_TTL_MINUTES", "1");
    findUniqueMock.mockResolvedValue({
      id: "demo",
      lastActivityAt: new Date(Date.now() - 10 * 60_000), // 10 minutes ago
      createdAt: new Date(Date.now() - 20 * 60_000),
    });
    deleteDemoConnectionMock.mockResolvedValue({ status: "deleted", message: "ok" });

    const response = await POST(makeRequest({ secret: "top-secret", useQuery: true }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, status: "deleted", message: "ok" });
    expect(deleteDemoConnectionMock).toHaveBeenCalledOnce();
  });

  it("does not delete when activity is within the TTL", async () => {
    findUniqueMock.mockResolvedValue({
      id: "demo",
      lastActivityAt: new Date(), // just now
      createdAt: new Date(Date.now() - 24 * 60 * 60_000),
    });

    const response = await POST(makeRequest({ secret: "top-secret" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, status: "active" });
    expect(deleteDemoConnectionMock).not.toHaveBeenCalled();
  });

  it("falls back to createdAt when lastActivityAt is null", async () => {
    vi.stubEnv("CONNECTION_IDLE_TTL_MINUTES", "1");
    findUniqueMock.mockResolvedValue({
      id: "demo",
      lastActivityAt: null,
      createdAt: new Date(Date.now() - 10 * 60_000), // 10 minutes ago
    });
    deleteDemoConnectionMock.mockResolvedValue({ status: "deleted" });

    const response = await POST(makeRequest({ secret: "top-secret" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, status: "deleted" });
    expect(deleteDemoConnectionMock).toHaveBeenCalledOnce();
  });
});
