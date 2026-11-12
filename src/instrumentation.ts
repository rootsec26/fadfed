/**
 * Runs once per server instance at startup (NOT per request). This is where
 * first-run seeding and admin-account provisioning belong — getSettings()
 * used to call ensureSeed() on every public page, which put DB writes in the
 * request path of every cold start.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureSeed } = await import("@/db/seed");
    // ensureSeed() never rejects (all paths catch internally). Not awaited:
    // a slow/unreachable DB must not delay server startup; it retries on the
    // next cold start and getSettings() self-heals the settings row anyway.
    void ensureSeed();
  }
}
