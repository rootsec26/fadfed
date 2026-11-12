"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rescheduleByDoctor } from "@/actions/admin";
import { SlotPicker } from "@/components/booking/slot-picker";
import { Alert, btn } from "@/components/ui";
import { ar } from "@/lib/i18n/ar";

export function AdminReschedule({ id, durationMin }: { id: string; durationMin: number }) {
  const router = useRouter();
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-5">
      <SlotPicker durationMin={durationMin} excludeId={id} lang="ar" t={ar.booking} date={date} time={time} onChange={(d, tm) => { setDate(d); setTime(tm); }} />
      {error && <Alert tone="error">{error}</Alert>}
      <button
        disabled={!date || !time || pending}
        className={btn("primary")}
        onClick={() =>
          start(async () => {
            const res = await rescheduleByDoctor(id, date!, time!);
            if (res.ok) {
              setError(null);
              setDate(null);
              setTime(null);
              router.refresh();
            } else setError(res.error ?? "حصل خطأ");
          })
        }
      >
        {pending ? "بنحفظ..." : "أكد الموعد الجديد"}
      </button>
    </div>
  );
}
