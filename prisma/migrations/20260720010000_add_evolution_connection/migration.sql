CREATE TABLE "evolution_connections" (
    "id" VARCHAR(255) NOT NULL DEFAULT 'demo',
    "instance_name" VARCHAR(255) NOT NULL,
    "instance_id" VARCHAR(255) NOT NULL,
    "instance_token" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evolution_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "evolution_connections_instance_id_key"
ON "evolution_connections"("instance_id");
