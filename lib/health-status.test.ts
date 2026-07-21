import { describe, expect, it } from "vitest";

import { buildHealthStatus } from "./health-status";

describe("buildHealthStatus", () => {
  it("reports ok when the database answered", () => {
    expect(buildHealthStatus({ databaseReachable: true })).toMatchObject({
      status: "ok",
      database: "up",
    });
  });

  it("reports degraded when the database did not answer", () => {
    expect(buildHealthStatus({ databaseReachable: false })).toMatchObject({
      status: "degraded",
      database: "down",
    });
  });

  it("stays serving-healthy when the database is down so the container is not restarted", () => {
    // The Docker HEALTHCHECK consumes this endpoint. Restarting Next.js cannot
    // fix a database outage, so a degraded report must not fail the check.
    expect(buildHealthStatus({ databaseReachable: false }).serving).toBe(true);
  });

  it("timestamps the report in ISO-8601", () => {
    const { timestamp } = buildHealthStatus({ databaseReachable: true });

    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });
});
