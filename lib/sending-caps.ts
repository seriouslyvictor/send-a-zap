/**
 * Sending caps: demo safety limits enforced before a campaign is handed off
 * to the in-app runner. Two independent caps:
 *  - per-campaign: how many recipients a single campaign may target
 *  - per-day: how many messages may be sent across all campaigns today
 */

export interface SendingCaps {
  perCampaign: number;
  perDay: number;
}

export type SendingCapEvaluation =
  | { allowed: true }
  | { allowed: false; reason: "per_campaign_cap" | "daily_cap"; message: string };

const DEFAULT_PER_CAMPAIGN_CAP = 10;
const DEFAULT_PER_DAY_CAP = 30;

// Parse a positive-integer env var, falling back to the default on missing/invalid.
function parseCap(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export function getSendingCaps(
  env: Record<string, string | undefined> = process.env,
): SendingCaps {
  return {
    perCampaign: parseCap(env.CAMPAIGN_RECIPIENT_CAP, DEFAULT_PER_CAMPAIGN_CAP),
    perDay: parseCap(env.DAILY_SEND_CAP, DEFAULT_PER_DAY_CAP),
  };
}

export function evaluateSendingCaps(input: {
  recipientCount: number;
  dailySendsSoFar: number;
  caps: SendingCaps;
}): SendingCapEvaluation {
  const { recipientCount, dailySendsSoFar, caps } = input;

  if (recipientCount > caps.perCampaign) {
    return {
      allowed: false,
      reason: "per_campaign_cap",
      message: `Demo limit: campaigns are capped at ${caps.perCampaign} recipients. This campaign has ${recipientCount}. Trim the recipient list to run it.`,
    };
  }

  if (dailySendsSoFar + recipientCount > caps.perDay) {
    return {
      allowed: false,
      reason: "daily_cap",
      message: `Demo limit: at most ${caps.perDay} messages can be sent per day. ${dailySendsSoFar} already went out today, so this campaign's ${recipientCount} recipients would exceed the daily cap. Try again tomorrow.`,
    };
  }

  return { allowed: true };
}
