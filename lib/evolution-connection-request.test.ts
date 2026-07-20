import { describe, expect, it } from "vitest";

import { evolutionConnectionRequest } from "./evolution-connection-request";

describe("evolutionConnectionRequest", () => {
  it("starts pairing once with explicit consent", () => {
    expect(evolutionConnectionRequest("start")).toEqual({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent: true }),
    });
  });

  it("refreshes only the current QR without restarting the provider client", () => {
    expect(evolutionConnectionRequest("refresh")).toEqual({
      method: "GET",
      cache: "no-store",
    });
  });
});
