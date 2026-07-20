import { describe, expect, it } from "vitest";

import { connectionDisplayNumber } from "./connection-display";

describe("connectionDisplayNumber", () => {
  it("formats the connected WhatsApp JID as a Brazilian phone number", () => {
    expect(connectionDisplayNumber("5511987654321:17@s.whatsapp.net")).toBe(
      "+55 (11) 98765-4321",
    );
  });

  it("keeps an international number readable when its shape is unknown", () => {
    expect(connectionDisplayNumber("351912345678@s.whatsapp.net")).toBe("+351912345678");
  });

  it("returns null when no owner is available", () => {
    expect(connectionDisplayNumber()).toBeNull();
  });
});
