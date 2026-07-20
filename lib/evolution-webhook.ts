export type EvolutionMessageStatus = "SENT" | "DELIVERED" | "READ";

export interface NormalizedEvolutionMessageStatus {
  kind: "message-status";
  instanceId: string;
  messageIds: string[];
  chatJid?: string;
  status: EvolutionMessageStatus;
  timestamp?: string;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function phoneNumberJid(value: unknown): string | undefined {
  const jid = nonEmptyString(value);
  if (!jid?.endsWith("@s.whatsapp.net")) return undefined;

  const user = jid.split("@", 1)[0].split(":", 1)[0];
  return user ? `${user}@s.whatsapp.net` : undefined;
}

export function canonicalEvolutionChatJid(value: unknown): string | undefined {
  const info = record(value);
  if (!info) return undefined;

  const chatJid = nonEmptyString(info.Chat);
  if (!chatJid || !chatJid.endsWith("@lid")) return chatJid;

  const alternateJid = info.IsFromMe === true ? info.RecipientAlt : info.SenderAlt;
  return phoneNumberJid(alternateJid) ?? chatJid;
}

function normalizeMessage(
  root: Record<string, unknown>,
  instanceId: string,
): NormalizedEvolutionMessageStatus | null {
  const data = record(root.data);
  const info = record(data?.Info);
  const messageId = nonEmptyString(info?.ID);

  if (!info || info.IsFromMe !== true || !messageId) return null;

  return {
    kind: "message-status",
    instanceId,
    messageIds: [messageId],
    chatJid: canonicalEvolutionChatJid(info),
    status: "SENT",
    timestamp: nonEmptyString(info.Timestamp),
  };
}

function normalizeReceipt(
  root: Record<string, unknown>,
  instanceId: string,
): NormalizedEvolutionMessageStatus | null {
  const data = record(root.data);
  if (!data) return null;

  const state = nonEmptyString(root.state);
  const status =
    state === "Delivered"
      ? "DELIVERED"
      : state === "Read" || state === "ReadSelf"
        ? "READ"
        : null;
  if (!status) return null;

  const rawMessageIds = data.MessageIDs;
  if (!Array.isArray(rawMessageIds)) return null;

  const messageIds = rawMessageIds.filter(
    (messageId): messageId is string =>
      typeof messageId === "string" && messageId.length > 0,
  );
  if (messageIds.length === 0) return null;

  return {
    kind: "message-status",
    instanceId,
    messageIds,
    chatJid: canonicalEvolutionChatJid(data),
    status,
    timestamp: nonEmptyString(data.Timestamp),
  };
}

export function normalizeEvolutionWebhook(
  payload: unknown,
): NormalizedEvolutionMessageStatus | null {
  const root = record(payload);
  const instanceId = nonEmptyString(root?.instanceId);
  const event = nonEmptyString(root?.event);
  if (!root || !instanceId || !event) return null;

  if (event === "Message" || event === "SendMessage") {
    return normalizeMessage(root, instanceId);
  }
  if (event === "Receipt") return normalizeReceipt(root, instanceId);
  return null;
}
