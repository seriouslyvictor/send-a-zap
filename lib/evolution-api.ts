import type {
  CreateInstanceRequest,
  CreateInstanceResponse,
  EvolutionInstance,
  FetchInstancesResponseItem,
  QRCodeResponse,
  ConnectionStatus,
} from "@/types/evolution-api";

/**
 * Evolution API Client
 * Handles all communication with the Evolution API server
 *
 * NOTE: This should ONLY be used server-side (in API routes)
 * Never expose API keys to the client
 */
export class EvolutionAPI {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || process.env.EVOLUTION_API_URL || "";
    this.apiKey = apiKey || process.env.EVOLUTION_API_KEY || "";

    console.log("[EVOLUTION-API] Initializing with URL:", this.baseUrl);
    console.log("[EVOLUTION-API] API Key configured:", this.apiKey ? "Yes (length: " + this.apiKey.length + ")" : "No");

    if (!this.baseUrl || !this.apiKey) {
      throw new Error(
        "Evolution API configuration missing. Set EVOLUTION_API_URL and EVOLUTION_API_KEY environment variables."
      );
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`[EVOLUTION-API] ${options.method || "GET"} ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        apikey: this.apiKey,
        ...options.headers,
      },
    });

    console.log(`[EVOLUTION-API] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[EVOLUTION-API] Error response: ${errorText}`);
      throw new Error(
        `Evolution API error (${response.status}): ${errorText}`
      );
    }

    const data = await response.json();
    console.log(`[EVOLUTION-API] Response data:`, JSON.stringify(data, null, 2));
    return data;
  }

  /**
   * Create a new WhatsApp instance
   */
  async createInstance(
    data: CreateInstanceRequest
  ): Promise<CreateInstanceResponse> {
    return this.request<CreateInstanceResponse>("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        ...data,
        integration: data.integration || "WHATSAPP-BAILEYS",
        qrcode: data.qrcode !== false, // Default to true
      }),
    });
  }

  /**
   * Get QR code for instance connection
   */
  async getQRCode(instanceName: string): Promise<QRCodeResponse> {
    return this.request<QRCodeResponse>(
      `/instance/connect/${instanceName}`
    );
  }

  /**
   * Fetch all instances or a specific instance
   * Evolution API v2 returns instances directly in an array with different field names
   */
  async fetchInstances(
    instanceName?: string
  ): Promise<EvolutionInstance[]> {
    const params = instanceName
      ? `?instanceName=${encodeURIComponent(instanceName)}`
      : "";

    try {
      const response = await this.request<any[]>(
        `/instance/fetchInstances${params}`
      );

      // Handle empty or invalid response
      if (!response || !Array.isArray(response)) {
        console.warn("Invalid response from fetchInstances:", response);
        return [];
      }

      // Map Evolution API v2 response format to our internal format
      // API returns: [{ name, connectionStatus, profilePicUrl, ... }]
      // We normalize to: [{ instanceName, status, profilePictureUrl, ... }]
      return response.map((item) => {
        // Handle both v1 format (with instance wrapper) and v2 format (direct)
        const data = item.instance || item;
        return {
          instanceName: data.instanceName || data.name,
          instanceId: data.instanceId || data.id,
          status: data.status || data.connectionStatus,
          owner: data.owner || data.ownerJid,
          profileName: data.profileName,
          profilePictureUrl: data.profilePictureUrl || data.profilePicUrl,
          profileStatus: data.profileStatus,
          apikey: data.apikey || data.token,
          serverUrl: data.serverUrl,
          integration: data.integration,
        };
      });
    } catch (error) {
      console.error("Error fetching instances:", error);
      return [];
    }
  }

  /**
   * Get connection status of an instance
   */
  async getConnectionStatus(
    instanceName: string
  ): Promise<ConnectionStatus> {
    return this.request<ConnectionStatus>(
      `/instance/connectionState/${instanceName}`
    );
  }

  /**
   * Logout and disconnect instance
   */
  async logoutInstance(instanceName: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(
      `/instance/logout/${instanceName}`,
      {
        method: "DELETE",
      }
    );
  }

  /**
   * Delete instance completely
   */
  async deleteInstance(instanceName: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(
      `/instance/delete/${instanceName}`,
      {
        method: "DELETE",
      }
    );
  }

  /**
   * Restart instance
   */
  async restartInstance(instanceName: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(
      `/instance/restart/${instanceName}`,
      {
        method: "PUT",
      }
    );
  }
}

// Lazy-loaded singleton instance (avoids build-time initialization)
let _evolutionAPI: EvolutionAPI | null = null;

export function getEvolutionAPI(): EvolutionAPI {
  if (!_evolutionAPI) {
    _evolutionAPI = new EvolutionAPI();
  }
  return _evolutionAPI;
}

// For backwards compatibility - but prefer getEvolutionAPI() for lazy loading
export const evolutionAPI = {
  get instance() {
    return getEvolutionAPI();
  },
};
