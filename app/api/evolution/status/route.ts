import { NextResponse } from "next/server";

import { EVOLUTION_CONNECTION_ID } from "@/lib/evolution-connection";
import { assertDemoInstanceTarget, getEvolutionAPI } from "@/lib/evolution-api";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    const connection = await getPrisma().evolutionConnection.findUnique({
      where: { id: EVOLUTION_CONNECTION_ID },
    });
    if (!connection) {
      return NextResponse.json({ success: true, connected: false, status: "not_found" });
    }

    assertDemoInstanceTarget(connection, connection.instanceId);
    const status = await getEvolutionAPI().getConnectionStatus(connection);
    return NextResponse.json({
      success: true,
      connected: status.connected,
      status: status.status ?? (status.connected ? "open" : "close"),
      state: status.status,
      owner: status.jid,
      profileName: status.profileName,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        connected: false,
        error: error instanceof Error ? error.message : "Status check failed",
      },
      { status: 500 },
    );
  }
}
