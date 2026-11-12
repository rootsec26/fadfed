"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { and, asc, desc, eq, gt, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { requireDoctor } from "@/lib/auth";
import {
  autoVideoThumbnail,
  CLOUDINARY_API_KEY,
  CLOUDINARY_CLOUD_NAME,
  destroyAsset,
  isCloudinaryConfigured,
  isOurAssetId,
  isOurCloudinaryUrl,
  paramsToSign,
  signParams,
  uploadEndpoint,
  withImageQuality,
  withVideoQuality,
  type UploadKind,
} from "@/lib/cloudinary";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  MAX_THUMB_BYTES,
  MAX_VIDEO_BYTES,
  THUMB_MIME,
  uploadKindSchema,
  VIDEO_MIME,
  videoInputSchema,
} from "@/lib/videos";
import { resolveLinkFully, mirrorProviderThumb } from "@/lib/link-resolve";
import type { VideoProvider } from "@/lib/video-link";

/**
 * Doctor-only video management. EVERY action calls requireDoctor() first —
 * the UI hiding a button is never the security boundary.
 *
 * Files never pass through these actions: the browser uploads directly to
 * Cloudinary with a signature minted by signUpload(); only metadata rows
 * (public_id + delivery URLs) are written here.
 */

export type ActionResult = { ok: true; id?: number } | { ok: false; error: string };

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
const refresh = () => {
  revalidateTag("videos", "max");
  revalidatePath("/");
  revalidatePath("/dashboard/videos");
  revalidatePath("/dashboard");
  revalidatePath("/videos");
  revalidatePath("/home");
};

/* ───────────── Signed upload params ───────────── */

const SIGNATURES_PER_HOUR = 60;

export type UploadSignature =
  | {
      ok: true;
      uploadUrl: string;
      apiKey: string;
      cloudName: string;
      folder: string;
      resourceType: "video" | "image";
      allowedFormats: string;
      timestamp: number;
      signature: string;
    }
  | { ok: false; error: string };

/**
 * Mint a Cloudinary upload signature. Returns ONLY signing params — the
 * file itself is POSTed by the browser straight to Cloudinary.
 */
export async function signUpload(kind: unknown, contentType: unknown, size: unknown): Promise<UploadSignature> {
  const user = await requireDoctor();
  if (!isCloudinaryConfigured) return { ok: false, error: "storage_disabled" };
  if (!rateLimit(`sign:${user.id}:${await clientKey("sign")}`, SIGNATURES_PER_HOUR, 60 * 60 * 1000)) {
    return { ok: false, error: "rate_limited" };
  }

  const k = uploadKindSchema.safeParse(kind);
  const ct = typeof contentType === "string" ? contentType : "";
  const sz = typeof size === "number" ? size : Number(size);
  if (!k.success) return { ok: false, error: "bad_kind" };

  const allowed = k.data === "video" ? VIDEO_MIME : THUMB_MIME;
  const max = k.data === "video" ? MAX_VIDEO_BYTES : MAX_THUMB_BYTES;
  if (!allowed.includes(ct as never)) return { ok: false, error: "bad_type" };
  if (!Number.isFinite(sz) || sz <= 0 || sz > max) return { ok: false, error: "too_large" };

  const timestamp = Math.floor(Date.now() / 1000);
  const params = paramsToSign(k.data as UploadKind, timestamp);
  return {
    ok: true,
    uploadUrl: uploadEndpoint(k.data as UploadKind),
    apiKey: CLOUDINARY_API_KEY,
    cloudName: CLOUDINARY_CLOUD_NAME,
    folder: params.folder,
    resourceType: k.data === "video" ? "video" : "image",
    allowedFormats: params.allowed_formats,
    timestamp,
    signature: signParams(params),
  };
}

/* ───────────── CRUD ───────────── */

/**
 * Create or update a video. `sourceType` is "link" (YouTube/Vimeo URL) or
 * "upload" (Cloudinary public_id stored in videoStorageKey + delivery URL
 * in videoFileUrl; thumbnail likewise via thumbStorageKey/thumbFileUrl).
 */
export async function saveVideo(fd: FormData): Promise<ActionResult> {
  await requireDoctor();

  const parsed = videoInputSchema.safeParse({
    titleAr: str(fd, "titleAr"),
    titleEn: str(fd, "titleEn") || undefined,
    descriptionAr: str(fd, "descriptionAr") || undefined,
    descriptionEn: str(fd, "descriptionEn") || undefined,
    category: str(fd, "category") || undefined,
    durationSeconds: str(fd, "durationSeconds") || undefined,
    isPublished: bool(fd, "isPublished"),
    isFeatured: bool(fd, "isFeatured"),
  });
  if (!parsed.success) return { ok: false, error: "invalid" };

  const id = Number(str(fd, "id")) || null;
  const [existing] = id
    ? await db.select().from(videos).where(eq(videos.id, id)).limit(1)
    : [];
  if (id && !existing) return { ok: false, error: "not_found" };

  const sourceType = str(fd, "sourceType");
  const videoPublicId = str(fd, "videoStorageKey") || null;
  const videoFileUrl = str(fd, "videoFileUrl") || null;
  const thumbPublicId = str(fd, "thumbStorageKey") || null;
  const thumbFileUrl = str(fd, "thumbFileUrl") || null;
  const thumbUrlInput = str(fd, "thumbnailUrl") || null;

  let source: VideoProvider | "upload";
  let videoUrl: string;
  let autoThumb: string | null = null;
  let autoThumbKey: string | null = null;
  let finalVideoKey: string | null = null;
  let finalThumbKey: string | null = null;

  if (sourceType === "link") {
    // Server-side resolution: validates protocol/hosts, resolves short links
    // (SSRF-safe), and classifies the provider. Never trusts the client.
    const r = await resolveLinkFully(str(fd, "videoUrl"));
    if (!r.ok) return { ok: false, error: "bad_url" };
    source = r.provider;
    videoUrl = r.url;
    autoThumb = r.thumbnailUrl ?? null;

    // Social platforms: mirror the provider thumbnail into Cloudinary
    // (their CDN URLs expire). Only when the doctor didn't supply one.
    const manualThumb = thumbPublicId || thumbFileUrl || thumbUrlInput;
    if (!manualThumb && (r.provider === "tiktok" || r.provider === "instagram" || r.provider === "facebook")) {
      const m = await mirrorProviderThumb(r.provider, r.url);
      if (m) {
        autoThumb = m.url;
        autoThumbKey = m.publicId;
      }
    }
  } else if (sourceType === "upload") {
    if (!isCloudinaryConfigured) return { ok: false, error: "storage_disabled" };
    // Fresh uploads send a new public_id; edits may keep the existing object.
    const key = videoPublicId ?? existing?.storageKey ?? null;
    if (!key || !isOurAssetId("video", key)) return { ok: false, error: "missing_upload" };

    // Delivery URL: the one Cloudinary returned (validated to our cloud), or
    // the stored URL when editing without uploading a new file.
    let delivery = videoFileUrl;
    if (delivery && !isOurCloudinaryUrl(delivery)) return { ok: false, error: "bad_file_url" };
    if (!delivery) {
      if (existing?.storageKey === key && existing.videoUrl) {
        delivery = existing.videoUrl;
      } else {
        return { ok: false, error: "missing_upload" };
      }
    }
    source = "upload";
    videoUrl = withVideoQuality(delivery);
    finalVideoKey = key;
    autoThumb = autoVideoThumbnail(key);
  } else {
    return { ok: false, error: "bad_source" };
  }

  // Thumbnail precedence: uploaded file → explicit URL → auto platform thumb
  // → Cloudinary frame for uploads → keep existing.
  let thumbnailUrl: string | null;
  if (thumbPublicId && thumbFileUrl && isOurAssetId("thumb", thumbPublicId) && isOurCloudinaryUrl(thumbFileUrl)) {
    thumbnailUrl = withImageQuality(thumbFileUrl);
    finalThumbKey = thumbPublicId;
  } else if (thumbUrlInput) {
    const u = safeHttpUrl(thumbUrlInput);
    if (!u) return { ok: false, error: "bad_thumb" };
    thumbnailUrl = u;
  } else if (thumbPublicId && existing?.thumbKey === thumbPublicId && existing.thumbnailUrl) {
    // Editing without touching the thumbnail: keep the uploaded one.
    thumbnailUrl = existing.thumbnailUrl;
    finalThumbKey = thumbPublicId;
  } else if (autoThumb) {
    thumbnailUrl = autoThumb;
    finalThumbKey = autoThumbKey;
  } else {
    thumbnailUrl = existing?.thumbnailUrl ?? null;
    finalThumbKey = existing?.thumbKey ?? null;
  }

  const values = {
    ...parsed.data,
    titleEn: parsed.data.titleEn || null,
    descriptionAr: parsed.data.descriptionAr || null,
    descriptionEn: parsed.data.descriptionEn || null,
    category: parsed.data.category || null,
    durationSeconds: parsed.data.durationSeconds ?? null,
    sourceType: source,
    videoUrl,
    // Never persist empty strings — NULL means "absent" everywhere downstream.
    storageKey: finalVideoKey || null,
    thumbKey: finalThumbKey || null,
    thumbnailUrl: thumbnailUrl || null,
  };

  let savedId = id;
  if (id) {
    await db.update(videos).set({ ...values, updatedAt: new Date() }).where(eq(videos.id, id));
  } else {
    const [{ next }] = await db
      .select({ next: sql<number>`coalesce(max(${videos.sortOrder}), 0) + 10` })
      .from(videos);
    const [row] = await db.insert(videos).values({ ...values, sortOrder: next }).returning({ id: videos.id });
    savedId = row.id;
  }

  // Free-plan hygiene: destroy replaced Cloudinary assets (best-effort).
  if (existing) {
    if (existing.storageKey && existing.storageKey !== finalVideoKey) {
      await destroyAsset(existing.storageKey, "video");
    }
    if (existing.thumbKey && existing.thumbKey !== finalThumbKey) {
      await destroyAsset(existing.thumbKey, "image");
    }
  }

  refresh();
  return { ok: true, id: savedId ?? undefined };
}

function safeHttpUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const host = u.hostname.toLowerCase();
    const allowed =
      host === "i.ytimg.com" ||
      host === "img.youtube.com" ||
      host === "vumbnail.com" ||
      host === "res.cloudinary.com" ||
      host.endsWith(".supabase.co") ||
      host.endsWith(".supabase.in");
    return allowed ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function deleteVideo(id: number): Promise<ActionResult> {
  await requireDoctor();
  const [row] = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
  if (!row) return { ok: false, error: "not_found" };
  await db.delete(videos).where(eq(videos.id, id));
  // Free the storage credits: video + uploaded thumbnail (best-effort).
  await destroyAsset(row.storageKey, "video");
  await destroyAsset(row.thumbKey, "image");
  refresh();
  return { ok: true };
}

export async function setVideoFlag(
  id: number,
  field: "isPublished" | "isFeatured",
  value: boolean,
): Promise<ActionResult> {
  await requireDoctor();
  if (field !== "isPublished" && field !== "isFeatured") return { ok: false, error: "bad_field" };
  await db.update(videos).set({ [field]: value, updatedAt: new Date() }).where(eq(videos.id, id));
  refresh();
  return { ok: true };
}

/** Move a video one step earlier (-1) or later (+1) in the global order. */
export async function moveVideo(id: number, dir: -1 | 1): Promise<ActionResult> {
  await requireDoctor();
  if (dir !== -1 && dir !== 1) return { ok: false, error: "bad_dir" };
  const [cur] = await db
    .select({ sortOrder: videos.sortOrder })
    .from(videos)
    .where(eq(videos.id, id))
    .limit(1);
  if (!cur) return { ok: false, error: "not_found" };

  // Neighbour in (sortOrder, id) order — cheap even on the free tier.
  const [nb] = await db
    .select({ id: videos.id, sortOrder: videos.sortOrder })
    .from(videos)
    .where(
      dir === -1
        ? or(lt(videos.sortOrder, cur.sortOrder), and(eq(videos.sortOrder, cur.sortOrder), lt(videos.id, id)))
        : or(gt(videos.sortOrder, cur.sortOrder), and(eq(videos.sortOrder, cur.sortOrder), gt(videos.id, id))),
    )
    .orderBy(dir === -1 ? desc(videos.sortOrder) : asc(videos.sortOrder), dir === -1 ? desc(videos.id) : asc(videos.id))
    .limit(1);
  if (!nb) return { ok: true }; // already first/last

  await db
    .update(videos)
    .set({ sortOrder: nb.sortOrder })
    .where(eq(videos.id, id));
  await db
    .update(videos)
    .set({ sortOrder: cur.sortOrder })
    .where(eq(videos.id, nb.id));
  refresh();
  return { ok: true };
}
