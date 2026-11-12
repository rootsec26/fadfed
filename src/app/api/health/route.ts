export const dynamic = "force-dynamic";
export const maxDuration = 15;

/**
 * Public health check. Returns ONLY { ok } — never error details, counts, or
 * internals — so it can't be used to probe the database or leak config.
 */
export async function GET() {
  try {
    // Lazy import so a missing DATABASE_URL or module-level db failure
    // returns JSON instead of a 500 HTML error page.
    const { db } = await import("@/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
