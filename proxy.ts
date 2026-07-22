import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { decideAuthAction, LOGIN_PATH } from "@/lib/auth-routing";
import { recordOperatorActivity } from "@/lib/connection-activity";
import { getPrisma } from "@/lib/prisma";

/**
 * The auth gate. Runs on every request matched below (Next.js 16 "proxy",
 * formerly middleware; nodejs runtime). Delegates the access-control decision
 * to `decideAuthAction` and turns it into a response.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const decision = decideAuthAction(pathname, Boolean(req.auth));

  switch (decision.type) {
    case "allow":
      // Best-effort activity stamp for the demo Connection idle timer (#17).
      // req.auth is only truthy for an authenticated Operator, so public/
      // unauthenticated allow-paths (login, webhooks, maintenance) never hit
      // this. Fire-and-forget: must never block or fail the request.
      if (req.auth) {
        recordOperatorActivity(getPrisma()).catch(() => {});
      }
      return NextResponse.next();
    case "redirect-to-login": {
      const loginUrl = new URL(LOGIN_PATH, req.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
    case "redirect-to-home":
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    case "reject-unauthorized":
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
});

export const config = {
  // Run on every route except Next.js internals and static assets. The
  // fine-grained public/protected policy lives in `decideAuthAction`.
  //
  // The `.*\\..*` clause skips paths with a dot (static files), so `/api/`
  // is matched explicitly as well — otherwise an API route with a dot in a
  // segment (an email, a filename) would slip the gate entirely.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
    "/api/:path*",
  ],
};
