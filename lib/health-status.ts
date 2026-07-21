/**
 * Health Status
 *
 * Shapes the payload served by GET /api/health, which the container's
 * Docker HEALTHCHECK polls.
 *
 * The check is a liveness signal, not a readiness one: a database outage is
 * reported as degraded but still counts as serving, because restarting
 * Next.js cannot bring the database back and a failing HEALTHCHECK would put
 * the container into a pointless restart loop.
 */

export type HealthStatus = {
  status: "ok" | "degraded";
  serving: true;
  database: "up" | "down";
  timestamp: string;
};

export function buildHealthStatus({
  databaseReachable,
}: {
  databaseReachable: boolean;
}): HealthStatus {
  return {
    status: databaseReachable ? "ok" : "degraded",
    serving: true,
    database: databaseReachable ? "up" : "down",
    timestamp: new Date().toISOString(),
  };
}
