import { describe, expect, it, vi } from "vitest";

import { recordOperatorActivity } from "@/lib/connection-activity";
import { EVOLUTION_CONNECTION_ID } from "@/lib/evolution-connection";

describe("recordOperatorActivity", () => {
  it("stamps lastActivityAt on the demo connection and returns the updated count", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = { evolutionConnection: { updateMany } };
    const now = new Date("2026-07-21T12:00:00.000Z");

    await expect(recordOperatorActivity(prisma, now)).resolves.toBe(1);

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: EVOLUTION_CONNECTION_ID },
      data: { lastActivityAt: now },
    });
  });

  it("returns 0 when there is no demo connection row to update", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const prisma = { evolutionConnection: { updateMany } };

    await expect(recordOperatorActivity(prisma, new Date())).resolves.toBe(0);
  });

  it("defaults `now` to the current time when omitted", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = { evolutionConnection: { updateMany } };

    await recordOperatorActivity(prisma);

    const call = updateMany.mock.calls[0][0];
    expect(call.data.lastActivityAt).toBeInstanceOf(Date);
  });
});
