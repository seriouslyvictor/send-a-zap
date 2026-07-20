/**
 * Health Check API Route
 *
 * GET /api/health - Liveness probe polled by the container HEALTHCHECK
 */

import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { buildHealthStatus } from "@/lib/health-status";

// Never cache or prerender: the probe must reflect the live process.
export const dynamic = "force-dynamic";

async function isDatabaseReachable(): Promise<boolean> {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * GET /api/health
 * Reports that the server is serving, plus database reachability.
 */
export async function GET() {
  return NextResponse.json(
    buildHealthStatus({ databaseReachable: await isDatabaseReachable() }),
  );
}
