const DEMO_INSTANCE_PREFIX = "send-a-zap-";

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
  profileName?: string;
  status?: string;
}

type Fetch = typeof globalThis.fetch;
type RandomUUID = () => string;
type RandomBytes = (length: number) => Uint8Array;
type MessageIdFactory = () => string;
export type PersistProviderMessageId = (messageId: string) => Promise<void>;

const EVOLUTION_MESSAGE_ID_PATTERN = /^3EB0[0-9A-F]{18}$/;

function secureRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function createEvolutionMessageId(
  randomBytes: RandomBytes = secureRandomBytes,
): string {
  return `3EB0${Array.from(randomBytes(9), (byte) =>
    byte.toString(16).padStart(2, "0"),
  )
    .join("")
    .toUpperCase()}`;
}

export class EvolutionAPIError extends Error {
  constructor(
    readonly status: number,
    details: string,
  ) {
    super(`Evolution Go error (${status}): ${details}`);
    this.name = "EvolutionAPIError";
  }
}

export function createDemoInstanceName(randomUUID: RandomUUID = crypto.randomUUID): string {
  return `${DEMO_INSTANCE_PREFIX}${randomUUID()}`;
}

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
  if (!connection.instanceName.startsWith(DEMO_INSTANCE_PREFIX)) {
    throw new Error(
      `Refusing to target non-demo Evolution instance ${connection.instanceName}`,
    );
  }
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
  private readonly createMessageId: MessageIdFactory;

  constructor(
    baseUrl?: string,
    adminKey?: string,
    fetchImpl: Fetch = globalThis.fetch,
    messageIdFactory: MessageIdFactory = createEvolutionMessageId,
  ) {
    this.baseUrl = (baseUrl || process.env.EVOLUTION_API_URL || "").replace(/\/+$/, "");
    this.adminKey =
      adminKey || process.env.EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY || "";
    this.fetch = fetchImpl;
    this.createMessageId = messageIdFactory;

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
      throw new EvolutionAPIError(response.status, errorText);
    }

    return (await response.json()) as T;
  }

  async createInstance(
    instanceName = createDemoInstanceName(),
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

  async instanceExists(instanceId: string): Promise<boolean> {
    const payload = await this.request<unknown>("/instance/all", {
      method: "GET",
      headers: { apikey: this.adminKey },
    });
    const root = record(payload);
    const instances = Array.isArray(root.data)
      ? root.data
      : Array.isArray(payload)
        ? payload
        : [];
    return instances.some((instance) => text(record(instance).id) === instanceId);
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
    const providerQRCode = text(data.qrcode ?? root.qrcode);
    const nativeImage = providerQRCode?.startsWith("data:image/")
      ? providerQRCode
      : text(data.base64 ?? root.base64);
    return {
      code: text(data.code ?? root.code) ?? (nativeImage ? undefined : providerQRCode),
      base64: nativeImage,
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
    const transportConnected = data.Connected ?? root.Connected;
    const loggedIn = data.LoggedIn ?? root.LoggedIn;
    const legacyConnected = data.connected ?? root.connected;
    const connected =
      typeof loggedIn === "boolean"
        ? transportConnected === true && loggedIn
        : legacyConnected === true || status === "open" || status === "connected";
    const name = text(data.Name ?? root.Name);
    const jid = text(
      data.JID ??
        data.Jid ??
        data.jid ??
        data.myJid ??
        root.JID ??
        root.Jid ??
        root.jid ??
        root.myJid,
    );
    return {
      connected,
      ...(jid ? { jid } : {}),
      ...(name ? { profileName: name } : {}),
      status: status ?? (connected ? "connected" : "close"),
    };
  }

  private async sendText(
    connection: EvolutionConnection,
    number: string,
    message: string,
    messageId?: string,
  ): Promise<string> {
    const payload = await this.request<unknown>(
      "/send/text",
      {
        method: "POST",
        body: JSON.stringify({
          number,
          text: message,
          ...(messageId ? { id: messageId } : {}),
        }),
      },
      connection,
    );
    const root = record(payload);
    const data = record(root.data);
    const info = record(data.Info ?? data.info);
    const returnedMessageId = text(info.ID ?? info.id ?? data.messageId ?? root.messageId);
    if (!returnedMessageId) {
      throw new Error("Evolution Go send response did not include data.Info.ID");
    }
    return returnedMessageId;
  }

  async sendTrackedText(
    connection: EvolutionConnection,
    number: string,
    message: string,
    persistProviderMessageId: PersistProviderMessageId,
  ): Promise<string> {
    const messageId = this.createMessageId();
    if (!EVOLUTION_MESSAGE_ID_PATTERN.test(messageId)) {
      throw new Error("Evolution message id factory returned an invalid WhatsApp message id");
    }
    await persistProviderMessageId(messageId);
    const returnedMessageId = await this.sendText(connection, number, message, messageId);
    if (returnedMessageId !== messageId) {
      throw new Error(
        `Evolution Go returned message id ${returnedMessageId} instead of preassigned id ${messageId}`,
      );
    }
    return returnedMessageId;
  }

  async sendUntrackedText(
    connection: EvolutionConnection,
    number: string,
    message: string,
  ): Promise<string> {
    return this.sendText(connection, number, message);
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
