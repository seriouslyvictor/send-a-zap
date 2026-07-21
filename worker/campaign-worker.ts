import { startCampaignWorker } from "@/lib/campaign-worker";
import { getCampaignQueue } from "@/lib/campaign-queue";
import { startQueueDashboard } from "@/lib/queue-dashboard";

const campaignQueue = getCampaignQueue();
const dashboard = startQueueDashboard({
  queue: campaignQueue,
  credentials: {
    username: process.env.QUEUE_DASHBOARD_USERNAME ?? "",
    password: process.env.QUEUE_DASHBOARD_PASSWORD ?? "",
  },
  host: process.env.QUEUE_DASHBOARD_HOST,
  port: process.env.QUEUE_DASHBOARD_PORT
    ? Number(process.env.QUEUE_DASHBOARD_PORT)
    : undefined,
});
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
  await new Promise<void>((resolve, reject) => {
    dashboard.close((error) => (error ? reject(error) : resolve()));
  });
  await worker.close();
  await campaignQueue.close();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
