"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { AspectRatio } from "@/lib/video-link";
import { btn } from "@/components/ui";

export type ModalMedia =
  | { kind: "iframe"; embedUrl: string; provider: string; aspect: AspectRatio }
  | { kind: "video"; src: string; aspect: AspectRatio };

/** Frame width for non-16:9 aspects — keeps the box inside ~88vw / 78vh. */
const PORTRAIT_W: Partial<Record<AspectRatio, string>> = {
  "9:16": "min(86vw, 44vh)", // 44vh × 16/9 ≈ 78vh tall
  "4:5": "min(86vw, 62vh)", // 62vh × 5/4 ≈ 78vh tall
  "1:1": "min(86vw, 76vh)",
};

/** Append autoplay where the provider embed supports it. */
function autoplayUrl(embedUrl: string, provider: string): string {
  try {
    const u = new URL(embedUrl);
    if (provider === "youtube" || u.hostname.includes("youtube-nocookie.com")) {
      u.searchParams.set("autoplay", "1");
      u.searchParams.set("rel", "0");
      return u.toString();
    }
    if (provider === "vimeo" || u.hostname.includes("vimeo.com")) {
      u.searchParams.set("autoplay", "1");
      return u.toString();
    }
    if (provider === "facebook" || u.hostname.includes("facebook.com")) {
      u.searchParams.set("autoplay", "true");
      return u.toString();
    }
    if (provider === "tiktok") {
      u.searchParams.set("autoplay", "1");
      return u.toString();
    }
  } catch {
    /* keep original */
  }
  return embedUrl;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible lightbox for inline playback. Mounted only while open, so the
 * iframe/video (and its trackers) load strictly on demand — the facade
 * pattern is preserved.
 */
export function VideoModal({
  open,
  onClose,
  media,
  title,
  description,
  labels,
}: {
  open: boolean;
  onClose: () => void;
  media: ModalMedia;
  title: string;
  description?: string | null;
  labels: { close: string; book: string };
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("button")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const isWide = media.aspect === "16:9";
  const frameStyle: CSSProperties | undefined = isWide
    ? undefined
    : {
        width: PORTRAIT_W[media.aspect] ?? "min(86vw, 76vh)",
        aspectRatio: media.aspect.replace(":", "/"),
      };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl animate-fade-in"
      >
        <div
          className={`relative mx-auto overflow-hidden rounded-3xl bg-black shadow-2xl ${
            isWide ? "aspect-video w-full" : ""
          }`}
          style={frameStyle}
        >
          {media.kind === "video" ? (
            <video
              src={media.src}
              controls
              autoPlay
              playsInline
              preload="metadata"
              className="absolute inset-0 size-full"
            />
          ) : (
            <iframe
              src={autoplayUrl(media.embedUrl, media.provider)}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 size-full"
            />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.close}
            className="absolute end-3 top-3 z-10 grid size-10 cursor-pointer place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 rounded-3xl border border-sand-200/80 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold leading-8 text-brand-900 sm:text-xl">{title}</h2>
          {description && <p className="mt-2 leading-8 text-ink-soft">{description}</p>}
          <div className="mt-4">
            <Link href="/book" className={btn("primary", "md")} onClick={onClose}>
              {labels.book}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
