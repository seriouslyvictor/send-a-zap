import { createPinoCampaignLogger } from "@/lib/campaign-observability-runtime";

const DEFAULT_MAINTENANCE_URL = "http://localhost:3000/api/maintenance/idle-disconnect";

async function main() {
  const logger = createPinoCampaignLogger();
  const url = process.env.MAINTENANCE_URL ?? DEFAULT_MAINTENANCE_URL;
  const secret = process.env.MAINTENANCE_SECRET;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: secret ? { "x-maintenance-secret": secret } : undefined,
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      logger.error(
        { event: "idle_disconnect_failed", status: response.status, body },
        "Idle disconnect maintenance call failed",
      );
      process.exitCode = 1;
      return;
    }

    logger.info(
      { event: "idle_disconnect_checked", body },
      "Idle disconnect maintenance call completed",
    );
  } catch (error) {
    logger.error(
      {
        event: "idle_disconnect_failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      "Idle disconnect maintenance call failed",
    );
    process.exitCode = 1;
  }
}

void main();
