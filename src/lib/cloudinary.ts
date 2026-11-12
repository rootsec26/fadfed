import "server-only";
import { v2 as cloudinary } from "cloudinary";

/**
 * Cloudinary direct-upload helper (server-only).
 *
 * The browser uploads files DIRECTLY to Cloudinary using a signature minted
 * here — file bytes never pass through the Next.js server, so Server Action
 * body limits and free-tier bandwidth are not a problem.
 *
 * The API secret stays server-side: it is only used to sign upload params.
 * If env vars are missing nothing throws — `isCloudinaryConfigured` is false
 * and the admin UI falls back to YouTube/Vimeo links.
 */

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

export const isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export const CLOUDINARY_CLOUD_NAME = cloudName ?? "";
export const CLOUDINARY_API_KEY = apiKey ?? "";

export const CLOUDINARY_FOLDERS = {
  video: "clinic/videos",
  thumb: "clinic/thumbnails",
} as const;

export type UploadKind = keyof typeof CLOUDINARY_FOLDERS;

export const CLOUDINARY_FORMATS: Record<UploadKind, string> = {
  video: "mp4,webm,mov",
  thumb: "jpg,png,webp",
};

export const CLOUDINARY_RESOURCE: Record<UploadKind, "video" | "image"> = {
  video: "video",
  thumb: "image",
};

/** Upload endpoint the browser POSTs to. */
export function uploadEndpoint(kind: UploadKind): string {
  return `https://api.cloudinary.com/v1_1/${cloudName}/${CLOUDINARY_RESOURCE[kind]}/upload`;
}

/**
 * Params that must be sent with the upload AND covered by the signature.
 * `timestamp` is generated per request so signatures cannot be replayed.
 */
export function paramsToSign(kind: UploadKind, timestamp: number): Record<string, string> {
  return {
    allowed_formats: CLOUDINARY_FORMATS[kind],
    folder: CLOUDINARY_FOLDERS[kind],
    timestamp: String(timestamp),
  };
}

/** SHA-1 signature over the sorted params (api_secret never leaves the server). */
export function signParams(params: Record<string, string>): string {
  if (!apiSecret) throw new Error("CLOUDINARY_API_SECRET is not configured");
  return cloudinary.utils.api_sign_request(params, apiSecret);
}

/* ───────────── Delivery URLs ───────────── */

/** Insert `q_auto` into a Cloudinary delivery URL (saves bandwidth). Idempotent. */
export function withVideoQuality(url: string): string {
  if (url.includes("/upload/q_auto/")) return url;
  return url.replace("/upload/", "/upload/q_auto/");
}

/** Insert `f_auto,q_auto` for image delivery. Idempotent. */
export function withImageQuality(url: string): string {
  if (url.includes("/upload/f_auto,q_auto/")) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
}

/**
 * Auto-generated frame thumbnail for an uploaded video (no extra asset,
 * rendered on the fly by Cloudinary). `so_auto` often grabs a black or
 * filler frame (clapperboards, test patterns), so we pin an early offset
 * (`so_2`) with auto format/quality and a sane width cap.
 * Returns null when unconfigured.
 */
export function autoVideoThumbnail(publicId: string): string | null {
  if (!isCloudinaryConfigured || !cloudName) return null;
  return `https://res.cloudinary.com/${cloudName}/video/upload/so_2,q_auto,f_auto,w_800,c_limit/${publicId}.jpg`;
}

/** Validate that a client-supplied delivery URL really belongs to our cloud. */
export function isOurCloudinaryUrl(url: string): boolean {
  return (
    isCloudinaryConfigured &&
    url.startsWith(`https://res.cloudinary.com/${cloudName}/`)
  );
}

/** Object keys we accept for videos / thumbnails (defence in depth). */
export function isOurAssetId(kind: UploadKind, publicId: string): boolean {
  return publicId.startsWith(`${CLOUDINARY_FOLDERS[kind]}/`) && !publicId.includes("..");
}

const MAX_REMOTE_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * Download a remote image (size-capped, image content-types only) and store
 * it in Cloudinary. Used to mirror provider thumbnails whose CDN URLs expire.
 * Returns null on any failure — callers treat it as "no thumbnail".
 */
export async function uploadRemoteImage(url: string, maxBytes = MAX_REMOTE_IMAGE_BYTES): Promise<{ url: string; publicId: string } | null> {
  if (!isCloudinaryConfigured) return null;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; ClinicBot/1.0)" },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) return null;
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > maxBytes) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > maxBytes) return null;

    const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
    const up = await new Promise<{ secure_url?: string; public_id?: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: CLOUDINARY_FOLDERS.thumb, resource_type: "image", format: ext, overwrite: false },
        (err, result) => (err ? reject(err) : resolve(result ?? {})),
      );
      stream.end(buf);
    });
    if (!up.secure_url || !up.public_id) return null;
    return { url: withImageQuality(up.secure_url), publicId: up.public_id };
  } catch (e) {
    console.error("[cloudinary] remote image mirror failed", e instanceof Error ? e.message : e);
    return null;
  }
}

/* ───────────── Deletion ───────────── */

/**
 * Delete an asset from Cloudinary. Returns false on failure — callers should
 * log and continue (a storage leak is better than a crashed delete).
 */
export async function destroyAsset(publicId: string | null | undefined, resourceType: "video" | "image"): Promise<boolean> {
  if (!publicId || !isCloudinaryConfigured || !publicId.startsWith("clinic/")) return true;
  try {
    const res = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return res.result === "ok" || res.result === "not found";
  } catch (e) {
    console.error(`[cloudinary] destroy failed for ${resourceType} asset`, e instanceof Error ? e.message : e);
    return false;
  }
}
