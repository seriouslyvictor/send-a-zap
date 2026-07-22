/**
 * Pure routing policy for the auth gate. The proxy (Next.js middleware) reads
 * a request's pathname and session state and asks this module what to do, so
 * the whole access-control decision is testable without a running server.
 */

export type AuthDecision =
  /** Let the request through untouched. */
  | { type: "allow" }
  /** Unauthenticated page request: send the Operator to the login screen. */
  | { type: "redirect-to-login" }
  /** Unauthenticated API request: reject with 401 instead of redirecting. */
  | { type: "reject-unauthorized" }
  /** Authenticated Operator on the login screen: send them to the app. */
  | { type: "redirect-to-home" };

/** Path of the login screen. */
export const LOGIN_PATH = "/login";

/**
 * Paths that must stay reachable without a session:
 * - the login page itself,
 * - the Auth.js endpoints that perform the login/logout,
 * - the Evolution webhook receiver, which the Evolution Go server calls with
 *   its own shared-secret rather than an Operator session,
 * - the maintenance endpoints, which an external scheduler calls with its
 *   own shared-secret (see MAINTENANCE_SECRET) — a scheduler has no session.
 */
function isPublicPath(pathname: string): boolean {
  if (pathname === LOGIN_PATH) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname === "/api/webhooks/evolution") return true;
  if (pathname.startsWith("/api/maintenance/")) return true;
  return false;
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

/**
 * Decides how the proxy should handle a request.
 *
 * - Public paths are always allowed.
 * - An authenticated Operator is allowed everywhere, except the login page
 *   where they're bounced to the app.
 * - An unauthenticated API request is rejected (401); an unauthenticated page
 *   request is redirected to login.
 */
export function decideAuthAction(
  pathname: string,
  isLoggedIn: boolean,
): AuthDecision {
  if (isLoggedIn && pathname === LOGIN_PATH) {
    return { type: "redirect-to-home" };
  }
  if (isPublicPath(pathname)) {
    return { type: "allow" };
  }
  if (isLoggedIn) {
    return { type: "allow" };
  }
  if (isApiPath(pathname)) {
    return { type: "reject-unauthorized" };
  }
  return { type: "redirect-to-login" };
}
