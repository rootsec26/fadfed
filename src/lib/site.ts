/**
 * Canonical public origin of the site. NEXT_PUBLIC_SITE_URL is the
 * Vercel-friendly variable (safe to expose); APP_URL is kept as a
 * server-side fallback for notification links and OAuth redirects.
 */
export function getSiteUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_URL;
  return url?.replace(/\/+$/, "");
}
