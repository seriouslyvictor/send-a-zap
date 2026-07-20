import type { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { lockEvolutionConnection } from "./evolution-connection";

describe("lockEvolutionConnection", () => {
  it("executes the void-returning PostgreSQL lock without deserializing it", async () => {
    const executeRaw = vi.fn().mockResolvedValue(1);
    const transaction = {
      $executeRaw: executeRaw,
    } as unknown as Pick<Prisma.TransactionClient, "$executeRaw">;

    await expect(lockEvolutionConnection(transaction)).resolves.toBeUndefined();
    expect(executeRaw).toHaveBeenCalledOnce();
    expect(executeRaw.mock.calls[0][0].join(" ")).toContain("pg_advisory_xact_lock");
  });
});
