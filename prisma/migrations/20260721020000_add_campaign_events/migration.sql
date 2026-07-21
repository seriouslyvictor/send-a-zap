CREATE TABLE "campaign_events" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "message_id" TEXT,
    "run_id" TEXT NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "level" VARCHAR(16) NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "campaign_events_campaign_id_created_at_idx"
ON "campaign_events"("campaign_id", "created_at");

CREATE INDEX "campaign_events_run_id_created_at_idx"
ON "campaign_events"("run_id", "created_at");

CREATE INDEX "campaign_events_created_at_idx"
ON "campaign_events"("created_at");

ALTER TABLE "campaign_events"
ADD CONSTRAINT "campaign_events_campaign_id_fkey"
FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_events"
ADD CONSTRAINT "campaign_events_message_id_fkey"
FOREIGN KEY ("message_id") REFERENCES "messages"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
