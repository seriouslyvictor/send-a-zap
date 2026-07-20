import { describe, expect, it } from "vitest";

import {
  canonicalEvolutionChatJid,
  normalizeEvolutionWebhook,
} from "./evolution-webhook";

describe("canonicalEvolutionChatJid", () => {
  it("uses RecipientAlt to canonicalize an outbound LID chat", () => {
    expect(
      canonicalEvolutionChatJid({
        Chat: "123456789012345@lid",
        IsFromMe: true,
        RecipientAlt: "5511999999999:4@s.whatsapp.net",
      }),
    ).toBe("5511999999999@s.whatsapp.net");
  });

  it("uses SenderAlt to canonicalize an inbound LID chat", () => {
    expect(
      canonicalEvolutionChatJid({
        Chat: "123456789012345@lid",
        IsFromMe: false,
        SenderAlt: "5511888888888@s.whatsapp.net",
      }),
    ).toBe("5511888888888@s.whatsapp.net");
  });

  it("keeps an LID when Evolution Go did not provide a phone-number alias", () => {
    expect(
      canonicalEvolutionChatJid({
        Chat: "123456789012345@lid",
        IsFromMe: true,
      }),
    ).toBe("123456789012345@lid");
  });
});

describe("normalizeEvolutionWebhook", () => {
  it("normalizes Evolution Go's SendMessage event as SENT", () => {
    expect(
      normalizeEvolutionWebhook({
        event: "SendMessage",
        data: {
          Info: {
            ID: "3EB0000000000000000009",
            Chat: "5511999999999@s.whatsapp.net",
            IsFromMe: true,
            Timestamp: "2026-07-19T16:29:00-03:00",
          },
          Message: { conversation: "Oi!" },
        },
        instanceId: "demo-instance-id",
        instanceName: "send-a-zap-demo",
        instanceToken: "provider-instance-token",
      }),
    ).toEqual({
      kind: "message-status",
      instanceId: "demo-instance-id",
      messageIds: ["3EB0000000000000000009"],
      chatJid: "5511999999999@s.whatsapp.net",
      status: "SENT",
      timestamp: "2026-07-19T16:29:00-03:00",
    });
  });

  it("normalizes an outbound Message event as SENT", () => {
    expect(
      normalizeEvolutionWebhook({
        event: "Message",
        data: {
          Info: {
            ID: "3EB0000000000000000010",
            Chat: "123456789012345@lid",
            IsFromMe: true,
            RecipientAlt: "5511999999999@s.whatsapp.net",
            Timestamp: "2026-07-19T16:30:00-03:00",
          },
        },
        instanceId: "demo-instance-id",
        instanceToken: "provider-instance-token",
      }),
    ).toEqual({
      kind: "message-status",
      instanceId: "demo-instance-id",
      messageIds: ["3EB0000000000000000010"],
      chatJid: "5511999999999@s.whatsapp.net",
      status: "SENT",
      timestamp: "2026-07-19T16:30:00-03:00",
    });
  });

  it("ignores inbound Message events", () => {
    expect(
      normalizeEvolutionWebhook({
        event: "Message",
        data: {
          Info: {
            ID: "inbound-id",
            Chat: "5511999999999@s.whatsapp.net",
            IsFromMe: false,
          },
        },
        instanceId: "demo-instance-id",
      }),
    ).toBeNull();
  });

  it("normalizes a Delivered Receipt with every acknowledged message id", () => {
    expect(
      normalizeEvolutionWebhook({
        event: "Receipt",
        state: "Delivered",
        data: {
          Chat: "5511999999999@s.whatsapp.net",
          Sender: "5511000000000:1@s.whatsapp.net",
          IsFromMe: false,
          MessageIDs: ["message-1", "message-2"],
          Timestamp: "2026-07-19T16:31:00-03:00",
          Type: "delivered",
        },
        instanceId: "demo-instance-id",
      }),
    ).toEqual({
      kind: "message-status",
      instanceId: "demo-instance-id",
      messageIds: ["message-1", "message-2"],
      chatJid: "5511999999999@s.whatsapp.net",
      status: "DELIVERED",
      timestamp: "2026-07-19T16:31:00-03:00",
    });
  });

  it.each(["Read", "ReadSelf"])(
    "normalizes a %s Receipt as READ",
    (state) => {
      expect(
        normalizeEvolutionWebhook({
          event: "Receipt",
          state,
          data: {
            Chat: "123456789012345@lid",
            IsFromMe: true,
            RecipientAlt: "5511999999999@s.whatsapp.net",
            MessageIDs: ["message-1"],
            Timestamp: "2026-07-19T16:32:00-03:00",
          },
          instanceId: "demo-instance-id",
        }),
      ).toEqual({
        kind: "message-status",
        instanceId: "demo-instance-id",
        messageIds: ["message-1"],
        chatJid: "5511999999999@s.whatsapp.net",
        status: "READ",
        timestamp: "2026-07-19T16:32:00-03:00",
      });
    },
  );

  it("ignores malformed, unsupported, and empty receipt events", () => {
    expect(normalizeEvolutionWebhook(null)).toBeNull();
    expect(normalizeEvolutionWebhook({ event: "Connected" })).toBeNull();
    expect(
      normalizeEvolutionWebhook({
        event: "Receipt",
        state: "Played",
        data: { MessageIDs: ["message-1"] },
        instanceId: "demo-instance-id",
      }),
    ).toBeNull();
    expect(
      normalizeEvolutionWebhook({
        event: "Receipt",
        state: "Delivered",
        data: { MessageIDs: [] },
        instanceId: "demo-instance-id",
      }),
    ).toBeNull();
  });
});
