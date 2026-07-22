/**
 * Idle policy for the demo Evolution Connection: how long the Operator's
 * paired instance may sit unused before the maintenance endpoint tears it
 * down. Pure functions only — no I/O — so the decision is trivially testable.
 */

export const DEFAULT_CONNECTION_IDLE_TTL_MINUTES = 60;

export function getConnectionIdleTtlMinutes(
  env: Record<string, string | undefined> = process.env,
): number {
  const value = env.CONNECTION_IDLE_TTL_MINUTES;
  if (value === undefined || value === "") {
    return DEFAULT_CONNECTION_IDLE_TTL_MINUTES;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_CONNECTION_IDLE_TTL_MINUTES;
}

export function isConnectionIdle(input: {
  lastActivityAt: Date;
  now: Date;
  ttlMinutes: number;
}): boolean {
  const { lastActivityAt, now, ttlMinutes } = input;
  return now.getTime() - lastActivityAt.getTime() > ttlMinutes * 60_000;
}
