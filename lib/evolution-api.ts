export const DEMO_INSTANCE_NAME = "send-a-zap-demo";

export interface EvolutionConnection {
  instanceName: string;
  instanceId: string;
  instanceToken: string;
}

export interface ConnectInstanceOptions {
  webhookUrl?: string;
  subscribe?: string[];
}

export interface EvolutionQRCode {
  code?: string;
  base64?: string;
}

export interface EvolutionConnectionStatus {
  connected: boolean;
  jid?: string;
  status?: string;
}

type Fetch = typeof globalThis.fetch;

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function assertDemoInstanceTarget(
  connection: EvolutionConnection,
  targetInstanceId: string,
): void {
  if (connection.instanceId !== targetInstanceId) {
    throw new Error(
      `Refusing to target Evolution instance ${targetInstanceId}; the demo owns ${connection.instanceId}`,
    );
  }
}

export class EvolutionAPI {
  private readonly baseUrl: string;
  private readonly adminKey: string;
  private readonly fetch: Fetch;

  constructor(baseUrl?: string, adminKey?: string, fetchImpl: Fetch = globalThis.fetch) {
    this.baseUrl = (baseUrl || process.env.EVOLUTION_API_URL || "").replace(/\/+$/, "");
    this.adminKey =
      adminKey || process.env.EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY || "";
    this.fetch = fetchImpl;

    if (!this.baseUrl || !this.adminKey) {
      throw new Error(
        "Evolution Go configuration missing. Set EVOLUTION_API_URL and EVOLUTION_GLOBAL_API_KEY.",
      );
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit,
    credential?: EvolutionConnection,
  ): Promise<T> {
    const response = await this.fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: credential
        ? {
            "Content-Type": "application/json",
            apikey: credential.instanceToken,
            instanceId: credential.instanceId,
            ...options.headers,
          }
        : options.headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Evolution Go error (${response.status}): ${errorText}`);
    }

    return (await response.json()) as T;
  }

  async createInstance(
    instanceName = DEMO_INSTANCE_NAME,
    instanceToken = crypto.randomUUID(),
  ): Promise<EvolutionConnection> {
    const payload = await this.request<unknown>("/instance/create", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: this.adminKey },
      body: JSON.stringify({ name: instanceName, token: instanceToken }),
    });
    const data = record(record(payload).data ?? record(payload).instance);
    const instanceId = text(data.id ?? data.instanceId);
    const returnedToken = text(data.token ?? record(record(payload).hash).apikey);
    const responseName = text(data.name ?? data.instanceName) ?? instanceName;

    if (!instanceId || !returnedToken) {
      throw new Error("Evolution Go create response did not include an instance id and token");
    }

    return { instanceName: responseName, instanceId, instanceToken: returnedToken };
  }

  async deleteInstance(
    connection: EvolutionConnection,
    targetInstanceId = connection.instanceId,
  ): Promise<{ message?: string }> {
    assertDemoInstanceTarget(connection, targetInstanceId);
    return this.request(`/instance/delete/${encodeURIComponent(targetInstanceId)}`, {
      method: "DELETE",
      headers: { apikey: this.adminKey },
    });
  }

  async connectInstance(
    connection: EvolutionConnection,
    options: ConnectInstanceOptions = {},
  ): Promise<unknown> {
    return this.request(
      "/instance/connect",
      {
        method: "POST",
        body: JSON.stringify({ ...options, immediate: true }),
      },
      connection,
    );
  }

  async getQRCode(connection: EvolutionConnection): Promise<EvolutionQRCode> {
    const payload = await this.request<unknown>(
      "/instance/qr",
      { method: "GET" },
      connection,
    );
    const root = record(payload);
    const data = record(root.data);
    return {
      code: text(data.qrcode ?? data.code ?? root.qrcode ?? root.code),
      base64: text(data.base64 ?? root.base64),
    };
  }

  async getPairingCode(
    connection: EvolutionConnection,
    phone: string,
  ): Promise<{ pairingCode?: string }> {
    const payload = await this.request<unknown>(
      "/instance/pair",
      { method: "POST", body: JSON.stringify({ phone }) },
      connection,
    );
    const root = record(payload);
    const data = record(root.data);
    return { pairingCode: text(data.pairingCode ?? data.code ?? root.pairingCode) };
  }

  async getConnectionStatus(
    connection: EvolutionConnection,
  ): Promise<EvolutionConnectionStatus> {
    const payload = await this.request<unknown>(
      "/instance/status",
      { method: "GET" },
      connection,
    );
    const root = record(payload);
    const data = record(root.data);
    const status = text(data.status ?? root.status);
    const connectedValue = data.connected ?? root.connected;
    return {
      connected: connectedValue === true || status === "open" || status === "connected",
      jid: text(data.jid ?? root.jid),
      status,
    };
  }

  async sendText(
    connection: EvolutionConnection,
    number: string,
    message: string,
  ): Promise<string> {
    const payload = await this.request<unknown>(
      "/send/text",
      { method: "POST", body: JSON.stringify({ number, text: message }) },
      connection,
    );
    const root = record(payload);
    const data = record(root.data);
    const info = record(data.Info ?? data.info);
    const messageId = text(info.ID ?? info.id ?? data.messageId ?? root.messageId);
    if (!messageId) {
      throw new Error("Evolution Go send response did not include data.Info.ID");
    }
    return messageId;
  }

  async checkHealth(): Promise<boolean> {
    const response = await this.fetch(`${this.baseUrl}/server/ok`, { method: "GET" });
    return response.ok;
  }
}

let evolutionAPI: EvolutionAPI | null = null;

export function getEvolutionAPI(): EvolutionAPI {
  evolutionAPI ??= new EvolutionAPI();
  return evolutionAPI;
}
