import { describe, expect, it } from "vitest";

import { decideAuthAction } from "./auth-routing";

describe("decideAuthAction", () => {
  describe("public paths (no session required)", () => {
    it.each([
      "/login",
      "/api/auth/signin",
      "/api/auth/callback/credentials",
      "/api/auth/session",
      "/api/webhooks/evolution",
      "/api/maintenance/idle-disconnect",
    ])("allows %s when logged out", (pathname) => {
      expect(decideAuthAction(pathname, false)).toEqual({ type: "allow" });
    });
  });

  describe("unauthenticated requests", () => {
    it("redirects a page request to login", () => {
      expect(decideAuthAction("/", false)).toEqual({
        type: "redirect-to-login",
      });
      expect(decideAuthAction("/campaigns", false)).toEqual({
        type: "redirect-to-login",
      });
    });

    it("rejects an API request with 401 instead of redirecting", () => {
      expect(decideAuthAction("/api/campaigns", false)).toEqual({
        type: "reject-unauthorized",
      });
      expect(decideAuthAction("/api/dashboard/stats", false)).toEqual({
        type: "reject-unauthorized",
      });
    });

    it("does not treat the webhook as a protected API route", () => {
      expect(decideAuthAction("/api/webhooks/evolution", false)).toEqual({
        type: "allow",
      });
    });
  });

  describe("authenticated requests", () => {
    it("allows protected pages", () => {
      expect(decideAuthAction("/", true)).toEqual({ type: "allow" });
      expect(decideAuthAction("/campaigns", true)).toEqual({ type: "allow" });
    });

    it("allows protected API routes", () => {
      expect(decideAuthAction("/api/campaigns", true)).toEqual({
        type: "allow",
      });
    });

    it("bounces an already-logged-in Operator away from the login page", () => {
      expect(decideAuthAction("/login", true)).toEqual({
        type: "redirect-to-home",
      });
    });
  });
});
