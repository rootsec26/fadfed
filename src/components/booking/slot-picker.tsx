"use client";

import { useEffect, useState } from "react";
import { cn } from "@/components/ui";
import type { Dictionary, Lang } from "@/lib/i18n";
import { formatDate, formatTime } from "@/lib/time";

/**
 * Date + time slot picker shared by the booking wizard, patient reschedule
 * and doctor reschedule. Availability comes from GET /api/availability.
 */
export function SlotPicker({
  durationMin,
  excludeId,
  lang,
  t,
  date,
  time,
  onChange,
}: {
  durationMin: number;
  excludeId?: string;
  lang: Lang;
  t: Dictionary["booking"];
  date: string | null;
  time: string | null;
  onChange: (date: string | null, time: string | null) => void;
}) {
  const [slots, setSlots] = useState<Record<string, string[]> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({ duration: String(durationMin) });
    if (excludeId) qs.set("exclude", excludeId);
    fetch(`/api/availability?${qs}`)
      .then((r) => r.json())
      .then((data) => !cancelled && setSlots(data))
      .catch(() => !cancelled && setSlots({}));
    return () => {
      cancelled = true;
    };
  }, [durationMin, excludeId]);

  if (!slots) return <p className="py-8 text-center text-sm text-ink-soft">{t.loading}</p>;
  const days = Object.entries(slots).filter(([, s]) => s.length > 0);
  if (days.length === 0) return <p className="py-8 text-center text-sm text-ink-soft">{t.noDays}</p>;

  return (
    <div className="space-y-7">
      <div>
        <h3 className="mb-3 font-bold text-brand-900">{t.chooseDate}</h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
          {days.map(([d]) => {
            const active = d === date;
            return (
              <button
                key={d}
                type="button"
                onClick={() => onChange(d, null)}
                className={cn(
                  "cursor-pointer rounded-2xl border px-2 py-3 text-center transition",
                  active ? "border-brand-600 bg-brand-600 text-white shadow-md" : "border-sand-200 bg-white hover:border-brand-300",
                )}
              >
                <span className="block text-xs opacity-80">{formatDate(d, lang, { weekday: "short" })}</span>
                <span className="block text-xl font-extrabold leading-tight">{formatDate(d, lang, { day: "numeric" })}</span>
                <span className="block text-xs opacity-80">{formatDate(d, lang, { month: "short" })}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-bold text-brand-900">{t.chooseTime}</h3>
        {!date ? (
          <p className="text-sm text-ink-soft">{t.pickDateFirst}</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {(slots[date] ?? []).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange(date, s)}
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-2 text-sm font-semibold transition",
                  s === time ? "border-brand-600 bg-brand-600 text-white" : "border-sand-200 bg-white hover:border-brand-300",
                )}
              >
                <span dir="ltr">{formatTime(s, lang)}</span>
              </button>
            ))}
            {(slots[date] ?? []).length === 0 && <p className="text-sm text-ink-soft">{t.noSlots}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
