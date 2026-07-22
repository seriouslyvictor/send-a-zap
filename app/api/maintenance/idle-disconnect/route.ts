import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getConnectionIdleTtlMinutes, isConnectionIdle } from "@/lib/connection-idle";
import { deleteDemoConnection, EVOLUTION_CONNECTION_ID } from "@/lib/evolution-connection";
import { getPrisma } from "@/lib/prisma";

/**
 * Protected maintenance endpoint: a scheduler (cron / external caller, see
 * `worker/idle-disconnect.ts`) hits this to tear down the demo Evolution
 * Connection once it's been idle past the configured TTL (#17). No Operator
 * session is available here, so access is gated by a shared secret instead.
 */

function suppliedMaintenanceSecret(request: Request): string | null {
  return (
    request.headers.get("x-maintenance-secret") ??
    new URL(request.url).searchParams.get("secret")
  );
}

function maintenanceSecretMatches(request: Request): boolean {
  const expected = process.env.MAINTENANCE_SECRET;
  const supplied = suppliedMaintenanceSecret(request);
  if (!expected || !supplied) return false;

  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return (
    expectedBytes.length === suppliedBytes.length &&
    timingSafeEqual(expectedBytes, suppliedBytes)
  );
}

export async function POST(request: Request) {
  if (!maintenanceSecretMatches(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const connection = await getPrisma().evolutionConnection.findUnique({
      where: { id: EVOLUTION_CONNECTION_ID },
    });
    if (!connection) {
      return NextResponse.json({ success: true, status: "not_found" });
    }

    const effectiveActivity = connection.lastActivityAt ?? connection.createdAt;
    const idle = isConnectionIdle({
      lastActivityAt: effectiveActivity,
      now: new Date(),
      ttlMinutes: getConnectionIdleTtlMinutes(),
    });

    if (!idle) {
      return NextResponse.json({ success: true, status: "active" });
    }

    const result = await deleteDemoConnection(getPrisma());
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Idle disconnect check failed",
      },
      { status: 500 },
    );
  }
}
