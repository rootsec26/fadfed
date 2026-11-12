export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  try {
    // Lazy import so a missing DATABASE_URL or module-level db failure
    // returns JSON instead of a 500 HTML error page.
    const { db } = await import("@/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
