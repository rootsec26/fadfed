import { and, eq, gte, inArray, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { appointments, availabilityRules, daysOff } from "@/db/schema";
import { getSettings } from "@/lib/settings";
import { addDays, fromMin, nowMinutesInTz, todayInTz, toMin, weekdayOf } from "@/lib/time";

/**
 * Slot engine. A slot is available when:
 *  - the day is not a day off and has an active availability rule
 *  - the session fits inside the working window and does not touch the break
 *  - it does not overlap another pending/confirmed appointment
 *  - it respects the minimum notice period
 */
export async function getSlotsForRange(opts: {
  durationMin: number;
  days?: number;
  excludeAppointmentId?: string;
}): Promise<Record<string, string[]>> {
  const settings = await getSettings();
  const days = opts.days ?? 30;
  const today = todayInTz(settings.timezone);
  const last = addDays(today, days - 1);

  const [rules, off, booked] = await Promise.all([
    db.select().from(availabilityRules).where(eq(availabilityRules.active, true)),
    db.select().from(daysOff).where(and(gte(daysOff.date, today), lte(daysOff.date, last))),
    db
      .select({
        id: appointments.id,
        date: appointments.date,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
      })
      .from(appointments)
      .where(
        and(
          gte(appointments.date, today),
          lte(appointments.date, last),
          inArray(appointments.status, ["pending", "confirmed"]),
          opts.excludeAppointmentId ? ne(appointments.id, opts.excludeAppointmentId) : undefined,
        ),
      ),
  ]);

  const offSet = new Set(off.map((d) => d.date));
  const nowMin = nowMinutesInTz(settings.timezone);
  const minStart = nowMin + settings.minNoticeHours * 60;
  const result: Record<string, string[]> = {};

  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const slots: string[] = [];
    if (!offSet.has(date)) {
      const dayBookings = booked
        .filter((b) => b.date === date)
        .map((b) => [toMin(b.startTime), toMin(b.endTime)] as const);
      const dayRules = rules.filter((r) => r.weekday === weekdayOf(date));

      for (const r of dayRules) {
        const end = toMin(r.endTime);
        const bs = r.breakStart ? toMin(r.breakStart) : null;
        const be = r.breakEnd ? toMin(r.breakEnd) : null;
        for (let s = toMin(r.startTime); s + opts.durationMin <= end; s += settings.slotStepMin) {
          const e = s + opts.durationMin;
          if (i === 0 && s < minStart) continue; // today: respect notice period
          if (bs !== null && be !== null && s < be && e > bs) continue;
          if (dayBookings.some(([bStart, bEnd]) => s < bEnd && e > bStart)) continue;
          slots.push(fromMin(s));
        }
      }
    }
    result[date] = [...new Set(slots)].sort();
  }
  return result;
}

/** Server-side re-validation right before writing a booking / reschedule. */
export async function isSlotAvailable(
  date: string,
  startTime: string,
  durationMin: number,
  excludeAppointmentId?: string,
) {
  const map = await getSlotsForRange({ durationMin, days: 60, excludeAppointmentId });
  return !!map[date]?.includes(startTime);
}
