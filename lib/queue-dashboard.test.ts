// @vitest-environment node

import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import type { Queue } from "bullmq";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createQueueDashboardApp } from "@/lib/queue-dashboard";

const credentials = {
  username: "operator",
  password: "correct horse battery staple",
};

function basicAuth(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function createQueueStub() {
  const clean = vi.fn();
  const queue = {
    metaValues: { version: "bullmq:test" },
    name: "campaign-runs",
    clean,
    getJobCounts: vi.fn(async () => ({
      active: 1,
      waiting: 2,
      delayed: 3,
      failed: 4,
    })),
    getJobs: vi.fn(async () => []),
    isPaused: vi.fn(async () => false),
  } as unknown as Queue;

  return { queue, clean };
}

async function listen(app: ReturnType<typeof createQueueDashboardApp>) {
  const server = await new Promise<Server>((resolve) => {
    const listeningServer = app.listen(0, "127.0.0.1", () => {
      resolve(listeningServer);
    });
  });
  const address = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${address.port}/queues`,
    server,
  };
}

describe("queue dashboard HTTP boundary", () => {
  const servers: Server[] = [];

  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map(
        (server) =>
          new Promise<void>((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
          }),
      ),
    );
  });

  it("requires valid Basic credentials", async () => {
    const { queue } = createQueueStub();
    const { baseUrl, server } = await listen(
      createQueueDashboardApp({ queue, credentials }),
    );
    servers.push(server);

    const missingCredentials = await fetch(baseUrl);
    const invalidCredentials = await fetch(baseUrl, {
      headers: { authorization: basicAuth("operator", "wrong") },
    });
    const authenticated = await fetch(baseUrl, {
      headers: { authorization: basicAuth(credentials.username, credentials.password) },
    });

    expect(missingCredentials.status).toBe(401);
    expect(missingCredentials.headers.get("www-authenticate")).toBe(
      'Basic realm="Send-a-Zap Queue Dashboard", charset="UTF-8"',
    );
    expect(invalidCredentials.status).toBe(401);
    expect(authenticated.status).toBe(200);
    expect(await authenticated.text()).toContain("Send-a-Zap Queue Dashboard");
  });

  it("shows operational job states while rejecting mutations", async () => {
    const { queue, clean } = createQueueStub();
    const { baseUrl, server } = await listen(
      createQueueDashboardApp({ queue, credentials }),
    );
    servers.push(server);
    const headers = {
      authorization: basicAuth(credentials.username, credentials.password),
    };

    const queueResponse = await fetch(`${baseUrl}/api/queues`, { headers });
    const mutationResponse = await fetch(
      `${baseUrl}/api/queues/campaign-runs/clean/failed`,
      { method: "PUT", headers },
    );
    const payload = await queueResponse.json();

    expect(queueResponse.status).toBe(200);
    expect(payload.queues[0].statuses).toEqual(
      expect.arrayContaining(["waiting", "active", "delayed", "failed"]),
    );
    expect(payload.queues[0].readOnlyMode).toBe(true);
    expect(mutationResponse.status).toBe(405);
    expect(clean).not.toHaveBeenCalled();
  });
});
