/**
 * Smart video-link resolver (isomorphic — safe for client + server).
 *
 * Accepts ANY https link and classifies it:
 *   youtube | vimeo | tiktok | instagram | facebook | direct | external
 *
 * SECURITY: embed URLs are built ONLY from extracted IDs/paths with
 * hardcoded hosts — the user-supplied URL is never placed in an iframe src.
 * Short links (vm.tiktok.com, fb.watch, share links) are flagged
 * `needsResolve` and are resolved server-side by link-resolve.ts (SSRF-safe).
 */

export type VideoProvider =
  | "youtube"
  | "vimeo"
  | "tiktok"
  | "instagram"
  | "facebook"
  | "direct"
  | "external";

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5";

export type LinkError = "invalid" | "protocol" | "credentials" | "too_long";

export type ResolvedLink =
  | {
      ok: true;
      /** Normalized https URL (canonical when the provider allows it). */
      url: string;
      provider: VideoProvider;
      /** iframe/player URL — null means "do not embed". */
      embedUrl: string | null;
      aspectRatio: AspectRatio;
      /** True → render the external "watch on site" card instead of an embed. */
      external: boolean;
      /** Server must resolve a short/share link before we can embed. */
      needsResolve: boolean;
      /** True when the URL itself is a playable video file. */
      isFile: boolean;
      domain: string;
      /** Free auto-thumbnail URL when the provider exposes a stable one. */
      thumbnailUrl?: string | null;
    }
  | { ok: false; error: LinkError };

const MAX_URL_LEN = 2048;
const FILE_EXT = /\.(mp4|webm|mov)(\?.*)?$/i;

const YT_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "www.youtu.be"]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);
const TIKTOK_HOSTS = /(^|\.)(tiktok\.com|tiktokv\.com|tiktokcdn\.com)$/;
const IG_HOSTS = /(^|\.)(instagram\.com|instagr\.am)$/;
const FB_HOSTS = /(^|\.)(facebook\.com|fb\.com|fb\.watch|fb\.me)$/;

/** Hosts that produce short/share links requiring server-side resolution. */
const SHORT_LINK_HOSTS = new Set(["vm.tiktok.com", "vt.tiktok.com", "fb.watch", "fb.me"]);

function hostIs(host: string, set: Set<string> | RegExp): boolean {
  return set instanceof RegExp ? set.test(host) : set.has(host);
}

function ytId(u: URL): string | null {
  const host = u.hostname.toLowerCase();
  if (host === "youtu.be" || host === "www.youtu.be") return u.pathname.slice(1).split("/")[0] || null;
  if (host.endsWith("youtube.com")) {
    if (u.pathname === "/watch") return u.searchParams.get("v");
    const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{6,20})/);
    if (m) return m[2];
  }
  return null;
}

function vimeoId(u: URL): string | null {
  const host = u.hostname.toLowerCase();
  if (!VIMEO_HOSTS.has(host)) return null;
  const m = u.pathname.match(/\/(\d{6,12})(?:[/?#]|$)/);
  return m?.[1] ?? null;
}

function tiktokId(u: URL): string | null {
  const host = u.hostname.toLowerCase();
  if (host === "vm.tiktok.com" || host === "vt.tiktok.com") return null; // needs resolve
  const m = u.pathname.match(/\/video\/(\d{6,25})/);
  return m?.[1] ?? null;
}

function instagramCode(u: URL): { kind: "reel" | "p" | "tv"; code: string } | null {
  const m = u.pathname.match(/^\/(reel|p|tv)\/([A-Za-z0-9_-]{4,64})/);
  if (!m) return null;
  return { kind: m[1] as "reel" | "p" | "tv", code: m[2] };
}

function isSharePath(u: URL): boolean {
  return /\/(share|share\/|t\/|reel\/?$)/.test(u.pathname) || u.pathname.startsWith("/share");
}

function ok(partial: Omit<Extract<ResolvedLink, { ok: true }>, "ok" | "domain" | "isFile" | "external"> & {
  external?: boolean;
  isFile?: boolean;
}): ResolvedLink {
  const url = partial.url;
  let domain = "";
  try {
    domain = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    domain = "";
  }
  return { ok: true, domain, external: false, isFile: false, ...partial };
}

/**
 * Resolve a user-pasted link into a render descriptor.
 * Returns { ok:false } for anything unsafe or malformed.
 */
export function resolveVideoLink(raw: string): ResolvedLink {
  let s = (raw ?? "").trim();
  if (!s) return { ok: false, error: "invalid" };
  if (s.length > MAX_URL_LEN) return { ok: false, error: "too_long" };
  // Scheme-less input like "tiktok.com/@x/video/123" → https://
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) s = `https://${s}`;

  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return { ok: false, error: "invalid" };
  }
  if (u.protocol !== "https:") return { ok: false, error: "protocol" };
  if (u.username || u.password) return { ok: false, error: "credentials" };

  const host = u.hostname.toLowerCase();

  // 1) Direct video file — playable natively, no embed.
  if (FILE_EXT.test(u.pathname)) {
    return ok({
      url: u.toString(),
      provider: "direct",
      embedUrl: u.toString(),
      aspectRatio: "16:9",
      isFile: true,
      needsResolve: false,
    });
  }

  // 2) YouTube
  if (hostIs(host, YT_HOSTS)) {
    const id = ytId(u);
    if (id && /^[\w-]{6,20}$/.test(id)) {
      return ok({
        url: `https://www.youtube.com/watch?v=${id}`,
        provider: "youtube",
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
        aspectRatio: "16:9",
        thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        needsResolve: false,
      });
    }
    return { ok: false, error: "invalid" };
  }

  // 3) Vimeo
  if (hostIs(host, VIMEO_HOSTS)) {
    const id = vimeoId(u);
    if (id) {
      return ok({
        url: u.toString(),
        provider: "vimeo",
        embedUrl: `https://player.vimeo.com/video/${id}`,
        aspectRatio: "16:9",
        thumbnailUrl: `https://vumbnail.com/${id}.jpg`,
        needsResolve: false,
      });
    }
    return { ok: false, error: "invalid" };
  }

  // 4) TikTok — canonical video URL or short link (server resolves).
  if (hostIs(host, TIKTOK_HOSTS)) {
    const id = tiktokId(u);
    const short = SHORT_LINK_HOSTS.has(host) || u.pathname.startsWith("/t/") || u.pathname.startsWith("/share");
    if (id) {
      const canonical = `https://www.tiktok.com/@${u.pathname.split("@")[1]?.split("/")[0] ?? ""}/video/${id}`;
      const safeCanonical = canonical.includes("/@") && !canonical.includes("//") ? canonical : u.toString();
      return ok({
        url: safeCanonical,
        provider: "tiktok",
        embedUrl: `https://www.tiktok.com/embed/v2/${id}`,
        aspectRatio: "9:16",
        needsResolve: false,
      });
    }
    if (short) {
      // Can't build an embed without the video id — resolve server-side.
      return ok({
        url: u.toString(),
        provider: "tiktok",
        embedUrl: null,
        aspectRatio: "9:16",
        needsResolve: true,
      });
    }
    return ok({
      url: u.toString(),
      provider: "tiktok",
      embedUrl: null,
      aspectRatio: "9:16",
      external: true,
      needsResolve: false,
    });
  }

  // 5) Instagram — reel/p/tv embed; share links need resolution.
  if (hostIs(host, IG_HOSTS)) {
    const code = instagramCode(u);
    if (code) {
      return ok({
        url: u.toString(),
        provider: "instagram",
        embedUrl: `https://www.instagram.com/${code.kind}/${code.code}/embed`,
        aspectRatio: code.kind === "reel" ? "9:16" : "4:5",
        needsResolve: false,
      });
    }
    if (isSharePath(u) || u.pathname.includes("/share")) {
      return ok({
        url: u.toString(),
        provider: "instagram",
        embedUrl: null,
        aspectRatio: "9:16",
        needsResolve: true,
      });
    }
    return ok({
      url: u.toString(),
      provider: "instagram",
      embedUrl: null,
      aspectRatio: "4:5",
      external: true,
      needsResolve: false,
    });
  }

  // 6) Facebook — video/reel/watch URLs embed via the official plugin.
  if (hostIs(host, FB_HOSTS)) {
    const isVideo =
      /\/(videos|reel|watch)\//.test(u.pathname) ||
      u.pathname === "/watch" ||
      /[?&]v=\d+/.test(u.search) ||
      SHORT_LINK_HOSTS.has(host) ||
      isSharePath(u);
    if (isVideo) {
      const short = SHORT_LINK_HOSTS.has(host) || isSharePath(u);
      return ok({
        url: u.toString(),
        provider: "facebook",
        embedUrl: short ? null : `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u.toString())}&show_text=false`,
        aspectRatio: u.pathname.includes("/reel") ? "9:16" : "16:9",
        needsResolve: short,
        external: false,
      });
    }
    return ok({
      url: u.toString(),
      provider: "facebook",
      embedUrl: null,
      aspectRatio: "16:9",
      external: true,
      needsResolve: false,
    });
  }

  // 7) Anything else — never embed, show the external card.
  return ok({
    url: u.toString(),
    provider: "external",
    embedUrl: null,
    aspectRatio: "16:9",
    external: true,
    needsResolve: false,
  });
}

/** Provider → friendly label key suffix (admin list + badges). */
export const PROVIDER_LABEL: Record<VideoProvider, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  direct: "MP4",
  external: "External",
};
