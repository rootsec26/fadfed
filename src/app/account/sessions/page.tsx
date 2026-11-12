import Link from "next/link";
import type { ReactNode } from "react";
import { desc, eq } from "drizzle-orm";
import { Video } from "lucide-react";
import { db } from "@/db";
import { liveSessions } from "@/db/schema";
import { AutoRefresh } from "@/components/live/auto-refresh";
import { PageTitle } from "@/components/dashboard/shell";
import { Badge, btn, Card } from "@/components/ui";
import { requirePatient, requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";
import { isLiveJoinable, type LiveSession } from "@/lib/live-sessions";
import { getSettings } from "@/lib/settings";
import { formatInstant } from "@/lib/time";

export const metadata = { title: "الجلسات المباشرة", robots: { index: false } };

export default async function PatientLiveSessionsPage() {
  const user = await requireUser();
  await requirePatient();
  const [{ t, lang }, settings] = await Promise.all([getI18n(), getSettings()]);
  const tz = settings.timezone;
  const now = new Date();

  const rows = await db
    .select()
    .from(liveSessions)
    .where(eq(liveSessions.patientId, user.id))
    .orderBy(desc(liveSessions.scheduledAt))
    .limit(50);

  const upcoming = rows.filter((s) => s.status === "scheduled" || s.status === "live");
  const past = rows.filter((s) => !upcoming.includes(s));
  // Poll while any session is still waiting for the doctor to press Start.
  const waiting = upcoming.some((s) => s.status === "scheduled");

  const statusBadge = (s: LiveSession) =>
    s.status === "live" ? (
      <Badge tone="green">{t.live.status.live}</Badge>
    ) : s.status === "scheduled" ? (
      <Badge tone="amber">{t.live.status.scheduled}</Badge>
    ) : s.status === "cancelled" ? (
      <Badge tone="red">{t.live.status.cancelled}</Badge>
    ) : (
      <Badge tone="neutral">{t.live.status.ended}</Badge>
    );

  return (
    <>
      {waiting && <AutoRefresh />}
      <PageTitle title={t.live.mySessions} subtitle={t.live.subtitle} />

      <section>
        <h2 className="mb-3 text-lg font-bold text-brand-900">{t.live.admin.upcoming}</h2>
        {upcoming.length === 0 ? (
          <Card className="text-sm text-ink-soft">{t.live.emptyUpcoming}</Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {upcoming.map((s) => {
              const joinable = isLiveJoinable(s, now);
              return (
                <Card key={s.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-brand-900">{t.live.title}</p>
                    {statusBadge(s)}
                  </div>
                  <p className="text-sm text-ink-soft">
                    {formatInstant(s.scheduledAt, lang, tz)} · {t.live.duration} {s.durationMinutes} {t.live.minutesShort}
                  </p>
                  {joinable ? (
                    <Link href={`/session/${s.id}`} className={btn("primary", "sm")}>
                      <Video className="size-4" /> {t.live.join}
                    </Link>
                  ) : (
                    <ButtonLike disabled>{t.live.waitingDoctor}</ButtonLike>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-brand-900">{t.live.admin.past}</h2>
        {past.length === 0 ? (
          <Card className="text-sm text-ink-soft">{t.live.emptyPast}</Card>
        ) : (
          <Card className="divide-y divide-sand-100 p-0">
            {past.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-sm">
                <p className="text-ink-soft">{formatInstant(s.scheduledAt, lang, tz)}</p>
                {statusBadge(s)}
              </div>
            ))}
          </Card>
        )}
      </section>
    </>
  );
}

function ButtonLike({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  return (
    <span
      className={`inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold ${
        disabled ? "bg-sand-100 text-ink-soft/60" : ""
      }`}
      aria-disabled={disabled}
    >
      {children}
    </span>
  );
}
