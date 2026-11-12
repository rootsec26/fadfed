"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rescheduleAppointment } from "@/actions/booking";
import { SlotPicker } from "@/components/booking/slot-picker";
import { Alert, btn } from "@/components/ui";
import type { Dictionary, Lang } from "@/lib/i18n";

/** Patient-facing reschedule form (token authorised). */
export function RescheduleForm({
  token,
  appointmentId,
  durationMin,
  lang,
  t,
}: {
  token: string;
  appointmentId: string;
  durationMin: number;
  lang: Lang;
  t: Dictionary["booking"];
}) {
  const router = useRouter();
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <SlotPicker durationMin={durationMin} excludeId={appointmentId} lang={lang} t={t} date={date} time={time} onChange={(d, tm) => { setDate(d); setTime(tm); }} />
      {error && <Alert tone="error">{error}</Alert>}
      <button
        disabled={!date || !time || pending}
        className={btn("primary", "lg")}
        onClick={() =>
          start(async () => {
            const res = await rescheduleAppointment(token, date!, time!);
            if (res.ok) router.push(`/appointments/${token}?rescheduled=1`);
            else setError(res.error);
          })
        }
      >
        {pending ? t.confirming : t.saveReschedule}
      </button>
    </div>
  );
}
