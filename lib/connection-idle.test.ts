import { describe, expect, it } from "vitest";

import { getConnectionIdleTtlMinutes, isConnectionIdle } from "@/lib/connection-idle";

describe("getConnectionIdleTtlMinutes", () => {
  it("defaults to 60 when unset", () => {
    expect(getConnectionIdleTtlMinutes({})).toBe(60);
  });

  it("uses a configured positive integer", () => {
    expect(getConnectionIdleTtlMinutes({ CONNECTION_IDLE_TTL_MINUTES: "15" })).toBe(15);
  });

  it.each(["0", "-5", "abc", "", "1.5"])(
    "falls back to 60 for invalid value %s",
    (value) => {
      expect(getConnectionIdleTtlMinutes({ CONNECTION_IDLE_TTL_MINUTES: value })).toBe(60);
    },
  );
});

describe("isConnectionIdle", () => {
  it("is not idle strictly under the TTL", () => {
    const lastActivityAt = new Date("2026-07-21T00:00:00.000Z");
    const now = new Date("2026-07-21T00:59:00.000Z"); // 59 minutes later
    expect(isConnectionIdle({ lastActivityAt, now, ttlMinutes: 60 })).toBe(false);
  });

  it("is not idle exactly at the TTL boundary", () => {
    const lastActivityAt = new Date("2026-07-21T00:00:00.000Z");
    const now = new Date("2026-07-21T01:00:00.000Z"); // exactly 60 minutes later
    expect(isConnectionIdle({ lastActivityAt, now, ttlMinutes: 60 })).toBe(false);
  });

  it("is idle strictly over the TTL", () => {
    const lastActivityAt = new Date("2026-07-21T00:00:00.000Z");
    const now = new Date("2026-07-21T01:00:00.001Z"); // 1ms past the TTL
    expect(isConnectionIdle({ lastActivityAt, now, ttlMinutes: 60 })).toBe(true);
  });
});
