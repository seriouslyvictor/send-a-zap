# Reuse the VPS's existing Evolution Go and Postgres; deploy only Next.js + n8n

The demo deploys to a resource-limited VPS that already runs a working Evolution Go server (serving the production bella bot) and a Postgres server. Rather than shipping the repo's original 6-container stack, Send-a-Zap deploys only its own Next.js and n8n containers, creates its database on the shared Postgres, and integrates with the shared Evolution Go — accepting a migration of `lib/evolution-api.ts`, the webhook handler, and the Evolution-facing n8n workflows from Evolution API v2 to Evolution Go's surface (reference implementation: `D:\Bella-bot\bella\evolution.py`).

## Considered Options

- **Own Evolution v2 container (freeze & pin)** — no migration work, but duplicates a heavy service on a constrained VPS and runs an engine the owner has already moved away from.
- **Shared Evolution Go (chosen)** — saves resources and reuses proven infra; costs a client migration and couples the demo to a server a production bot depends on.

## Consequences

- Instance lifecycle is fully API-driven: create instance via the global key → store instance ID + instance token → pair via QR → delete on Idle Disconnect. Manual instance creation is not viable for a demo.
- Isolation from bella bot: instance-scoped tokens for all instance operations; the global key is used only for create/delete, and every lifecycle call is guarded to target only the demo's own instance.
- The shared Evolution Go has a known Postgres connection-budget sensitivity (see Bella-bot's `docs/evolution-connection-budget.md`); the demo's instance churn must stay within it.
- Redis and pgAdmin leave the stack entirely (nothing in the app uses Redis; it existed for the old bundled Evolution).
