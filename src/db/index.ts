import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __postgresClient?: postgres.Sql;
};

// postgres.js is used (instead of node-postgres) because Supabase's
// Transaction Pooler (port 6543) requires `prepare: false` — prepared
// statements are not supported in transaction mode. Keep the pool small for
// serverless instances and cache it on globalThis so `next dev` hot-reloads
// don't leak connections.
const isServerless = !!process.env.VERCEL || process.env.NODE_ENV === "production";

export const sqlClient =
  globalForDb.__postgresClient ??
  postgres(databaseUrl, {
    ssl: "require",
    prepare: false,
    max: 3,
    idle_timeout: isServerless ? 20 : 60,
    connect_timeout: 10,
    // Supavisor transaction mode can drop pipelined query responses.
    max_pipeline: 1,
    // The pooler drops idle TCP connections; keepAlive avoids handing out
    // dead sockets and makes checkout fail fast instead of hanging.
    keep_alive: 60,
  });

// Cache on globalThis in every environment: serverless instances reuse the
// module anyway, and this keeps `next dev` hot-reloads from leaking
// connections too.
globalForDb.__postgresClient = sqlClient;

export const db = drizzle(sqlClient);
