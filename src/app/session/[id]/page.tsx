import Link from "next/link";
import type { ReactNode } from "react";
import { AutoRefresh } from "@/components/live/auto-refresh";
import { LiveRoom } from "@/components/live/live-room";
import { StartLiveButton } from "@/components/live/session-admin-forms";
import { Card } from "@/components/ui";
import { isAdminEmail, requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";
import { isLiveJoinable, joinHardCloseAt, loadLiveSession } from "@/lib/live-sessions";
import { doctorProfile } from "@/lib/profile";
import { getSettings } from "@/lib/settings";
import { formatInstant } from "@/lib/time";

export const metadata = { title: "Live session", robots: { index: false } };

/**
 * /session/[id] — private 1:1 live therapy room.
 * Server-side gate: logged in AND (doctor-admin OR the assigned patient).
 * Join is gated by STATUS: SCHEDULED waits for the doctor, LIVE opens the
 * room, ENDED/CANCELLED never join. Sanity bound: LIVE stops 24h after
 * the scheduled time.
 */
export default async function LiveSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [{ t, lang, dir }, settings, s] = await Promise.all([getI18n(), getSettings(), loadLiveSession(id)]);

  const isDoctor = user.role === "doctor" && isAdminEmail(user.email);
  const isPatient = !!s && user.id === s.patientId;
  const clinicName = lang === "en" ? settings.clinicNameEn : settings.clinicNameAr;
  const when = s ? formatInstant(s.scheduledAt, lang, settings.timezone) : "";

  let body: ReactNode;
  if (!s || (!isDoctor && !isPatient)) {
    body = <Card className="py-10 text-center"><h1 className="text-xl font-extrabold text-brand-900">{s ? t.live.denied : t.live.notFound}</h1></Card>;
  } else if (s.status === "cancelled") {
    body = <Card className="py-10 text-center"><h1 className="text-xl font-extrabold text-brand-900">{t.live.cancelledNote}</h1></Card>;
  } else if (s.status === "ended" || (s.status === "live" && !isLiveJoinable(s))) {
    body = (
      <Card className="space-y-3 py-10 text-center">
        <h1 className="text-xl font-extrabold text-brand-900">{t.live.endedTitle}</h1>
        <p className="text-sm text-ink-soft">{t.live.endedText}</p>
      </Card>
    );
  } else if (s.status === "scheduled") {
    body = isDoctor ? (
      <Card className="space-y-4 py-10 text-center">
        <h1 className="text-xl font-extrabold text-brand-900">{t.live.title}</h1>
        <p className="text-sm text-ink-soft">{when} · {t.live.duration} {s.durationMinutes} {t.live.minutesShort}</p>
        <StartLiveButton id={s.id} label={t.live.admin.start} />
      </Card>
    ) : (
      <>
        <AutoRefresh />
        <Card className="space-y-3 py-10 text-center">
          <h1 className="text-xl font-extrabold text-brand-900">{t.live.waitingTitle}</h1>
          <p className="text-sm text-ink-soft">{t.live.waitingDoctor}</p>
          <p className="text-xs text-ink-soft">{when}</p>
        </Card>
      </>
    );
  } else {
    // status === "live" and inside the sanity window
    body = (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-900">{t.live.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {when} · {t.live.duration} {s.durationMinutes} {t.live.minutesShort}
          </p>
        </div>
        <LiveRoom
          sessionId={s.id}
          isPatient={isPatient}
          needsConsent={isPatient && !s.patientConsentAt}
          t={t.live}
          emergency={{
            title: t.emergency.title,
            text: t.emergency.text,
            hotline: `${t.emergency.hotline} ${doctorProfile.hotline}`,
          }}
        />
      </div>
    );
  }

  return (
    <div dir={dir} lang={lang} className="min-h-screen bg-sand-50">
      <header className="border-b border-sand-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="font-extrabold text-brand-800">{clinicName}</Link>
          <Link href={isDoctor ? "/dashboard/patients?tab=sessions" : "/account/sessions"} className="text-sm font-semibold text-ink-soft hover:text-brand-700">
            {t.live.mySessions}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{body}</main>
    </div>
  );
}
