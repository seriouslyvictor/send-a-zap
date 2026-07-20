# Send-a-Zap

Send-a-Zap is a Next.js application for creating and operating WhatsApp messaging campaigns. The browser talks only to server-side Next.js routes; database and service credentials never reach client components.

The project is being revived as a live portfolio demo. The current development topology mirrors the target VPS: Send-a-Zap runs only **Next.js + n8n** and reuses a PostgreSQL server and Evolution Go server already running on the host.

## Development architecture

```text
Browser -> Next.js -> shared PostgreSQL
                  -> n8n -> shared Evolution Go
                  -> shared Evolution Go
```

The development compose file does not start PostgreSQL, Redis, pgAdmin, or Evolution. It reaches host services through `host.docker.internal`.

## Prerequisites

- Node.js 20+
- pnpm via Corepack: run `corepack enable` once. The `packageManager` field in `package.json` pins the exact pnpm version (currently `pnpm@11.13.0`), so no separate pnpm install step is needed.
- Docker with Compose v2
- PostgreSQL reachable on the host (default port `5432`)
- Evolution Go reachable on the host (default URL `http://localhost:8080`)
- A PostgreSQL role allowed to create databases and run migrations
- The Evolution Go global API key

Confirm Evolution Go before continuing:

```bash
curl http://localhost:8080/server/ok
```

The expected response is `{"status":"ok"}`.

## Fresh-clone boot

1. Install JavaScript dependencies:

   ```bash
   pnpm install --frozen-lockfile
   ```

2. Create the local environment file and replace every placeholder secret:

   ```bash
   cp .env.example .env
   ```

   On PowerShell, use `Copy-Item .env.example .env`.

   Set `EVOLUTION_WEBHOOK_URL` to the callback URL Evolution Go can reach
   (the development default is
   `http://host.docker.internal:3000/api/webhooks/evolution`) and generate an
   independent random `EVOLUTION_WEBHOOK_SECRET`. Send-a-Zap adds that secret
   to the registered callback query because Evolution Go 0.7.2 does not support
   custom webhook headers. Never expose the secret through a `NEXT_PUBLIC_`
   variable.

   `POSTGRES_HOST` is the address used by the host-side database setup command,
   so `localhost` is correct when PostgreSQL is published locally. Compose uses
   `host.docker.internal` for the same server from inside its containers.
   On native Linux, PostgreSQL must also listen on the Docker host/bridge
   interface and allow the Docker subnet in `pg_hba.conf`; a server bound only
   to loopback is not reachable from containers. Docker Desktop supplies this
   host forwarding automatically.

3. Create the two project databases on the shared PostgreSQL server. This
   command reads the host, port, user, and password from `.env` and is safe to
   run again:

   ```bash
   pnpm run db:init:dev
   ```

4. Start the project-owned services:

   ```bash
   pnpm run docker:dev
   ```

   The Next.js container first checks Evolution Go's `/server/ok` endpoint,
   safely builds `DATABASE_URL` from the PostgreSQL settings, and applies the
   committed Prisma migrations to `send_a_zap`. n8n stores its tables in
   `n8n_send_a_zap`.

5. Open the services:

   - Send-a-Zap: http://localhost:3000
   - n8n: http://localhost:5678

6. Verify the running containers can reach the shared infrastructure:

   ```bash
   docker compose --env-file .env -f deployment/docker-compose.dev.yml \
     exec nextjs wget -qO- http://host.docker.internal:8080/server/ok
   ```

   To verify the database and migrations:

   ```bash
   pnpm run docker:dev:ps
   docker compose --env-file .env -f deployment/docker-compose.dev.yml \
     exec nextjs pnpm exec prisma migrate status
   ```

## Development commands

```bash
pnpm run dev                  # Next.js directly on the host
pnpm run build                # Prisma generation + production build
pnpm run lint                 # ESLint
pnpm run typecheck            # TypeScript without emitting files
pnpm run test:run             # Vitest once

pnpm run docker:dev           # Next.js + n8n with hot reload
pnpm run docker:dev:detached  # Start in the background
pnpm run docker:dev:logs      # Follow Next.js logs
pnpm run docker:dev:ps        # Show the two project containers
pnpm run docker:dev:down      # Stop the project containers
```

For host-only Next.js development, create `.env.local` with a `DATABASE_URL`
that uses `localhost`, plus `N8N_WEBHOOK_URL`, `EVOLUTION_API_URL`,
`EVOLUTION_API_KEY`, `EVOLUTION_WEBHOOK_URL`, and
`EVOLUTION_WEBHOOK_SECRET`. The compose workflow is the canonical
near-production development path.

## Security boundary

Client components call `/api/*`. Only server-side routes use Prisma, n8n, Evolution Go, or secret environment variables. Never add `NEXT_PUBLIC_` to API keys or database credentials.

## Project decisions

- [Domain glossary](CONTEXT.md)
- [ADR-0001: Operator-connected real sending](docs/adr/0001-operator-connected-real-sending.md)
- [ADR-0002: Shared Evolution Go and PostgreSQL](docs/adr/0002-shared-evolution-go-and-postgres.md)

The legacy production compose file has not yet been migrated and is not part of the development boot path described above.
