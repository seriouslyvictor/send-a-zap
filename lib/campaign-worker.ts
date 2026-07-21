import {
  Worker,
  type ConnectionOptions,
  type Job,
  type WorkerOptions,
} from "bullmq";

import {
  CAMPAIGN_QUEUE_NAME,
  getCampaignTickQueue,
  getRedisConnection,
} from "@/lib/campaign-queue";
import {
  createDefaultCampaignRunner,
  type CampaignTick,
} from "@/lib/campaign-runner";

type CampaignTickProcessor = (
  tick: CampaignTick,
  attempt: number,
) => Promise<unknown>;

type CampaignWorkerOptions = {
  processor: CampaignTickProcessor;
  connection?: ConnectionOptions;
  concurrency?: number;
  queueName?: string;
};

export function createCampaignWorker({
  processor,
  connection = getRedisConnection(),
  concurrency = 10,
  queueName = CAMPAIGN_QUEUE_NAME,
}: CampaignWorkerOptions) {
  const options: WorkerOptions = {
    connection,
    concurrency: Math.max(1, concurrency),
  };

  return new Worker<CampaignTick, unknown, "tick">(
    queueName,
    async (job: Job<CampaignTick, unknown, "tick">) =>
      processor(job.data, job.attemptsMade + 1),
    options,
  );
}

export function startCampaignWorker() {
  const runner = createDefaultCampaignRunner(getCampaignTickQueue());
  const configuredConcurrency = Number(
    process.env.CAMPAIGN_WORKER_CONCURRENCY ?? "10",
  );

  return createCampaignWorker({
    processor: runner.handleTick,
    concurrency: Number.isFinite(configuredConcurrency)
      ? configuredConcurrency
      : 10,
  });
}
