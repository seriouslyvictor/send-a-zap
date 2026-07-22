import type { Prisma, PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EvolutionAPIError } from "@/lib/evolution-api";

const deleteInstanceMock = vi.fn();

vi.mock("@/lib/evolution-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/evolution-api")>(
    "@/lib/evolution-api",
  );
  return {
    ...actual,
    getEvolutionAPI: () => ({ deleteInstance: deleteInstanceMock }),
  };
});

const { deleteDemoConnection, EVOLUTION_CONNECTION_ID, lockEvolutionConnection } = await import(
  "./evolution-connection"
);

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

describe("deleteDemoConnection", () => {
  beforeEach(() => {
    deleteInstanceMock.mockReset();
  });

  const connection = {
    id: EVOLUTION_CONNECTION_ID,
    instanceName: "send-a-zap-1",
    instanceId: "instance-1",
    instanceToken: "token-1",
  };

  function fakePrisma(overrides: {
    findUnique: (args: unknown) => Promise<unknown>;
    deleteMock: ReturnType<typeof vi.fn>;
  }) {
    const transaction = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      evolutionConnection: {
        findUnique: overrides.findUnique,
        delete: overrides.deleteMock,
      },
    };
    return {
      $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(transaction)),
    } as unknown as PrismaClient;
  }

  it("deletes the Evolution instance then the connection row and returns deleted", async () => {
    deleteInstanceMock.mockResolvedValueOnce({ message: "ok" });
    const deleteMock = vi.fn().mockResolvedValue(connection);
    const prisma = fakePrisma({
      findUnique: vi.fn().mockResolvedValue(connection),
      deleteMock,
    });

    await expect(deleteDemoConnection(prisma)).resolves.toEqual({
      status: "deleted",
      message: "ok",
    });
    expect(deleteInstanceMock).toHaveBeenCalledWith(connection, connection.instanceId);
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: EVOLUTION_CONNECTION_ID } });
  });

  it("tolerates a 404 from deleteInstance and still deletes the row", async () => {
    deleteInstanceMock.mockRejectedValueOnce(new EvolutionAPIError(404, "not found"));
    const deleteMock = vi.fn().mockResolvedValue(connection);
    const prisma = fakePrisma({
      findUnique: vi.fn().mockResolvedValue(connection),
      deleteMock,
    });

    await expect(deleteDemoConnection(prisma)).resolves.toEqual({ status: "deleted" });
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: EVOLUTION_CONNECTION_ID } });
  });

  it("returns not_found when there is no demo connection", async () => {
    const deleteMock = vi.fn();
    const prisma = fakePrisma({
      findUnique: vi.fn().mockResolvedValue(null),
      deleteMock,
    });

    await expect(deleteDemoConnection(prisma)).resolves.toEqual({ status: "not_found" });
    expect(deleteInstanceMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("rethrows a non-404 EvolutionAPIError and does not delete the row", async () => {
    deleteInstanceMock.mockRejectedValueOnce(new EvolutionAPIError(500, "boom"));
    const deleteMock = vi.fn();
    const prisma = fakePrisma({
      findUnique: vi.fn().mockResolvedValue(connection),
      deleteMock,
    });

    await expect(deleteDemoConnection(prisma)).rejects.toBeInstanceOf(EvolutionAPIError);
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
