import { spawn } from "node:child_process";

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

function buildDatabaseUrl() {
  const url = new URL("postgresql://localhost/send_a_zap");
  url.hostname = requiredEnvironment("POSTGRES_HOST");
  url.port = process.env.POSTGRES_PORT || "5432";
  url.username = requiredEnvironment("POSTGRES_USER");
  url.password = requiredEnvironment("POSTGRES_PASSWORD");
  url.searchParams.set("schema", "public");
  return url.toString();
}

async function assertEvolutionGoIsReachable() {
  const baseUrl = requiredEnvironment("EVOLUTION_API_URL");
  const healthUrl = new URL("/server/ok", `${baseUrl.replace(/\/$/, "")}/`);
  const response = await fetch(healthUrl, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(
      `Evolution Go health check failed with status ${response.status}`,
    );
  }
}

function run(command, args, environment) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: environment,
      stdio: "inherit",
    });

    const forwardSigint = () => child.kill("SIGINT");
    const forwardSigterm = () => child.kill("SIGTERM");
    process.once("SIGINT", forwardSigint);
    process.once("SIGTERM", forwardSigterm);

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      process.removeListener("SIGINT", forwardSigint);
      process.removeListener("SIGTERM", forwardSigterm);

      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `${command} ${args.join(" ")} exited with ${signal || code}`,
          ),
        );
      }
    });
  });
}

await assertEvolutionGoIsReachable();

const environment = {
  ...process.env,
  DATABASE_URL: buildDatabaseUrl(),
};

await run("corepack", ["enable", "pnpm"], environment);
await run("pnpm", ["install", "--frozen-lockfile"], environment);
await run("pnpm", ["run", "db:migrate:deploy"], environment);
await run("pnpm", ["run", "dev"], environment);
