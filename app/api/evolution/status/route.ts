import { NextResponse } from "next/server";

import { getEvolutionAPI } from "@/lib/evolution-api";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    const connection = await getPrisma().evolutionConnection.findUnique({
      where: { id: "demo" },
    });
    if (!connection) {
      return NextResponse.json({ success: true, connected: false, status: "not_found" });
    }

    const status = await getEvolutionAPI().getConnectionStatus(connection);
    return NextResponse.json({
      success: true,
      connected: status.connected,
      status: status.status ?? (status.connected ? "open" : "close"),
      state: status.status,
      instanceName: connection.instanceName,
      instanceId: connection.instanceId,
      owner: status.jid,
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
