import { describe, expect, it } from "vitest";

import {
  applyEvolutionMessageStatus,
  type EvolutionStatusStore,
  type EvolutionStatusTransaction,
  type StoredEvolutionMessage,
  type StoredMessageStatus,
  type StatusCampaignIncrements,
  type StatusMessageUpdate,
} from "./evolution-webhook-status";

function deferred(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

class RacingStatusStore implements EvolutionStatusStore {
  message: StoredEvolutionMessage = {
    id: "message-row",
    campaignId: "campaign-row",
    status: "QUEUED",
  };
  counters = { sent: 0, delivered: 0, read: 0 };
  private readonly lowerAtCas = deferred();
  private readonly releaseLowerCas = deferred();
  private heldLowerCas = false;

  waitUntilLowerAttemptsCas(): Promise<void> {
    return this.lowerAtCas.promise;
  }

  releaseLower(): void {
    this.releaseLowerCas.resolve();
  }

  async transaction<T>(
    work: (transaction: EvolutionStatusTransaction) => Promise<T>,
  ): Promise<T> {
    const transaction: EvolutionStatusTransaction = {
      findMessageByProviderId: async () => ({ ...this.message }),
      compareAndSetMessage: async (
        id: string,
        expectedStatus: StoredMessageStatus,
        update: StatusMessageUpdate,
      ) => {
        if (update.status === "DELIVERED" && !this.heldLowerCas) {
          this.heldLowerCas = true;
          this.lowerAtCas.resolve();
          await this.releaseLowerCas.promise;
        }
        if (id !== this.message.id || this.message.status !== expectedStatus) {
          return false;
        }
        this.message = { ...this.message, status: update.status };
        return true;
      },
      incrementCampaign: async (
        campaignId: string,
        increments: StatusCampaignIncrements,
      ) => {
        expect(campaignId).toBe("campaign-row");
        this.counters.sent += increments.sent;
        this.counters.delivered += increments.delivered;
        this.counters.read += increments.read;
      },
    };
    return work(transaction);
  }
}

describe("applyEvolutionMessageStatus", () => {
  it("retries a lost lower CAS so concurrent receipts finish at the highest status exactly once", async () => {
    const store = new RacingStatusStore();
    const delivered = applyEvolutionMessageStatus(
      store,
      "provider-message-id",
      "DELIVERED",
      new Date("2026-07-19T16:31:00-03:00"),
    );
    await store.waitUntilLowerAttemptsCas();

    await applyEvolutionMessageStatus(
      store,
      "provider-message-id",
      "READ",
      new Date("2026-07-19T16:32:00-03:00"),
    );
    store.releaseLower();
    await delivered;

    expect(store.message.status).toBe("READ");
    expect(store.counters).toEqual({ sent: 1, delivered: 1, read: 1 });
  });
});
