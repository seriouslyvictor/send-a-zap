import type { Prisma, PrismaClient } from "@prisma/client";

import { EvolutionAPIError, getEvolutionAPI } from "@/lib/evolution-api";

export const EVOLUTION_CONNECTION_ID = "demo";

type AdvisoryLockTransaction = Pick<Prisma.TransactionClient, "$executeRaw">;

export async function lockEvolutionConnection(
  transaction: AdvisoryLockTransaction,
): Promise<void> {
  await transaction.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtext('send-a-zap:evolution-connection'))
  `;
}

export interface DeleteDemoConnectionResult {
  status: "not_found" | "deleted";
  message?: string;
}

/**
 * Deletes the demo Evolution instance and its connection row. The single
 * deletion path shared by the manual "Disconnect" action and the idle
 * maintenance endpoint (#17) — one place decides how a torn-down instance
 * is torn down.
 */
export async function deleteDemoConnection(
  prisma: PrismaClient,
): Promise<DeleteDemoConnectionResult> {
  return prisma.$transaction(
    async (transaction) => {
      await lockEvolutionConnection(transaction);
      const connection = await transaction.evolutionConnection.findUnique({
        where: { id: EVOLUTION_CONNECTION_ID },
      });
      if (!connection) return { status: "not_found" };

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
      return { status: "deleted", message };
    },
    { maxWait: 30_000, timeout: 30_000 },
  );
}
