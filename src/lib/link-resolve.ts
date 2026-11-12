import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { resolveVideoLink, type VideoProvider } from "@/lib/video-link";
import { isCloudinaryConfigured, uploadRemoteImage } from "@/lib/cloudinary";

/**
 * Server-only helpers for social/video links:
 *  - resolveShareLink(): follows redirects for KNOWN short-link hosts only
 *    (SSRF-safe: fixed allowlist, ≤3 hops, 5s timeout, private-IP check).
 *  - fetchProviderThumb(): pulls a thumbnail via the provider's public
 *    oEmbed endpoint, then mirrors it to Cloudinary (CDN thumb URLs expire,
 *    so we never hotlink them).
 *
 * Everything here is fail-safe: callers fall back to "no thumbnail" /
 * external card instead of crashing the save.
 */

const RESOLVE_HOSTS = /(^|\.)(tiktok\.com|tiktokv\.com|facebook\.com|fb\.com|fb\.watch|fb\.me|instagram\.com|instagr\.am)$/;
const MAX_HOPS = 3;
const TIMEOUT_MS = 5000;
const MAX_THUMB_BYTES = 2 * 1024 * 1024;

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    return v === "::1" || v.startsWith("fe80") || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("::ffff:");
  }
  return true; // not an IP → treat as unsafe
}

async function hostIsPublic(hostname: string): Promise<boolean> {
  try {
    const { address } = await lookup(hostname);
    return !isPrivateIp(address);
  } catch {
    return false;
  }
}

/**
 * Resolve a short/share URL to its canonical destination.
 * Only hosts matching RESOLVE_HOSTS are ever fetched; every redirect target
 * is re-checked against the same allowlist + public-IP check.
 * Returns the final URL string, or null on any failure.
 */
export async function resolveShareLink(rawUrl: string): Promise<string | null> {
  let current = rawUrl;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    let u: URL;
    try {
      u = new URL(current);
    } catch {
      return null;
    }
    if (u.protocol !== "https:" || u.username || u.password) return null;
    const host = u.hostname.toLowerCase();
    if (!RESOLVE_HOSTS.test(host)) return null;
    if (!(await hostIsPublic(host))) return null;

    let res: Response;
    try {
      res = await fetch(u.toString(), {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "user-agent": "Mozilla/5.0 (compatible; ClinicBot/1.0)" },
      });
    } catch {
      return null;
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      try {
        current = new URL(loc, u).toString();
      } catch {
        return null;
      }
      continue;
    }
    // 200 → this is the final page (or an interstitial; the caller re-parses
    // and falls back to an external card if it still isn't a video URL).
    return current;
  }
  return null; // too many hops
}

/** Providers that expose a usable public oEmbed thumbnail. */
const OEMBED: Partial<Record<VideoProvider, (url: string) => string>> = {
  tiktok: (url) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
  facebook: (url) => `https://www.facebook.com/plugins/video_oembed.json?url=${encodeURIComponent(url)}`,
};

/** Instagram has no keyless oEmbed — try the public embed page's og:image. */
async function instagramThumb(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "Mozilla/5.0 (compatible; ClinicBot/1.0)" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Fetch a provider thumbnail URL (oEmbed / og:image). Null on any failure. */
export async function fetchProviderThumb(provider: VideoProvider, canonicalUrl: string): Promise<string | null> {
  try {
    if (provider === "instagram") return await instagramThumb(canonicalUrl);
    const endpoint = OEMBED[provider];
    if (!endpoint) return null;
    const res = await fetch(endpoint(canonicalUrl), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "Mozilla/5.0 (compatible; ClinicBot/1.0)" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail_url?: string; thumbnailUrl?: string };
    return data.thumbnail_url ?? data.thumbnailUrl ?? null;
  } catch {
    return null;
  }
}

/**
 * Best-effort thumbnail for a link source: fetch the provider thumb and
 * mirror it into Cloudinary (they expire). Returns null when unavailable —
 * the admin can always upload a thumbnail manually.
 */
export async function mirrorProviderThumb(provider: VideoProvider, canonicalUrl: string): Promise<{ url: string; publicId: string } | null> {
  if (!isCloudinaryConfigured) return null;
  const thumbUrl = await fetchProviderThumb(provider, canonicalUrl);
  if (!thumbUrl) return null;
  // Only fetch image CDNs we trust-ish; the URL comes from the provider's
  // own oEmbed response, but still enforce https + size + content-type.
  try {
    const u = new URL(thumbUrl);
    if (u.protocol !== "https:") return null;
  } catch {
    return null;
  }
  return uploadRemoteImage(thumbUrl, MAX_THUMB_BYTES);
}

/** Re-resolve a stored/needs-resolve link fully (used by saveVideo). */
export async function resolveLinkFully(rawUrl: string) {
  const first = resolveVideoLink(rawUrl);
  if (!first.ok) return first;
  if (!first.needsResolve) return first;
  const resolved = await resolveShareLink(first.url);
  if (!resolved) {
    // Couldn't resolve — keep it as an external card for this provider.
    return { ...first, embedUrl: null, external: true, needsResolve: false } as const;
  }
  const second = resolveVideoLink(resolved);
  if (!second.ok) {
    return { ...first, url: resolved, embedUrl: null, external: true, needsResolve: false } as const;
  }
  return second;
}
