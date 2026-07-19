import pg from "pg";

const { Client } = pg;
const databases = ["send_a_zap", "n8n_send_a_zap"];

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set in .env`);
  }
  return value;
}

const client = new Client({
  host: requiredEnvironment("POSTGRES_HOST"),
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: requiredEnvironment("POSTGRES_USER"),
  password: requiredEnvironment("POSTGRES_PASSWORD"),
  database: "postgres",
});

await client.connect();

try {
  for (const database of databases) {
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [database],
    );

    if (result.rowCount === 0) {
      await client.query(`CREATE DATABASE "${database}"`);
      console.log(`Created database ${database}`);
    } else {
      console.log(`Database ${database} already exists`);
    }
  }
} finally {
  await client.end();
}
