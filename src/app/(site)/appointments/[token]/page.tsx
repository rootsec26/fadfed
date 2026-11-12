import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, Video } from "lucide-react";
import { cancelAppointment } from "@/actions/booking";
import { PageHero } from "@/components/site/page-hero";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Badge, Card, btn, statusTone } from "@/components/ui";
import { canPatientModify, loadAppointment } from "@/lib/appointments";
import { getI18n, pick } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { doctorProfile } from "@/lib/profile";
import { formatDate, formatTime } from "@/lib/time";

export const metadata = { title: "حجزي | My booking", robots: { index: false } };

/** Booking confirmation + self-service cancel / reschedule. Access = unguessable token. */
export default async function AppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ new?: string; rescheduled?: string }>;
}) {
  const [{ t, lang }, { token }, sp, settings] = await Promise.all([getI18n(), params, searchParams, getSettings()]);
  const full = await loadAppointment({ token });
  if (!full) notFound();
  const { appointment: a, service, patient } = full;
  const b = t.booking;
  const modifiable = canPatientModify(a, settings);
  const active = a.status === "pending" || a.status === "confirmed";
  const cancelThis = cancelAppointment.bind(null, token);

  const rows: [string, string][] = [
    [b.service, pick(lang, service.titleAr, service.titleEn)],
    [b.date, formatDate(a.date, lang)],
    [b.time, `${formatTime(a.startTime, lang)} – ${formatTime(a.endTime, lang)}`],
    [b.sessionType, a.sessionType === "online" ? b.online : b.clinic],
    [b.name, patient.fullName],
    ...(a.price > 0 ? [[t.common.price, `${a.price} ${pick(lang, settings.currencyAr, settings.currencyEn)}`] as [string, string]] : []),
  ];

  return (
    <>
      <PageHero title={sp.new ? b.confirmedTitle : b.manageTitle} subtitle={sp.new ? b.confirmedText : undefined} />
      <section className="mx-auto max-w-2xl space-y-5 px-5 py-10">
        {sp.rescheduled && <Alert tone="success">{b.rescheduled}</Alert>}
        {a.status === "cancelled" && <Alert tone="error">{b.cancelled}</Alert>}

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-bold text-brand-900"><CalendarCheck className="size-5 text-brand-500" />{b.manageTitle}</span>
            <Badge tone={statusTone(a.status)}>{t.common.status[a.status]}</Badge>
          </div>
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-t border-sand-100 pt-3 text-sm">
              <span className="text-ink-soft">{k}</span>
              <span className="font-semibold">{v}</span>
            </div>
          ))}
          {a.sessionType === "clinic" && (lang === "ar" ? doctorProfile.addressAr : doctorProfile.addressEn) && (
            <p className="border-t border-sand-100 pt-3 text-sm text-ink-soft">{lang === "ar" ? doctorProfile.addressAr : doctorProfile.addressEn}</p>
          )}
          {a.sessionType === "online" && a.meetingUrl && active && (
            <div className="border-t border-sand-100 pt-4">
              <p className="mb-2 text-sm text-ink-soft">{b.meetingLink}</p>
              <a href={a.meetingUrl} target="_blank" rel="noreferrer" className={btn("primary", "md")}>
                <Video className="size-4" /> {b.joinMeeting}
              </a>
            </div>
          )}
        </Card>

        {active && (
          modifiable ? (
            <div className="flex flex-wrap gap-3">
              <Link href={`/appointments/${token}/reschedule`} className={btn("outline")}>{b.reschedule}</Link>
              <form action={cancelThis}>
                <SubmitButton variant="ghost" className="text-rose-600 hover:bg-rose-50">{b.cancel}</SubmitButton>
              </form>
            </div>
          ) : (
            <Alert tone="warning">{b.tooLate.replace("{h}", String(settings.cancelWindowHours))}</Alert>
          )
        )}

        <p className="text-xs text-ink-soft">{b.keepLink}</p>
        <Link href="/book" className={btn("secondary", "sm")}>{b.newBooking}</Link>
      </section>
    </>
  );
}
