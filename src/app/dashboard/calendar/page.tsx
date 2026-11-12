import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db } from "@/db";
import { appointments, availabilityRules, daysOff, patients } from "@/db/schema";
import {
  addAvailabilityRule,
  addDayOff,
  deleteAvailabilityRule,
  deleteDayOff,
  toggleAvailabilityRule,
} from "@/actions/admin";
import { ActionForm } from "@/components/dashboard/action-form";
import { PageTitle } from "@/components/dashboard/shell";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, Field, Input, Select } from "@/components/ui";
import { requireDoctor } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { addDays, formatDate, formatTime, todayInTz, WEEKDAYS_AR } from "@/lib/time";

export default async function AdminCalendar() {
  await requireDoctor();
  const settings = await getSettings();
  const today = todayInTz(settings.timezone);

  const [rules, off, agenda] = await Promise.all([
    db.select().from(availabilityRules).orderBy(asc(availabilityRules.weekday), asc(availabilityRules.startTime)),
    db.select().from(daysOff).where(gte(daysOff.date, today)).orderBy(asc(daysOff.date)),
    db
      .select({ a: appointments, p: patients })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .where(and(gte(appointments.date, today), lte(appointments.date, addDays(today, 6)), inArray(appointments.status, ["pending", "confirmed"])))
      .orderBy(asc(appointments.date), asc(appointments.startTime)),
  ]);

  return (
    <>
      <PageTitle title="التقويم والمواعيد" subtitle="حدد أيام وساعات الشغل والراحة والاجازات. المواعيد الفاضية بتظهر للمرضى لوحدها." />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Card className="space-y-4">
            <h2 className="font-bold text-brand-900">مواعيد الشغل في الأسبوع</h2>
            {WEEKDAYS_AR.map((day, i) => {
              const dayRules = rules.filter((r) => r.weekday === i);
              return (
                <div key={day} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-sand-100 pt-3 first:border-0 first:pt-0">
                  <span className="w-20 text-sm font-bold">{day}</span>
                  {dayRules.length === 0 && <span className="text-sm text-ink-soft">اجازة</span>}
                  {dayRules.map((r) => (
                    <span key={r.id} className="inline-flex items-center gap-2 rounded-full bg-sand-100 py-1 ps-3 pe-1 text-xs">
                      <span dir="ltr" className={r.active ? "" : "line-through opacity-50"}>
                        {formatTime(r.startTime)} – {formatTime(r.endTime)}
                        {r.breakStart && ` (راحة ${formatTime(r.breakStart)}–${formatTime(r.breakEnd!)})`}
                      </span>
                      <form action={toggleAvailabilityRule.bind(null, r.id, !r.active)}>
                        <button className="cursor-pointer rounded-full bg-white px-2 py-0.5 font-semibold text-brand-700">{r.active ? "وقّف" : "شغّل"}</button>
                      </form>
                      <form action={deleteAvailabilityRule.bind(null, r.id)}>
                        <button aria-label="مسح" className="grid size-6 cursor-pointer place-items-center rounded-full bg-white text-rose-600"><Trash2 className="size-3.5" /></button>
                      </form>
                    </span>
                  ))}
                </div>
              );
            })}
          </Card>

          <Card>
            <h2 className="mb-4 font-bold text-brand-900">ضيف فترة شغل</h2>
            <ActionForm action={addAvailabilityRule} className="grid gap-4 sm:grid-cols-2">
              <Field label="اليوم">
                <Select name="weekday" defaultValue="0">{WEEKDAYS_AR.map((d, i) => <option key={d} value={i}>{d}</option>)}</Select>
              </Field>
              <span />
              <Field label="من"><Input type="time" name="startTime" defaultValue="10:00" required dir="ltr" /></Field>
              <Field label="لـ"><Input type="time" name="endTime" defaultValue="18:00" required dir="ltr" /></Field>
              <Field label="بداية الراحة (اختياري)"><Input type="time" name="breakStart" dir="ltr" /></Field>
              <Field label="نهاية الراحة (اختياري)"><Input type="time" name="breakEnd" dir="ltr" /></Field>
              <div className="sm:col-span-2"><SubmitButton size="sm">ضيف</SubmitButton></div>
            </ActionForm>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 font-bold text-brand-900">أيام الاجازة</h2>
            <ul className="mb-4 space-y-2">
              {off.length === 0 && <li className="text-sm text-ink-soft">مفيش اجازات جاية.</li>}
              {off.map((d) => (
                <li key={d.id} className="flex items-center justify-between rounded-2xl bg-sand-100 px-4 py-2 text-sm">
                  <span>{formatDate(d.date, "ar")}{d.reason && <span className="text-ink-soft"> · {d.reason}</span>}</span>
                  <form action={deleteDayOff.bind(null, d.id)}>
                    <button aria-label="مسح" className="cursor-pointer text-rose-600"><Trash2 className="size-4" /></button>
                  </form>
                </li>
              ))}
            </ul>
            <ActionForm action={addDayOff} className="flex flex-wrap items-end gap-3">
              <Field label="التاريخ"><Input type="date" name="date" min={today} required dir="ltr" /></Field>
              <Field label="السبب (اختياري)"><Input name="reason" /></Field>
              <SubmitButton size="sm">ضيف اجازة</SubmitButton>
            </ActionForm>
          </Card>

          <Card>
            <h2 className="mb-4 font-bold text-brand-900">جدول الأسبوع الجاي</h2>
            <ul className="space-y-2">
              {agenda.length === 0 && <li className="text-sm text-ink-soft">مفيش مواعيد في الـ 7 أيام الجاية.</li>}
              {agenda.map(({ a, p }) => (
                <li key={a.id} className="flex items-center justify-between gap-2 rounded-2xl bg-sand-50 px-4 py-2.5 text-sm">
                  <span><span className="font-semibold">{formatDate(a.date, "ar", { weekday: "short", day: "numeric", month: "short" })}</span> · {formatTime(a.startTime, "ar")} · {p.fullName}</span>
                  <Badge tone={a.status === "confirmed" ? "green" : "amber"}>{a.status === "confirmed" ? "متأكد" : "مستني"}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
