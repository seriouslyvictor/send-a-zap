// Evolution API Types

export interface EvolutionInstance {
  instanceName?: string;
  instanceId?: string;
  // Status can be "open", "close", "connecting", or "created" depending on API version
  status?: "open" | "close" | "connecting" | "created" | string;
  owner?: string;
  profileName?: string;
  profilePictureUrl?: string;
  profileStatus?: string;
  apikey?: string;
  serverUrl?: string;
  integration?: "WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS" | string;
  // Alternative field names from Evolution API v2
  name?: string;
  id?: string;
  connectionStatus?: string;
  ownerJid?: string;
  profilePicUrl?: string;
  token?: string;
}

export interface FetchInstancesResponseItem {
  instance: EvolutionInstance;
}

export interface CreateInstanceRequest {
  instanceName: string;
  integration?: "WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS";
  token?: string;
  qrcode?: boolean;
  number?: string;
  rejectCall?: boolean;
  msgCall?: string;
  groupsIgnore?: boolean;
  alwaysOnline?: boolean;
  readMessages?: boolean;
  readStatus?: boolean;
  syncFullHistory?: boolean;
}

export interface CreateInstanceResponse {
  instance: {
    instanceName: string;
    instanceId: string;
    status: string;
  };
  hash: {
    apikey: string;
  };
  qrcode?: {
    code?: string;
    base64?: string;
    pairingCode?: string;
  };
}

export interface QRCodeResponse {
  code?: string;
  base64?: string;
  count?: number;
  pairingCode?: string;
}

export interface ConnectionStatus {
  instance: string;
  state: "open" | "close" | "connecting";
}

export interface InstanceInfo extends EvolutionInstance {
  connectionStatus?: "connected" | "disconnected" | "connecting";
}
