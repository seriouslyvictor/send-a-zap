import { timingSafeEqual } from "node:crypto";

/**
 * The shared demo credentials the sole Operator logs in with. Sourced from
 * server-side environment variables only — never shipped to the browser.
 */
export interface OperatorCredentialConfig {
  username: string;
  password: string;
}

/**
 * Reads the configured Operator credentials from the environment. Returns
 * `null` when either value is missing or blank, so callers can refuse every
 * login rather than authenticating against an empty secret.
 */
export function readOperatorCredentialConfig(
  env: Record<string, string | undefined> = process.env,
): OperatorCredentialConfig | null {
  const username = env.OPERATOR_USERNAME;
  const password = env.OPERATOR_PASSWORD;
  if (!username || !password) return null;
  return { username, password };
}

/**
 * Constant-time comparison of two strings. Guards the credential check against
 * timing side-channels that a naive `===` would leak.
 */
function constantTimeEquals(a: string, b: string): boolean {
  const aBytes = Buffer.from(a);
  const bBytes = Buffer.from(b);
  if (aBytes.length !== bBytes.length) return false;
  return timingSafeEqual(aBytes, bBytes);
}

/**
 * Verifies a submitted username/password against the configured Operator
 * credentials. Returns `true` only when both match and the config is present.
 */
export function verifyOperatorCredentials(
  submitted: { username?: unknown; password?: unknown },
  config: OperatorCredentialConfig | null,
): boolean {
  if (!config) return false;
  const { username, password } = submitted;
  if (typeof username !== "string" || typeof password !== "string") {
    return false;
  }
  // Run both comparisons unconditionally (on their own lines, before the
  // `&&`) so the overall time doesn't reveal which field matched.
  const usernameOk = constantTimeEquals(username, config.username);
  const passwordOk = constantTimeEquals(password, config.password);
  return usernameOk && passwordOk;
}
