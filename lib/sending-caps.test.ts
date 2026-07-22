import { describe, expect, it } from "vitest";

import { evaluateSendingCaps, getSendingCaps } from "@/lib/sending-caps";

describe("evaluateSendingCaps", () => {
  const caps = { perCampaign: 10, perDay: 30 };

  it("allows when recipientCount is under the per-campaign cap and under the daily cap", () => {
    const result = evaluateSendingCaps({
      recipientCount: 5,
      dailySendsSoFar: 0,
      caps,
    });

    expect(result).toEqual({ allowed: true });
  });

  it("allows when recipientCount is exactly equal to the per-campaign cap", () => {
    const result = evaluateSendingCaps({
      recipientCount: 10,
      dailySendsSoFar: 0,
      caps,
    });

    expect(result).toEqual({ allowed: true });
  });

  it("blocks when recipientCount exceeds the per-campaign cap", () => {
    const result = evaluateSendingCaps({
      recipientCount: 11,
      dailySendsSoFar: 0,
      caps,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("per_campaign_cap");
      expect(result.message).toContain("10");
      expect(result.message).toContain("11");
    }
  });

  it("allows when dailySendsSoFar + recipientCount is under the daily cap", () => {
    const result = evaluateSendingCaps({
      recipientCount: 5,
      dailySendsSoFar: 10,
      caps,
    });

    expect(result).toEqual({ allowed: true });
  });

  it("allows when dailySendsSoFar + recipientCount is exactly equal to the daily cap", () => {
    const result = evaluateSendingCaps({
      recipientCount: 10,
      dailySendsSoFar: 20,
      caps,
    });

    expect(result).toEqual({ allowed: true });
  });

  it("blocks when dailySendsSoFar + recipientCount exceeds the daily cap", () => {
    const result = evaluateSendingCaps({
      recipientCount: 10,
      dailySendsSoFar: 25,
      caps,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("daily_cap");
      expect(result.message).toContain("30");
      expect(result.message).toContain("25");
      expect(result.message).toContain("10");
    }
  });

  it("checks the per-campaign cap first when both caps would fail", () => {
    const result = evaluateSendingCaps({
      recipientCount: 11,
      dailySendsSoFar: 25,
      caps,
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("per_campaign_cap");
    }
  });

  it("includes cap number and counts in the per_campaign_cap message", () => {
    const result = evaluateSendingCaps({
      recipientCount: 15,
      dailySendsSoFar: 0,
      caps: { perCampaign: 10, perDay: 30 },
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.message).toBe(
        "Demo limit: campaigns are capped at 10 recipients. This campaign has 15. Trim the recipient list to run it.",
      );
    }
  });

  it("includes cap number and counts in the daily_cap message", () => {
    const result = evaluateSendingCaps({
      recipientCount: 10,
      dailySendsSoFar: 25,
      caps: { perCampaign: 10, perDay: 30 },
    });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.message).toBe(
        "Demo limit: at most 30 messages can be sent per day. 25 already went out today, so this campaign's 10 recipients would exceed the daily cap. Try again tomorrow.",
      );
    }
  });
});

describe("getSendingCaps", () => {
  it("returns defaults when env vars are absent", () => {
    const caps = getSendingCaps({});

    expect(caps).toEqual({ perCampaign: 10, perDay: 30 });
  });

  it("returns overrides from env", () => {
    const caps = getSendingCaps({
      CAMPAIGN_RECIPIENT_CAP: "25",
      DAILY_SEND_CAP: "100",
    });

    expect(caps).toEqual({ perCampaign: 25, perDay: 100 });
  });

  it("falls back to defaults for a non-numeric CAMPAIGN_RECIPIENT_CAP", () => {
    const caps = getSendingCaps({ CAMPAIGN_RECIPIENT_CAP: "abc" });

    expect(caps.perCampaign).toBe(10);
  });

  it("falls back to defaults for a negative DAILY_SEND_CAP", () => {
    const caps = getSendingCaps({ DAILY_SEND_CAP: "-1" });

    expect(caps.perDay).toBe(30);
  });

  it("falls back to defaults for a non-integer value", () => {
    const caps = getSendingCaps({ CAMPAIGN_RECIPIENT_CAP: "1.5" });

    expect(caps.perCampaign).toBe(10);
  });

  it("falls back to defaults for an empty string value", () => {
    const caps = getSendingCaps({ CAMPAIGN_RECIPIENT_CAP: "", DAILY_SEND_CAP: "" });

    expect(caps).toEqual({ perCampaign: 10, perDay: 30 });
  });
});
