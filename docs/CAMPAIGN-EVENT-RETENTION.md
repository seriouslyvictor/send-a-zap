# Campaign event retention

`CampaignEvent` is the append-only audit trail for Campaign runner activity. New
rows are never updated. Retention removes whole rows only after they age out.

The retention window is controlled by `CAMPAIGN_EVENT_RETENTION_DAYS` and
defaults to 30 days. Invalid or non-positive values fall back to 30 days.

Pruning is bounded in two ways:

- The campaign observer opportunistically deletes expired rows after a
  successful audit write, at most once per process every 24 hours.
- Operators can run `pnpm run events:prune` for an immediate prune. Schedule
  this command daily in the deployment platform as a backstop for periods with
  no Campaign activity.

Pruning failures are best-effort. They emit a structured warning but never
interrupt a Message send or Campaign run. The `created_at` index keeps the
retention delete bounded to expired rows.
