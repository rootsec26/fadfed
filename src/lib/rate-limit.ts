import "server-only";

/**
 * In-memory fixed-window rate limiter. Good enough for a single-admin
 * clinic on a free tier — it resets on deploy and is per-instance, which
 * is fine here. Swap for Redis/Upstash if the app ever scales horizontally.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

/** Best-effort client IP for rate-limit keys (falls back to a constant). */
export async function clientKey(prefix: string): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "local";
    return `${prefix}:${ip}`;
  } catch {
    return `${prefix}:local`;
  }
}

/** Test helper — clears all buckets (used by tests, harmless in prod). */
export function _resetRateLimits() {
  buckets.clear();
}
