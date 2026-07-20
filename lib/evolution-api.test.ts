import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EvolutionAPI,
  assertDemoInstanceTarget,
  createDemoInstanceName,
  createEvolutionMessageId,
  type EvolutionConnection,
} from "./evolution-api";

const connection: EvolutionConnection = {
  instanceName: "send-a-zap-550e8400-e29b-41d4-a716-446655440000",
  instanceId: "demo-instance-id",
  instanceToken: "demo-instance-token",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("EvolutionAPI", () => {
  afterEach(() => vi.restoreAllMocks());

  it("creates the demo instance with the admin key and captures its id and token", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        data: {
          id: "created-id",
          name: connection.instanceName,
          token: "created-token",
        },
        message: "success",
      }),
    );
    const api = new EvolutionAPI("http://evolution.test/", "admin-key", fetch);

    await expect(api.createInstance(connection.instanceName, "requested-token")).resolves.toEqual({
      instanceName: connection.instanceName,
      instanceId: "created-id",
      instanceToken: "created-token",
    });
    expect(fetch).toHaveBeenCalledWith("http://evolution.test/instance/create", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: "admin-key" },
      body: JSON.stringify({ name: connection.instanceName, token: "requested-token" }),
    });
  });

  it("deletes only the persisted demo instance with the admin key", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({ message: "Instance deleted" }),
    );
    const api = new EvolutionAPI("http://evolution.test", "admin-key", fetch);

    await expect(api.deleteInstance(connection, "demo-instance-id")).resolves.toEqual({
      message: "Instance deleted",
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://evolution.test/instance/delete/demo-instance-id",
      { method: "DELETE", headers: { apikey: "admin-key" } },
    );
  });

  it("uses the instance token and id for connect, QR, pairing, and status", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse({ data: { connected: false } }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            qrcode: "data:image/png;base64,native-provider-image",
            code: "raw-qr",
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: { pairingCode: "1234-5678" } }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            Connected: true,
            LoggedIn: true,
            Name: "Operator",
            JID: "551199@s.whatsapp.net",
          },
        }),
      );
    const api = new EvolutionAPI("http://evolution.test", "admin-key", fetch);

    await api.connectInstance(connection, {
      webhookUrl: "https://app.test/api/webhooks/evolution",
      subscribe: ["MESSAGE", "CONNECTION"],
    });
    await expect(api.getQRCode(connection)).resolves.toEqual({
      code: "raw-qr",
      base64: "data:image/png;base64,native-provider-image",
    });
    await expect(api.getPairingCode(connection, "5511999999999")).resolves.toEqual({
      pairingCode: "1234-5678",
    });
    await expect(api.getConnectionStatus(connection)).resolves.toEqual({
      connected: true,
      jid: "551199@s.whatsapp.net",
      profileName: "Operator",
      status: "connected",
    });

    const scopedHeaders = {
      "Content-Type": "application/json",
      apikey: "demo-instance-token",
      instanceId: "demo-instance-id",
    };
    expect(fetch.mock.calls).toEqual([
      ["http://evolution.test/instance/connect", {
        method: "POST",
        headers: scopedHeaders,
        body: JSON.stringify({
          webhookUrl: "https://app.test/api/webhooks/evolution",
          subscribe: ["MESSAGE", "CONNECTION"],
          immediate: true,
        }),
      }],
      ["http://evolution.test/instance/qr", { method: "GET", headers: scopedHeaders }],
      ["http://evolution.test/instance/pair", {
        method: "POST",
        headers: scopedHeaders,
        body: JSON.stringify({ phone: "5511999999999" }),
      }],
      ["http://evolution.test/instance/status", { method: "GET", headers: scopedHeaders }],
    ]);
  });

  it("sends explicitly untracked text with scoped credentials", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({ data: { Info: { ID: "sent-message-id" } } }),
    );
    const api = new EvolutionAPI("http://evolution.test", "admin-key", fetch);

    await expect(api.sendUntrackedText(connection, "5511999999999", "Oi!")).resolves.toBe(
      "sent-message-id",
    );
    expect(fetch).toHaveBeenCalledWith("http://evolution.test/send/text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: "demo-instance-token",
        instanceId: "demo-instance-id",
      },
      body: JSON.stringify({ number: "5511999999999", text: "Oi!" }),
    });
  });

  it("persists the provider id before sending tracked text", async () => {
    const order: string[] = [];
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => {
      order.push("fetch");
      return jsonResponse({ data: { Info: { ID: "3EB00123456789ABCDEF01" } } });
    });
    const api = new EvolutionAPI(
      "http://evolution.test",
      "admin-key",
      fetch,
      () => "3EB00123456789ABCDEF01",
    );

    await expect(
      api.sendTrackedText(connection, "5511999999999", "Oi!", async (messageId) => {
        order.push(`persist:${messageId}`);
      }),
    ).resolves.toBe("3EB00123456789ABCDEF01");
    expect(order).toEqual(["persist:3EB00123456789ABCDEF01", "fetch"]);
    expect(fetch).toHaveBeenCalledWith("http://evolution.test/send/text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: "demo-instance-token",
        instanceId: "demo-instance-id",
      },
      body: JSON.stringify({
        number: "5511999999999",
        text: "Oi!",
        id: "3EB00123456789ABCDEF01",
      }),
    });
  });

  it("reuses a persisted provider id when retrying a tracked send", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({ data: { Info: { ID: "3EB00123456789ABCDEF01" } } }),
    );
    const api = new EvolutionAPI("http://evolution.test", "admin-key", fetch);

    await expect(
      api.sendTrackedTextWithId(
        connection,
        "5511999999999",
        "Oi!",
        "3EB00123456789ABCDEF01",
      ),
    ).resolves.toBe("3EB00123456789ABCDEF01");
    expect(fetch).toHaveBeenCalledWith("http://evolution.test/send/text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: "demo-instance-token",
        instanceId: "demo-instance-id",
      },
      body: JSON.stringify({
        number: "5511999999999",
        text: "Oi!",
        id: "3EB00123456789ABCDEF01",
      }),
    });
  });

  it("fails tracked sends when Evolution returns a different provider id", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({ data: { Info: { ID: "3EB0FFFFFFFFFFFFFFFFFF" } } }),
    );
    const api = new EvolutionAPI(
      "http://evolution.test",
      "admin-key",
      fetch,
      () => "3EB00123456789ABCDEF01",
    );

    await expect(
      api.sendTrackedText(connection, "5511999999999", "Oi!", async () => undefined),
    ).rejects.toThrow(
      "Evolution Go returned message id 3EB0FFFFFFFFFFFFFFFFFF instead of preassigned id 3EB00123456789ABCDEF01",
    );
  });

  it("does not send tracked text when provider-id persistence fails", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const api = new EvolutionAPI(
      "http://evolution.test",
      "admin-key",
      fetch,
      () => "3EB00123456789ABCDEF01",
    );

    await expect(
      api.sendTrackedText(connection, "5511999999999", "Oi!", async () => {
        throw new Error("database unavailable");
      }),
    ).rejects.toThrow("database unavailable");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a non-WhatsMeow id before persistence or sending", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const persist = vi.fn(async () => undefined);
    const api = new EvolutionAPI(
      "http://evolution.test",
      "admin-key",
      fetch,
      () => "arbitrary-id",
    );

    await expect(
      api.sendTrackedText(connection, "5511999999999", "Oi!", persist),
    ).rejects.toThrow("invalid WhatsApp message id");
    expect(persist).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("checks process health without sending either credential", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response("Everything is ok!", { status: 200 }),
    );
    const api = new EvolutionAPI("http://evolution.test", "admin-key", fetch);

    await expect(api.checkHealth()).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith("http://evolution.test/server/ok", {
      method: "GET",
    });
  });

  it("checks exact provider ownership from the admin instance list", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        data: [
          { id: "bella-production-id", token: "must-not-leak-into-result" },
          { id: "demo-instance-id", token: "demo-token" },
        ],
      }),
    );
    const api = new EvolutionAPI("http://evolution.test", "admin-key", fetch);

    await expect(api.instanceExists("demo-instance-id")).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith("http://evolution.test/instance/all", {
      method: "GET",
      headers: { apikey: "admin-key" },
    });
  });

  it("does not treat a connected transport as an authenticated Connection", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        data: {
          Connected: true,
          LoggedIn: false,
          Name: "",
        },
      }),
    );
    const api = new EvolutionAPI("http://evolution.test", "admin-key", fetch);

    await expect(api.getConnectionStatus(connection)).resolves.toEqual({
      connected: false,
      status: "close",
    });
  });
});

describe("assertDemoInstanceTarget", () => {
  it("refuses a persisted connection that does not belong to the canonical demo", () => {
    expect(() =>
      assertDemoInstanceTarget(
        { ...connection, instanceName: "bella-production" },
        "demo-instance-id",
      ),
    ).toThrow("Refusing to target non-demo Evolution instance bella-production");
  });

  it("refuses a lifecycle target that is not the persisted demo instance", () => {
    expect(() => assertDemoInstanceTarget(connection, "bella-production-id")).toThrow(
      "Refusing to target Evolution instance bella-production-id",
    );
  });

  it("accepts the persisted demo instance id", () => {
    expect(() => assertDemoInstanceTarget(connection, "demo-instance-id")).not.toThrow();
  });
});

describe("createDemoInstanceName", () => {
  it("generates a distinct, recognizable name for every Connection", () => {
    expect(createDemoInstanceName(() => "550e8400-e29b-41d4-a716-446655440000")).toBe(
      "send-a-zap-550e8400-e29b-41d4-a716-446655440000",
    );
  });
});

describe("createEvolutionMessageId", () => {
  it("uses WhatsMeow's 3EB0 prefix with nine uppercase hexadecimal bytes", () => {
    expect(
      createEvolutionMessageId(() =>
        Uint8Array.from([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88]),
      ),
    ).toBe("3EB0001122334455667788");
  });
});
