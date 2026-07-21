import {
  createCampaignEventPruner,
  createPinoCampaignLogger,
  createPrismaCampaignEventStore,
  getCampaignEventRetentionDays,
} from "@/lib/campaign-observability-runtime";
import { getPrisma } from "@/lib/prisma";

async function main() {
  const logger = createPinoCampaignLogger();
  const retentionDays = getCampaignEventRetentionDays();
  const eventStore = createPrismaCampaignEventStore();
  const pruner = createCampaignEventPruner({ eventStore, retentionDays });

  try {
    const deletedCount = await pruner.pruneNow();
    logger.info(
      { event: "campaign_events_pruned", deletedCount, retentionDays },
      "Campaign audit retention prune completed",
    );
  } catch (error) {
    logger.error(
      {
        event: "campaign_events_prune_failed",
        retentionDays,
        error: error instanceof Error ? error.message : "Unknown prune error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Campaign audit retention prune failed",
    );
    process.exitCode = 1;
  } finally {
    await getPrisma().$disconnect();
  }
}

void main();
