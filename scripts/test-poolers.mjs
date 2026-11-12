import { existsSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { config } from "dotenv";
import postgres from "postgres";

function parseArgs(argv) {
  const args = new Map();
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value = "true"] = arg.slice(2).split("=", 2);
    args.set(key, value);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const envFile =
  args.get("env-file") ??
  (existsSync(".env.vercel.local") ? ".env.vercel.local" : ".env.local");

if (envFile && existsSync(envFile)) {
  config({ path: envFile });
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const timeoutMs = Number(args.get("timeout-ms") ?? process.env.POOLER_TEST_TIMEOUT_MS ?? 15_000);
const queryTimeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));
const pipelines = (args.get("pipeline") ?? process.env.POOLER_TEST_PIPELINES ?? "100,1")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isInteger(value) && value > 0);

if (!pipelines.length) {
  console.error("At least one valid --pipeline value is required");
  process.exit(1);
}

function urlForPort(port) {
  const url = new URL(databaseUrl);
  url.port = String(port);
  return url.toString();
}

function urlMetadata(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port || "5432",
    username: decodeURIComponent(parsed.username),
  };
}

function describeError(error, depth = 0) {
  if (!error || typeof error !== "object") return String(error);

  const described = {
    name: error.name,
    message: error.message,
    code: error.code,
  };

  for (const key of ["severity", "routine", "file", "line", "column", "errno", "syscall", "address", "port"]) {
    if (error[key] !== undefined) described[key] = error[key];
  }

  if (error.cause !== undefined && depth < 4) {
    described.cause = describeError(error.cause, depth + 1);
  }

  return described;
}

async function runQuery(label, port, maxPipeline) {
  const url = urlForPort(port);
  const sql = postgres(url, {
    ssl: "require",
    prepare: false,
    max: 1,
    max_pipeline: maxPipeline,
    idle_timeout: 5,
    connect_timeout: 10,
    queue_timeout: queryTimeoutSeconds,
    query_timeout: queryTimeoutSeconds,
    cancel_timeout: 5,
    keep_alive: 60,
  });

  const started = performance.now();
  try {
    const rows = await sql`select count(*)::int as count from testimonials`;
    return {
      ok: true,
      label,
      port,
      maxPipeline,
      ...urlMetadata(url),
      durationMs: Math.round(performance.now() - started),
      count: rows[0]?.count ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      label,
      port,
      maxPipeline,
      ...urlMetadata(url),
      durationMs: Math.round(performance.now() - started),
      error: describeError(error),
    };
  } finally {
    await sql.end({ timeout: 1 }).catch(() => {});
  }
}

const endpoints = [
  { label: "transaction", port: 6543 },
  { label: "session", port: 5432 },
];

for (const endpoint of endpoints) {
  for (const maxPipeline of pipelines) {
    console.log(JSON.stringify(await runQuery(endpoint.label, endpoint.port, maxPipeline)));
  }
}
