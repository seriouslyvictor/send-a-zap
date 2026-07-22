/**
 * Records Operator activity against the demo Evolution Connection so the
 * idle-disconnect maintenance job knows the instance is still in use. Called
 * best-effort from the auth gate on every authenticated request — never on
 * the critical path, so it takes a minimal Prisma shape that's easy to mock.
 */

import { EVOLUTION_CONNECTION_ID } from "@/lib/evolution-connection";

type ConnectionActivityPrisma = {
  evolutionConnection: {
    updateMany(args: {
      where: { id: string };
      data: { lastActivityAt: Date };
    }): Promise<{ count: number }>;
  };
};

export async function recordOperatorActivity(
  prisma: ConnectionActivityPrisma,
  now: Date = new Date(),
): Promise<number> {
  const result = await prisma.evolutionConnection.updateMany({
    where: { id: EVOLUTION_CONNECTION_ID },
    data: { lastActivityAt: now },
  });
  return result.count;
}
