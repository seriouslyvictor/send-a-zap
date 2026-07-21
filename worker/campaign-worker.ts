import { startCampaignWorker } from "@/lib/campaign-worker";

const worker = startCampaignWorker();

worker.on("error", (error) => {
  console.error("Campaign worker error", error);
});

worker.on("failed", (job, error) => {
  console.error("Campaign tick failed", {
    campaignId: job?.data.campaignId,
    runId: job?.data.runId,
    tick: job?.data.tick,
    error,
  });
});

async function shutdown(signal: string) {
  console.log(`Campaign worker received ${signal}; shutting down`);
  await worker.close();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
