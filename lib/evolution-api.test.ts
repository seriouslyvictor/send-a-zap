import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EvolutionAPI,
  assertDemoInstanceTarget,
  createDemoInstanceName,
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
      .mockResolvedValueOnce(jsonResponse({ data: { connected: true, jid: "551199@s.whatsapp.net" } }));
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

  it("sends text with scoped credentials and returns the sent message id", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({ data: { Info: { ID: "sent-message-id" } } }),
    );
    const api = new EvolutionAPI("http://evolution.test", "admin-key", fetch);

    await expect(api.sendText(connection, "5511999999999", "Oi!")).resolves.toBe(
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
