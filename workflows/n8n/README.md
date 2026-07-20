# Campaign workflows

These exports are the canonical n8n campaign workflows for the current
Evolution Go architecture. They were exported from the dev n8n after validation,
pinned tests, connection verification, and publication.

## Responsibilities

| Workflow | Responsibility |
| --- | --- |
| `start-campaign.json` | Accept `/webhook/campaign/start`, initialize one Campaign, dispatch the runner, and return a structured HTTP response. |
| `run-campaign.json` | Accept `/webhook/campaign/run`, then claim and process one Message at a time while checking pause/cancel state before every send and applying configured delays. |
| `send-campaign-message.json` | Send one claimed Message through the server-owned tracked Evolution Go operation. |
| `handle-campaign-failure.json` | Reconcile a RUNNING Campaign when an unhandled n8n execution failure escapes per-node handling. |

Evolution receipt events do **not** go through n8n. The hardened
`/api/webhooks/evolution` Next.js route is the single owner of
`SENT -> DELIVERED -> READ` transitions and their counters.

## Import order

The Message sub-workflow reference requires this import order:

1. `handle-campaign-failure.json`
2. `send-campaign-message.json`
3. `run-campaign.json`
4. `start-campaign.json`

After importing into a new n8n instance:

1. Open `Run Campaign` and select the imported `Send Campaign Message`.
2. Set `Handle Campaign Failure` as the error workflow on the other three.
3. Publish all four, with the error handler published first.
4. Confirm both `POST /webhook/campaign/start` and the internal
   `POST /webhook/campaign/run` are registered.

`Start Campaign` dispatches `Run Campaign` through its production webhook.
This keeps the runner alive independently after the start webhook returns
`202`, avoiding detached integrated executions that can terminate without
running their trigger.

The HTTP nodes call `http://nextjs:3000`, the Docker Compose service address.
Evolution credentials and the per-Operator instance token remain inside
Next.js; they are never stored in workflow JSON or execution input.

## Drift check

When a workflow changes in n8n, export the published version back to this
directory in the same change. Never edit both a legacy JSON export and a live
workflow independently.
