export type CampaignLogLevel = "debug" | "info" | "warn" | "error";

type LogBindings = Record<string, unknown>;

export interface CampaignLogger {
  debug(bindings: LogBindings, message: string): void;
  info(bindings: LogBindings, message: string): void;
  warn(bindings: LogBindings, message: string): void;
  error(bindings: LogBindings, message: string): void;
}

export type CampaignEventWrite = {
  campaignId: string;
  messageId?: string;
  runId: string;
  type: string;
  level: CampaignLogLevel;
  message: string;
  data: Record<string, unknown>;
};

export interface CampaignEventStore {
  append(event: CampaignEventWrite): Promise<void>;
}

export type CampaignLifecycleEvent = {
  runId: string;
  campaignId: string;
  messageId?: string;
  tick: number;
  event: string;
  state: string;
  durationMs: number;
  level: CampaignLogLevel;
  message: string;
  data?: Record<string, unknown>;
};

type CampaignObserverDependencies = {
  logger: CampaignLogger;
  eventStore: CampaignEventStore;
  eventPruner?: {
    pruneIfDue(): Promise<number>;
  };
};

const BODY_FIELDS = new Set([
  "body",
  "messageBody",
  "renderedMessage",
  "text",
]);

function redactPhone(value: string) {
  const visible = value.slice(-4);
  return `${"*".repeat(Math.max(0, value.length - visible.length))}${visible}`;
}

function redactValue(key: string, value: unknown): unknown {
  if (BODY_FIELDS.has(key)) {
    return "[REDACTED]";
  }
  if (key.toLowerCase().includes("phone") && typeof value === "string") {
    return redactPhone(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue("", item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([nestedKey, nestedValue]) => [
        nestedKey,
        redactValue(nestedKey, nestedValue),
      ]),
    );
  }
  return value;
}

function redactData(data: Record<string, unknown> = {}) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, redactValue(key, value)]),
  );
}

export function createCampaignObserver({
  logger,
  eventStore,
  eventPruner,
}: CampaignObserverDependencies) {
  return {
    async record(event: CampaignLifecycleEvent) {
      const data = {
        tick: event.tick,
        event: event.event,
        state: event.state,
        durationMs: event.durationMs,
        ...redactData(event.data),
      };
      const bindings = {
        runId: event.runId,
        campaignId: event.campaignId,
        ...(event.messageId ? { messageId: event.messageId } : {}),
        tick: event.tick,
        event: event.event,
        state: event.state,
        durationMs: event.durationMs,
        data,
      };

      logger[event.level](bindings, event.message);

      try {
        await eventStore.append({
          campaignId: event.campaignId,
          ...(event.messageId ? { messageId: event.messageId } : {}),
          runId: event.runId,
          type: event.event,
          level: event.level,
          message: event.message,
          data,
        });
      } catch (error) {
        logger.warn(
          {
            runId: event.runId,
            campaignId: event.campaignId,
            ...(event.messageId ? { messageId: event.messageId } : {}),
            tick: event.tick,
            event: "audit_write_failed",
            state: event.state,
            durationMs: event.durationMs,
            error:
              error instanceof Error ? error.message : "Unknown audit error",
          },
          "Campaign audit write failed",
        );
        return;
      }

      try {
        await eventPruner?.pruneIfDue();
      } catch (error) {
        logger.warn(
          {
            runId: event.runId,
            campaignId: event.campaignId,
            ...(event.messageId ? { messageId: event.messageId } : {}),
            tick: event.tick,
            event: "retention_prune_failed",
            state: event.state,
            durationMs: event.durationMs,
            error:
              error instanceof Error ? error.message : "Unknown prune error",
          },
          "Campaign audit retention prune failed",
        );
      }
    },
  };
}

export type CampaignObserver = ReturnType<typeof createCampaignObserver>;
