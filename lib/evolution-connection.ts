import type { Prisma } from "@prisma/client";

export const EVOLUTION_CONNECTION_ID = "demo";

export async function lockEvolutionConnection(
  transaction: Prisma.TransactionClient,
): Promise<void> {
  await transaction.$queryRaw`
    SELECT pg_advisory_xact_lock(hashtext('send-a-zap:evolution-connection'))
  `;
}
