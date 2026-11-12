"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Star, Trash2 } from "lucide-react";
import { deleteVideo, moveVideo, setVideoFlag } from "@/actions/videos";
import { useToast } from "@/components/admin/toast";
import type { adminVideosT } from "@/lib/i18n/admin-videos";

type T = ReturnType<typeof adminVideosT>;

const iconBtn =
  "grid size-8 cursor-pointer place-items-center rounded-full text-ink-soft transition hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-40";

/** Row actions for the admin videos table: publish/feature toggles, reorder, delete. */
export function VideoRowActions({
  id,
  isPublished,
  isFeatured,
  t,
}: {
  id: number;
  isPublished: boolean;
  isFeatured: boolean;
  t: T;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast(okMsg);
        router.refresh();
      } else {
        toast(t.error, "error");
      }
    });

  return (
    <div className="flex items-center gap-1" dir="ltr">
      <button
        type="button"
        title={isPublished ? t.statusDraft : t.statusPublished}
        disabled={pending}
        onClick={() => run(() => setVideoFlag(id, "isPublished", !isPublished), isPublished ? t.unpublished : t.published)}
        className={`${iconBtn} ${isPublished ? "text-sage-700" : "text-amber-600"}`}
      >
        <span className={`block size-2.5 rounded-full ${isPublished ? "bg-success" : "bg-amber-400"}`} />
      </button>
      <button
        type="button"
        title={t.featured}
        disabled={pending}
        onClick={() => run(() => setVideoFlag(id, "isFeatured", !isFeatured), isFeatured ? t.featuredOff : t.featuredOn)}
        className={`${iconBtn} ${isFeatured ? "text-amber-500" : ""}`}
      >
        <Star className={`size-4 ${isFeatured ? "fill-amber-400 text-amber-400" : ""}`} />
      </button>
      <button
        type="button"
        title="↑"
        disabled={pending}
        onClick={() => run(() => moveVideo(id, -1), t.moved)}
        className={iconBtn}
      >
        <ArrowUp className="size-4" />
      </button>
      <button
        type="button"
        title="↓"
        disabled={pending}
        onClick={() => run(() => moveVideo(id, 1), t.moved)}
        className={iconBtn}
      >
        <ArrowDown className="size-4" />
      </button>
      {confirming ? (
        <span className="flex items-center gap-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setConfirming(false);
              run(() => deleteVideo(id), t.deleted);
            }}
            className="cursor-pointer rounded-full bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
          >
            {t.confirmDelete}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold text-ink-soft hover:bg-sand-100"
          >
            ✕
          </button>
        </span>
      ) : (
        <button type="button" title={t.colActions} disabled={pending} onClick={() => setConfirming(true)} className={`${iconBtn} hover:text-rose-600`}>
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}
