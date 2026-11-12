"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Camera,
  Clapperboard,
  ExternalLink,
  FileVideo,
  Leaf,
  MonitorPlay,
  Music2,
  Play,
  ThumbsUp,
  Tv,
  Video,
  type LucideIcon,
} from "lucide-react";
import { Badge, Card, btn } from "@/components/ui";
import { VideoModal, type ModalMedia } from "@/components/site/video-modal";
import { displayThumbUrl, publicVideoView, type VideoKind } from "@/lib/videos";
import { PROVIDER_LABEL, type AspectRatio, type VideoProvider } from "@/lib/video-link";
import { pick } from "@/lib/i18n/utils";
import type { PublicVideo } from "@/lib/video-queries";

export interface VideoChrome {
  play: string;
  watchOn: string;
  book: string;
  close: string;
  upload: string;
}

function fmtDuration(sec: number | null) {
  if (!sec || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `0:${String(s).padStart(2, "0")}`;
}

const PROVIDER_ICON: Record<VideoProvider | "upload", LucideIcon> = {
  youtube: Tv,
  vimeo: Video,
  tiktok: Music2,
  instagram: Camera,
  facebook: ThumbsUp,
  direct: FileVideo,
  external: MonitorPlay,
  upload: Clapperboard,
};

function providerLabel(provider: VideoKind, lang: "ar" | "en", uploadLabel: string, domain?: string) {
  if (provider === "upload") return uploadLabel;
  if (provider === "external" && domain) return domain;
  return PROVIDER_LABEL[provider as VideoProvider] ?? provider;
}

/** Aspect ratio value for the centered portrait/ square frame inside the 16:9 thumb. */
const INNER_ASPECT: Record<AspectRatio, string> = {
  "16:9": "16 / 9",
  "9:16": "9 / 16",
  "1:1": "1 / 1",
  "4:5": "4 / 5",
};

/**
 * Branded placeholder shown when a thumbnail is missing or fails to load —
 * soft green gradient + clinic leaf + play icon. Never an empty <img>.
 */
function ThumbFallback({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 grid place-items-center bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 ${className}`}>
      <span className="flex flex-col items-center gap-2 text-white/90">
        <Leaf className="size-8 opacity-80" />
        <Play className="size-6 fill-current" />
      </span>
    </div>
  );
}

/**
 * Card thumbnail: always a 16:9 stage so grid rows never jump. Non-16:9
 * videos are letterboxed — blurred cover backdrop + centered true-aspect
 * frame. Clicking opens the lightbox modal (facade: nothing loads until then).
 */
function Thumb({
  thumb,
  aspect,
  title,
  failed,
  onError,
  preload,
  playLabel,
  onActivate,
  externalUrl,
  watchLabel,
  providerChip,
  categoryChip,
  durationChip,
}: {
  thumb: string | null;
  aspect: AspectRatio;
  title: string;
  failed: boolean;
  onError: () => void;
  preload: boolean;
  playLabel: string;
  onActivate: () => void;
  externalUrl?: string;
  watchLabel: string;
  providerChip: React.ReactNode;
  categoryChip: React.ReactNode;
  durationChip: React.ReactNode;
}) {
  const wide = aspect === "16:9";
  const imgSizes = "(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30rem";

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-brand-900">
      {thumb && !failed ? (
        wide ? (
          <Image
            src={thumb}
            alt={title}
            fill
            preload={preload}
            sizes={imgSizes}
            onError={onError}
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <>
            {/* Blurred letterbox backdrop */}
            <Image
              src={thumb}
              alt=""
              fill
              preload={preload}
              sizes={imgSizes}
              aria-hidden
              className="scale-125 object-cover opacity-60 blur-2xl"
            />
            {/* Sharp true-aspect frame */}
            <span className="absolute inset-0 grid place-items-center p-3">
              <span className="relative block h-[88%] max-w-[88%]" style={{ aspectRatio: INNER_ASPECT[aspect] }}>
                <Image
                  src={thumb}
                  alt={title}
                  fill
                  preload={preload}
                  sizes={imgSizes}
                  onError={onError}
                  className="rounded-xl object-cover shadow-2xl transition duration-300 group-hover:scale-[1.02]"
                />
              </span>
            </span>
          </>
        )
      ) : (
        <ThumbFallback />
      )}

      {/* Legibility gradient */}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" aria-hidden />

      {/* Chips — never clip: nowrap + flex with gap, positioned at edges */}
      <span className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        {categoryChip}
        {providerChip}
      </span>
      <span className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-end gap-2">
        {durationChip}
      </span>

      {/* Center action */}
      {externalUrl ? (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${watchLabel}: ${title}`}
          className="absolute inset-0 grid place-items-center rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-brand-700 shadow-lg backdrop-blur transition group-hover:scale-105">
            <ExternalLink className="size-4" /> {watchLabel}
          </span>
        </a>
      ) : (
        <button
          type="button"
          onClick={onActivate}
          aria-label={`${playLabel}: ${title}`}
          className="absolute inset-0 grid cursor-pointer place-items-center rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        >
          <span className="grid size-14 place-items-center rounded-full border border-white/50 bg-white/85 text-brand-700 shadow-lg backdrop-blur transition duration-300 group-hover:scale-110">
            <Play className="size-6 fill-current ps-0.5" />
          </span>
        </button>
      )}
    </div>
  );
}

const chipBase =
  "inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm";

/** Public video card: facade thumbnail → lightbox modal on click. */
export function VideoCard({
  video,
  lang,
  chrome,
  preload = false,
  featured = false,
}: {
  video: PublicVideo;
  lang: "ar" | "en";
  chrome: VideoChrome;
  preload?: boolean;
  featured?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  const view = publicVideoView(video);
  if (!view) return null;

  const title = pick(lang, video.titleAr, video.titleEn);
  const desc = pick(lang, video.descriptionAr ?? "", video.descriptionEn);
  const dur = fmtDuration(video.durationSeconds);
  const thumb = displayThumbUrl(video.thumbnailUrl, view.aspect);
  const ProviderIcon = PROVIDER_ICON[view.provider] ?? MonitorPlay;

  const providerChip = (
    <span className={`${chipBase} max-w-[9rem] bg-white/15 text-white`}>
      <ProviderIcon className="size-3.5 shrink-0" />
      <span className="truncate">{providerLabel(view.provider, lang, chrome.upload, view.kind === "external" ? view.domain : undefined)}</span>
    </span>
  );
  const categoryChip = video.category ? (
    <Badge tone="blue" className="max-w-[55%] truncate !border-0 !bg-black/45 !px-2.5 !py-1 !text-[11px] !font-bold !text-white backdrop-blur-sm">
      {video.category}
    </Badge>
  ) : null;
  const durationChip = dur ? (
    <span className={`${chipBase} bg-black/55 text-white`} dir="ltr">
      {dur}
    </span>
  ) : null;

  const modalMedia: ModalMedia | null =
    view.kind === "video"
      ? { kind: "video", src: view.src, aspect: view.aspect }
      : view.kind === "iframe"
        ? { kind: "iframe", embedUrl: view.embedUrl, provider: view.provider, aspect: view.aspect }
        : null;

  const media = (
    <Thumb
      thumb={thumb}
      aspect={view.aspect}
      title={title}
      failed={thumbFailed}
      onError={() => setThumbFailed(true)}
      preload={preload}
      playLabel={chrome.play}
      onActivate={() => setOpen(true)}
      externalUrl={view.kind === "external" ? view.url : undefined}
      watchLabel={chrome.watchOn}
      providerChip={providerChip}
      categoryChip={categoryChip}
      durationChip={durationChip}
    />
  );

  return (
    <Card className={featured ? "overflow-hidden p-0" : "flex h-full flex-col overflow-hidden p-0"}>
      {featured ? (
        <div className="grid gap-0 md:grid-cols-[1.15fr_1fr]">
          <div className="group relative p-3 sm:p-4 md:p-5">{media}</div>
          <div className="flex flex-col justify-center gap-3 p-5 pe-6 sm:p-7 md:py-8">
            {video.category && <Badge tone="blue">{video.category}</Badge>}
            <h3 className="text-xl font-bold leading-9 text-brand-900 sm:text-2xl">{title}</h3>
            {desc && <p className="line-clamp-3 text-[15px] leading-8 text-ink-soft">{desc}</p>}
            {modalMedia && (
              <div className="mt-2">
                <button type="button" onClick={() => setOpen(true)} className={btn("primary", "md")}>
                  <Play className="size-4 fill-current" /> {chrome.play}
                </button>
              </div>
            )}
            {view.kind === "external" && (
              <div className="mt-2">
                <a href={view.url} target="_blank" rel="noopener noreferrer" className={btn("outline", "md")}>
                  <ExternalLink className="size-4" /> {chrome.watchOn}
                </a>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="group p-3 pb-0 sm:p-4">{media}</div>
          <div className="flex flex-1 flex-col p-4 pt-3 sm:p-5 sm:pt-4">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-7 text-brand-900">{title}</h3>
            {desc && <p className="mt-1.5 line-clamp-2 text-sm leading-7 text-ink-soft">{desc}</p>}
          </div>
        </>
      )}

      {modalMedia && (
        <VideoModal
          open={open}
          onClose={() => setOpen(false)}
          media={modalMedia}
          title={title}
          description={desc || null}
          labels={{ close: chrome.close, book: chrome.book }}
        />
      )}
    </Card>
  );
}
