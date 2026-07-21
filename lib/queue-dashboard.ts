import { createHash, timingSafeEqual } from "node:crypto";
import type { Server } from "node:http";

import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import type { Queue } from "bullmq";
import express, { type NextFunction, type Request, type Response } from "express";

export const QUEUE_DASHBOARD_BASE_PATH = "/queues";
const AUTH_REALM = "Send-a-Zap Queue Dashboard";

export type QueueDashboardCredentials = {
  username: string;
  password: string;
};

type QueueDashboardOptions = {
  queue: Queue;
  credentials: QueueDashboardCredentials;
};

type StartQueueDashboardOptions = QueueDashboardOptions & {
  host?: string;
  port?: number;
};

function requireCredential(value: string, name: string) {
  if (!value.trim()) {
    throw new Error(`${name} must be configured`);
  }

  return value;
}

function constantTimeEqual(left: string, right: string) {
  const digest = (value: string) =>
    createHash("sha256").update(value, "utf8").digest();

  return timingSafeEqual(digest(left), digest(right));
}

function parseBasicCredentials(authorization: string | undefined) {
  const match = authorization?.match(/^Basic ([A-Za-z0-9+/]+={0,2})$/i);
  if (!match) {
    return null;
  }

  const decoded = Buffer.from(match[1], "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 0) {
    return null;
  }

  return {
    username: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  };
}

function basicAuth(credentials: QueueDashboardCredentials) {
  const expectedUsername = requireCredential(
    credentials.username,
    "QUEUE_DASHBOARD_USERNAME",
  );
  const expectedPassword = requireCredential(
    credentials.password,
    "QUEUE_DASHBOARD_PASSWORD",
  );

  return (request: Request, response: Response, next: NextFunction) => {
    const supplied = parseBasicCredentials(request.header("authorization"));
    const validUsername = constantTimeEqual(
      supplied?.username ?? "",
      expectedUsername,
    );
    const validPassword = constantTimeEqual(
      supplied?.password ?? "",
      expectedPassword,
    );

    if (!(validUsername && validPassword)) {
      response.setHeader(
        "WWW-Authenticate",
        `Basic realm="${AUTH_REALM}", charset="UTF-8"`,
      );
      response.status(401).send("Authentication required");
      return;
    }

    next();
  };
}

export function createQueueDashboardApp({
  queue,
  credentials,
}: QueueDashboardOptions) {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(QUEUE_DASHBOARD_BASE_PATH);

  createBullBoard({
    queues: [
      new BullMQAdapter(queue, {
        readOnlyMode: true,
        description: "Campaign runner jobs",
      }),
    ],
    serverAdapter,
    options: {
      uiConfig: {
        boardTitle: AUTH_REALM,
        hideRedisDetails: true,
      },
    },
  });

  const app = express();
  app.disable("x-powered-by");
  app.use(QUEUE_DASHBOARD_BASE_PATH, basicAuth(credentials));
  app.use(QUEUE_DASHBOARD_BASE_PATH, (request, response, next) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.status(405).json({ error: "Queue dashboard is read-only" });
      return;
    }

    next();
  });
  app.use(QUEUE_DASHBOARD_BASE_PATH, serverAdapter.getRouter());

  return app;
}

export function startQueueDashboard({
  queue,
  credentials,
  host = "127.0.0.1",
  port = 3001,
}: StartQueueDashboardOptions): Server {
  return createQueueDashboardApp({ queue, credentials }).listen(port, host, () => {
    console.log(
      `Read-only queue dashboard listening on http://${host}:${port}${QUEUE_DASHBOARD_BASE_PATH}`,
    );
  });
}
