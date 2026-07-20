import { NextResponse } from "next/server";

import { getEvolutionAPI } from "@/lib/evolution-api";
import { getPrisma } from "@/lib/prisma";

const CONNECTION_ID = "demo";

async function disconnect() {
  const prisma = getPrisma();
  const connection = await prisma.evolutionConnection.findUnique({
    where: { id: CONNECTION_ID },
  });
  if (!connection) {
    return NextResponse.json({ success: true, status: "not_found" });
  }

  const result = await getEvolutionAPI().deleteInstance(connection, connection.instanceId);
  await prisma.evolutionConnection.delete({ where: { id: CONNECTION_ID } });
  return NextResponse.json({ success: true, status: "deleted", message: result.message });
}

export async function POST() {
  try {
    return await disconnect();
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Disconnect failed" },
      { status: 500 },
    );
  }
}

export const DELETE = POST;
