# Replace n8n with an in-app BullMQ campaign runner

n8n never held any of the campaign's real logic. The #14 rework already moved every DB transaction, advisory lock, idempotent send, and retry decision behind the Next.js seam into `lib/campaign-executor.ts` as plain callable functions; the four workflows only call back into it over HTTP. What n8n actually contributes is three orchestration primitives — a durable loop (claim → send → wait → repeat), a restart-safe pacing timer (the `Wait` nodes), and the start trigger. For that we run a whole extra service, add a network hop per step, express control flow as JSON blobs that escape code review and the test suite, and split secrets across two credential stores. We replace n8n with a BullMQ worker on the Redis already in the stack: delayed jobs are the durable timer, and the worker calls the existing executor functions directly. This revises the "deploy only Next.js + n8n" decision in ADR-0002 and the n8n-related Implementation Decisions in Spec #8.

## Considered Options

- **Keep n8n (status quo)** — durable loop and a visual per-run inspector for free, but a full service and JSON-configured control flow for what is ultimately a `for` loop with a timer. Nothing heavy runs in it; the value it adds is inspection, not computation.
- **In-app `setTimeout` loop** — no new dependency, but not restart-safe: a deploy or crash strands every running Campaign mid-flight, and an hours-long loop can't live inside an HTTP request. Rejected — it discards the one property (durable pacing) n8n was actually buying.
- **BullMQ on the existing Redis (chosen)** — a Campaign run is a chain of "tick" jobs; each tick claims and sends one Message, then enqueues the next tick with `delay` = the pacing seconds. Jobs persist in Redis, so restarts resume cleanly. One new library, zero new infrastructure.
- **Postgres-backed queue (pg-boss / Graphile Worker)** — avoids Redis, but Redis is already running for Evolution's cache; no reason to add a Postgres-queue engine when BullMQ fits the existing stack.

## Consequences

- We lose n8n's per-execution visual inspector — the single biggest thing it gave us. Compensating machinery is mandatory, not optional: structured logs carrying a correlation `runId` on every line, a persisted append-only `CampaignEvent` audit trail that reconstructs "what happened, step by step" for any run, and a read-only BullMQ dashboard for queue/delayed/failed state. Logging real recipients means content and phone numbers must be redacted or truncated so the audit trail is not a PII leak.
- A new long-lived **worker process** joins the deployment (Next.js alone cannot host an hours-long loop). It is a separate container, but far simpler to run and monitor than n8n.
- `Campaign.n8nExecutionId` becomes `runId`; the four workflow JSONs under `workflows/n8n/`, the `n8n` service in both compose files, the `N8N_*` env vars, and the n8n MCP config are removed.
- Campaign control (start / pause / resume / cancel) keeps working unchanged: the runner observes the same DB status the executor already writes, so pause/cancel take effect at the next tick with no new coordination.
- Business logic stays in TypeScript under Vitest and CI; control flow stops being an un-reviewable JSON blob.
- This revises ADR-0002 (the deployed stack is now Next.js + worker, not Next.js + n8n) and the n8n Implementation Decisions in Spec #8. The Idle Disconnect (#17), specified as an n8n cron workflow, needs a new scheduling home (a BullMQ repeatable job or a platform cron hitting the existing maintenance endpoint).
