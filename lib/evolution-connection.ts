import type { Prisma } from "@prisma/client";

export const EVOLUTION_CONNECTION_ID = "demo";

type AdvisoryLockTransaction = Pick<Prisma.TransactionClient, "$executeRaw">;

export async function lockEvolutionConnection(
  transaction: AdvisoryLockTransaction,
): Promise<void> {
  await transaction.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtext('send-a-zap:evolution-connection'))
  `;
}
