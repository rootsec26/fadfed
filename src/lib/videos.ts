import { z } from "zod";
import { resolveVideoLink, type AspectRatio, type VideoProvider } from "@/lib/video-link";

/**
 * Video helpers shared by admin actions and public pages.
 *
 * Link parsing lives in ./video-link (any-provider resolver) and short-link /
 * thumbnail resolution in ./link-resolve (server-only). Direct uploads go to
 * Cloudinary via signed direct upload — only metadata rows (public_id +
 * delivery URLs) are stored in Postgres, never the file itself.
 */

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_THUMB_BYTES = 2 * 1024 * 1024; // 2 MB before client compression

export const VIDEO_MIME = ["video/mp4", "video/webm", "video/quicktime"] as const;
export const THUMB_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

/* ───────────── Public rendering ───────────── */

export type VideoKind = "upload" | VideoProvider;

export type PublicVideoView =
  | { kind: "iframe"; embedUrl: string; provider: VideoProvider; aspect: AspectRatio }
  | { kind: "video"; src: string; provider: VideoKind; aspect: AspectRatio }
  | { kind: "external"; url: string; domain: string; provider: VideoKind; aspect: AspectRatio };

/**
 * Turn a DB row into a render descriptor for the public site.
 * - upload / direct file → native <video>
 * - youtube/vimeo/tiktok/instagram/facebook → privacy facade iframe
 * - external / unresolvable → "watch on site" card (never iframes user URLs)
 */
export function publicVideoView(v: { sourceType: string; videoUrl: string }): PublicVideoView | null {
  if (v.sourceType === "upload") {
    return { kind: "video", src: v.videoUrl, provider: "upload", aspect: "16:9" };
  }
  const r = resolveVideoLink(v.videoUrl);
  if (!r.ok) {
    return { kind: "external", url: v.videoUrl, domain: safeDomain(v.videoUrl), provider: v.sourceType as VideoProvider, aspect: "16:9" };
  }
  if (r.isFile) return { kind: "video", src: r.url, provider: "direct", aspect: r.aspectRatio };
  if (!r.external && r.embedUrl) {
    return { kind: "iframe", embedUrl: r.embedUrl, provider: r.provider, aspect: r.aspectRatio };
  }
  return { kind: "external", url: r.url, domain: r.domain || safeDomain(v.videoUrl), provider: r.provider, aspect: r.aspectRatio };
}

/* ───────────── Thumbnails ───────────── */

/** Fixed crop per display aspect for Cloudinary auto-frame thumbnails. */
const THUMB_CROP: Record<AspectRatio, { w: number; h: number }> = {
  "16:9": { w: 800, h: 450 },
  "9:16": { w: 450, h: 800 },
  "1:1": { w: 640, h: 640 },
  "4:5": { w: 640, h: 800 },
};

/**
 * Normalize a stored thumbnail URL for display.
 * - Cloudinary auto-frame thumbs (`so_auto`) often catch a black/filler frame —
 *   rewrite them to a fixed early offset (`so_2`) with f_auto/q_auto and a
 *   crop matching the video aspect.
 * - Everything else (YouTube, Vimeo, uploaded images, mirrored provider
 *   thumbs) passes through untouched.
 */
export function displayThumbUrl(url: string | null | undefined, aspect: AspectRatio): string | null {
  if (!url) return null;
  if (!url.includes("res.cloudinary.com/") || !url.includes("/video/upload/")) return url;
  const { w, h } = THUMB_CROP[aspect];
  const next = `/video/upload/so_2,q_auto,f_auto,c_fill,w_${w},h_${h}/`;
  // Legacy auto thumbs stored as `.../video/upload/so_auto,q_auto/<id>.jpg`.
  if (url.includes("/video/upload/so_auto")) {
    return url.replace(/\/video\/upload\/so_auto[^/]*\//, next);
  }
  // Untouched delivery URLs (`/video/upload/<public_id>`) get transforms too.
  if (/\/video\/upload\/[^/,]+\//.test(url)) {
    return url.replace("/video/upload/", next);
  }
  return url;
}

function safeDomain(raw: string): string {
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/* ───────────── Validation ───────────── */

export const videoInputSchema = z
  .object({
    titleAr: z.string().trim().min(2, "required").max(200),
    titleEn: z.string().trim().max(200).optional(),
    descriptionAr: z.string().trim().max(2000).optional(),
    descriptionEn: z.string().trim().max(2000).optional(),
    category: z.string().trim().max(80).optional(),
    durationSeconds: z.coerce.number().int().min(0).max(86400).optional(),
    isPublished: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
  })
  .strict();

export type VideoInput = z.infer<typeof videoInputSchema>;

export const uploadKindSchema = z.enum(["video", "thumb"]);
export type UploadKind = z.infer<typeof uploadKindSchema>;

export function extFor(kind: UploadKind, contentType: string): string {
  if (kind === "thumb") {
    if (contentType === "image/png") return "png";
    if (contentType === "image/webp") return "webp";
    return "jpg";
  }
  if (contentType === "video/webm") return "webm";
  if (contentType === "video/quicktime") return "mov";
  return "mp4";
}
