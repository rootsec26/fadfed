"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Play, UploadCloud } from "lucide-react";
import { saveVideo, signUpload } from "@/actions/videos";
import { useToast } from "@/components/admin/toast";
import { Alert, Button, Card, Checkbox, Field, Input, Textarea } from "@/components/ui";
import { videoInputSchema } from "@/lib/videos";
import { PROVIDER_LABEL, resolveVideoLink, type AspectRatio } from "@/lib/video-link";
import type { adminVideosT } from "@/lib/i18n/admin-videos";

type T = ReturnType<typeof adminVideosT>["form"];

export type VideoFormVideo = {
  id?: number;
  titleAr: string;
  titleEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  category: string | null;
  durationSeconds: number | null;
  sourceType: string;
  videoUrl: string;
  storageKey: string | null;
  thumbnailUrl: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  /** Storage key of an uploaded thumbnail, when the current thumb lives in the bucket. */
  thumbKey?: string | null;
};

type UploadState = {
  status: "idle" | "uploading" | "done" | "error";
  progress: number; // 0..1
  key: string | null; // Cloudinary public_id
  url: string | null; // preview URL (object URL or delivery URL)
  fileUrl: string | null; // Cloudinary secure_url (sent to the server on save)
  duration: number | null; // seconds, from Cloudinary's response
  name: string;
  error?: string;
};

const IDLE: UploadState = { status: "idle", progress: 0, key: null, url: null, fileUrl: null, duration: null, name: "" };

const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";
const VIDEO_EXT_OK = /\.(mp4|webm|mov)$/i;
const THUMB_MAX = 2 * 1024 * 1024;

/**
 * POST a file DIRECTLY to Cloudinary (signed upload) with progress + abort.
 * The file never touches our server — only the signature did.
 */
function postToCloudinary(
  sig: Extract<Awaited<ReturnType<typeof signUpload>>, { ok: true }>,
  file: File | Blob,
  contentType: string,
  onProgress: (frac: number) => void,
  signal: AbortSignal,
  filename?: string,
): Promise<{ secure_url?: string; public_id?: string; duration?: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", sig.uploadUrl);
    const fd = new FormData();
    fd.append("api_key", sig.apiKey);
    fd.append("timestamp", String(sig.timestamp));
    fd.append("signature", sig.signature);
    fd.append("folder", sig.folder);
    fd.append("allowed_formats", sig.allowedFormats);
    fd.append("file", file, filename ?? (file instanceof File ? file.name : "file"));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) return reject(new Error(`HTTP ${xhr.status}`));
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        reject(new Error("bad_response"));
      }
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.onabort = () => reject(new DOMException("aborted", "AbortError"));
    const onAbort = () => xhr.abort();
    if (signal.aborted) return onAbort();
    signal.addEventListener("abort", onAbort, { once: true });
    xhr.send(fd);
    void contentType;
  });
}

/** Resize/compress an image client-side (max 1280px, JPEG q0.82). */
async function compressImage(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    return blob ?? file;
  } catch {
    return file;
  }
}

function fmtSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function VideoForm({
  video,
  t,
  storageEnabled,
}: {
  video?: VideoFormVideo;
  t: T;
  storageEnabled: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const isEditUpload = video?.sourceType === "upload";
  const [sourceMode, setSourceMode] = useState<"link" | "upload">(isEditUpload ? "upload" : "link");
  const [linkUrl, setLinkUrl] = useState(video && video.sourceType !== "upload" ? video.videoUrl : "");
  const [videoUp, setVideoUp] = useState<UploadState>({
    ...IDLE,
    key: video?.storageKey ?? null,
    url: video?.sourceType === "upload" ? video.videoUrl : null,
    name: video?.sourceType === "upload" ? "current file" : "",
    status: video?.storageKey ? "done" : "idle",
  });
  const [thumbUp, setThumbUp] = useState<UploadState>({
    ...IDLE,
    key: video?.thumbKey ?? null,
    url: video?.thumbnailUrl ?? null,
    name: video?.thumbnailUrl ? "current thumbnail" : "",
    status: video?.thumbnailUrl ? "done" : "idle",
  });
  const durationRef = useRef<HTMLInputElement>(null);
  const [thumbUrl, setThumbUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const parsed = sourceMode === "link" ? resolveVideoLink(linkUrl) : null;
  const linkOk = parsed?.ok ? parsed : null;

  // Revoke object URLs on unmount.
  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const runUpload = useCallback(
    async (kind: "video" | "thumb", file: File, previewUrl?: string) => {
      const set = kind === "video" ? setVideoUp : setThumbUp;
      const max = kind === "video" ? 50 * 1024 * 1024 : THUMB_MAX;
      if (file.size > max) {
        set((s) => ({ ...s, status: "error", error: "too_large" }));
        return;
      }
      if (kind === "thumb" && !/^image\//.test(file.type)) {
        set((s) => ({ ...s, status: "error", error: "bad_type" }));
        return;
      }

      set({ status: "uploading", progress: 0, key: null, url: previewUrl ?? null, fileUrl: null, duration: null, name: file.name });
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const body = kind === "thumb" ? await compressImage(file) : file;
        const ct = body.type || file.type || "application/octet-stream";
        const sig = await signUpload(kind, ct, body.size);
        if (!sig.ok) throw new Error(sig.error);
        const res = await postToCloudinary(sig, body, ct, (f) => set((s) => ({ ...s, progress: f })), ac.signal, kind === "thumb" ? "thumb.jpg" : undefined);
        if (!res.secure_url || !res.public_id) throw new Error("bad_response");
        // Auto-fill duration for videos when the field is empty.
        if (kind === "video" && typeof res.duration === "number" && durationRef.current && !durationRef.current.value) {
          durationRef.current.value = String(Math.round(res.duration));
        }
        set({
          status: "done",
          progress: 1,
          key: res.public_id,
          url: res.secure_url,
          fileUrl: res.secure_url,
          duration: typeof res.duration === "number" ? res.duration : null,
          name: file.name,
        });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          set((s) => ({ ...s, status: "idle", progress: 0 }));
        } else {
          set((s) => ({ ...s, status: "error", error: "upload_failed" }));
        }
      } finally {
        abortRef.current = null;
      }
    },
    [],
  );

  const onVideoFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!VIDEO_EXT_OK.test(file.name) && !file.type.startsWith("video/")) {
      setVideoUp((s) => ({ ...s, status: "error", error: "bad_type", name: file.name }));
      return;
    }
    const preview = URL.createObjectURL(file);
    void runUpload("video", file, preview);
  };

  const onThumbFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const preview = URL.createObjectURL(file);
    void runUpload("thumb", file, preview);
  };

  const cancelUpload = () => abortRef.current?.abort();

  const resetUpload = (kind: "video" | "thumb") => {
    abortRef.current?.abort();
    if (kind === "video") setVideoUp(IDLE);
    else setThumbUp(IDLE);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    // Client-side validation (Zod) before hitting the server action.
    const meta = videoInputSchema.safeParse({
      titleAr: fd.get("titleAr"),
      titleEn: fd.get("titleEn") || undefined,
      descriptionAr: fd.get("descriptionAr") || undefined,
      descriptionEn: fd.get("descriptionEn") || undefined,
      category: fd.get("category") || undefined,
      durationSeconds: fd.get("durationSeconds") || undefined,
      isPublished: fd.get("isPublished") === "on",
      isFeatured: fd.get("isFeatured") === "on",
    });
    if (!meta.success) {
      toast(t.required, "error");
      return;
    }
    if (sourceMode === "link" && !linkOk) {
      toast(t.badUrl, "error");
      return;
    }
    const videoBusy = videoUp.status === "uploading" || thumbUp.status === "uploading";
    if (videoBusy) {
      toast(t.uploadingWait, "error");
      return;
    }
    if (sourceMode === "upload" && !videoUp.key) {
      toast(t.needUpload, "error");
      return;
    }

    fd.set("sourceType", sourceMode === "link" ? "link" : "upload");
    if (videoUp.key) fd.set("videoStorageKey", videoUp.key);
    if (videoUp.fileUrl) fd.set("videoFileUrl", videoUp.fileUrl);
    if (thumbUp.key) fd.set("thumbStorageKey", thumbUp.key);
    if (thumbUp.fileUrl) fd.set("thumbFileUrl", thumbUp.fileUrl);
    if (thumbUrl.trim()) fd.set("thumbnailUrl", thumbUrl.trim());

    setSubmitting(true);
    try {
      const res = await saveVideo(fd);
      if (!res.ok) {
        toast(res.error === "bad_url" ? t.badUrl : res.error === "missing_upload" ? t.needUpload : t.error, "error");
        return;
      }
      toast(t.saved);
      router.push("/dashboard/videos");
      router.refresh();
    } catch {
      toast(t.error, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const thumbPreview = thumbUp.url ?? (sourceMode === "link" ? linkOk?.thumbnailUrl ?? null : null) ?? video?.thumbnailUrl ?? null;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <Card className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.titleAr}>
              <Input name="titleAr" defaultValue={video?.titleAr} required maxLength={200} />
            </Field>
            <Field label={t.titleEn}>
              <Input name="titleEn" defaultValue={video?.titleEn ?? ""} dir="ltr" maxLength={200} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.descAr}>
              <Textarea name="descriptionAr" defaultValue={video?.descriptionAr ?? ""} className="min-h-24" />
            </Field>
            <Field label={t.descEn}>
              <Textarea name="descriptionEn" defaultValue={video?.descriptionEn ?? ""} dir="ltr" className="min-h-24" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.category} hint={t.categoryHint}>
              <Input name="category" defaultValue={video?.category ?? ""} maxLength={80} />
            </Field>
            <Field label={t.duration}>
              <Input ref={durationRef} name="durationSeconds" type="number" min={0} dir="ltr" defaultValue={video?.durationSeconds ?? ""} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-6">
            <Checkbox name="isPublished" defaultChecked={video?.isPublished ?? false}>{t.published}</Checkbox>
            <Checkbox name="isFeatured" defaultChecked={video?.isFeatured ?? false}>{t.featured}</Checkbox>
          </div>
        </Card>

        <Card className="space-y-4">
          <Field label={t.source}>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["link", "upload"] as const).map((m) => {
                const disabled = m === "upload" && !storageEnabled;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSourceMode(m)}
                    className={`rounded-2xl border px-4 py-3 text-start text-sm font-semibold transition ${
                      sourceMode === m
                        ? "border-brand-500 bg-brand-50 text-brand-800"
                        : "border-sand-200 bg-white text-ink-soft hover:bg-sand-50"
                    } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                  >
                    {m === "link" ? t.linkMode : t.uploadMode}
                  </button>
                );
              })}
            </div>
          </Field>
          {!storageEnabled && (
            <Alert tone="info">{t.storageOff}</Alert>
          )}

          {sourceMode === "link" ? (
            <>
              <Field label={t.videoUrl} hint={t.videoUrlHint}>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://www.tiktok.com/@user/video/..."
                  dir="ltr"
                  required
                />
              </Field>
              {linkOk && (
                <p className="text-xs leading-6 text-ink-soft">
                  {linkOk.external ? t.externalNote : linkOk.needsResolve ? t.resolveNote : t.publicNote}
                </p>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <Field label={t.videoFile}>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sand-200 bg-sand-50/60 px-4 py-6 text-center transition hover:border-brand-300">
                  <UploadCloud className="size-7 text-brand-500" />
                  <span className="text-sm font-semibold text-brand-700">{t.chooseFile}</span>
                  <span className="text-xs text-ink-soft">mp4 · webm · mov — 50 MB</span>
                  <input type="file" accept={VIDEO_ACCEPT} className="hidden" onChange={onVideoFile} />
                </label>
              </Field>
              {videoUp.status !== "idle" && (
                <UploadStatus state={videoUp} t={t} onCancel={cancelUpload} onReset={() => resetUpload("video")} />
              )}
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <Field label={t.thumbFile} hint={t.thumbHint}>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-sand-200 bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition hover:bg-sand-50">
                <ImagePlus className="size-4" /> {t.chooseFile}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onThumbFile} />
              </label>
              {thumbUp.status !== "idle" && (
                <UploadStatus state={thumbUp} t={t} onCancel={cancelUpload} onReset={() => resetUpload("thumb")} />
              )}
            </div>
          </Field>
          <Field label={t.thumbUrl}>
            <Input value={thumbUrl} onChange={(e) => setThumbUrl(e.target.value)} placeholder="https://i.ytimg.com/vi/..." dir="ltr" />
          </Field>
        </Card>
      </div>

      {/* Preview + submit */}
      <div className="space-y-4">
        <Card className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-bold text-brand-900">
            <Play className="size-4" /> {t.preview}
          </p>
          <div className={`relative ${aspectClass(linkOk?.aspectRatio)} overflow-hidden rounded-2xl bg-brand-900`}>
            {sourceMode === "link" && linkOk ? (
              linkOk.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={linkOk.thumbnailUrl} alt="" className="absolute inset-0 size-full object-cover opacity-80" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900" />
              )
            ) : videoUp.url ? (
              <video src={videoUp.url} className="absolute inset-0 size-full object-cover" muted playsInline preload="metadata" />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-brand-200">
                <Play className="size-10" />
              </div>
            )}
            {linkOk && (
              <span className="absolute bottom-2 start-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white">
                {PROVIDER_LABEL[linkOk.provider]}
                {linkOk.needsResolve ? ` · ${t.resolveHint}` : linkOk.external ? ` · ${t.externalHint}` : ""}
              </span>
            )}
          </div>
          {thumbPreview && (
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-sand-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbPreview} alt="" className="absolute inset-0 size-full object-cover" />
            </div>
          )}
        </Card>

        {video && <input type="hidden" name="id" value={video.id} />}
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={submitting || videoUp.status === "uploading" || thumbUp.status === "uploading"}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {submitting ? t.saving : t.save}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/dashboard/videos")}>{t.back}</Button>
        </div>
      </div>
    </form>
  );
}

function aspectClass(a?: AspectRatio) {
  const ratio =
    a === "9:16" ? "aspect-[9/16]" : a === "1:1" ? "aspect-square" : a === "4:5" ? "aspect-[4/5]" : "aspect-video";
  return a && a !== "16:9" ? `${ratio} mx-auto w-full max-w-[280px]` : `${ratio} w-full`;
}

function UploadStatus({
  state,
  t,
  onCancel,
  onReset,
}: {
  state: UploadState;
  t: T;
  onCancel: () => void;
  onReset: () => void;
}) {
  if (state.status === "uploading") {
    return (
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-3">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-brand-800">
          <span className="truncate">{state.name}</span>
          <span>{Math.round(state.progress * 100)}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-100">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${state.progress * 100}%` }} />
        </div>
        <button type="button" onClick={onCancel} className="mt-2 cursor-pointer text-xs font-bold text-rose-600 hover:underline">
          {t.cancel}
        </button>
      </div>
    );
  }
  if (state.status === "done") {
    return (
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-sage-200 bg-sage-50 px-3 py-2 text-xs font-semibold text-sage-700">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="size-4" /> {t.uploaded} — {state.name}
        </span>
        <button type="button" onClick={onReset} className="cursor-pointer text-rose-600 hover:underline">
          {t.replace}
        </button>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
        <span className="inline-flex items-center gap-1.5">
          <AlertCircle className="size-4" /> {state.error === "too_large" ? "50 MB" : t.error}
        </span>
        <button type="button" onClick={onReset} className="cursor-pointer hover:underline">
          {t.replace}
        </button>
      </div>
    );
  }
  return null;
}
