import { NextResponse } from "next/server";

import {
  EVOLUTION_CONNECTION_ID,
  lockEvolutionConnection,
} from "@/lib/evolution-connection";
import { EvolutionAPIError, getEvolutionAPI } from "@/lib/evolution-api";
import { getPrisma } from "@/lib/prisma";

async function disconnect() {
  const prisma = getPrisma();
  const payload = await prisma.$transaction(
    async (transaction) => {
      await lockEvolutionConnection(transaction);
      const connection = await transaction.evolutionConnection.findUnique({
        where: { id: EVOLUTION_CONNECTION_ID },
      });
      if (!connection) return { success: true, status: "not_found" };

      let message: string | undefined;
      try {
        const result = await getEvolutionAPI().deleteInstance(
          connection,
          connection.instanceId,
        );
        message = result.message;
      } catch (error) {
        if (!(error instanceof EvolutionAPIError) || error.status !== 404) throw error;
      }
      await transaction.evolutionConnection.delete({
        where: { id: EVOLUTION_CONNECTION_ID },
      });
      return { success: true, status: "deleted", message };
    },
    { maxWait: 30_000, timeout: 30_000 },
  );

  return NextResponse.json(payload);
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
