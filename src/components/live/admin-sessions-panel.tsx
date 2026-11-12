import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { liveSessions, users } from "@/db/schema";
import { ToastProvider } from "@/components/admin/toast";
import { PageTitle } from "@/components/dashboard/shell";
import { CreateSessionForm, SessionRowActions, type PatientOption } from "@/components/live/session-admin-forms";
import { Badge, Card } from "@/components/ui";
import { getI18n } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { formatInstant } from "@/lib/time";

/** Doctor's live-sessions tab inside /dashboard/patients?tab=sessions. */
export async function AdminSessionsPanel() {
  const [{ t, lang }, settings] = await Promise.all([getI18n(), getSettings()]);
  const tz = settings.timezone;

  const [rows, patientRows] = await Promise.all([
    db
      .select({ s: liveSessions, patientName: users.name, patientEmail: users.email })
      .from(liveSessions)
      .innerJoin(users, eq(users.id, liveSessions.patientId))
      .orderBy(desc(liveSessions.scheduledAt))
      .limit(100),
    db.select({ email: users.email, name: users.name }).from(users).where(eq(users.role, "patient")),
  ]);

  const upcoming = rows.filter((r) => r.s.status === "scheduled" || r.s.status === "live");
  const past = rows.filter((r) => !upcoming.includes(r));
  const patients: PatientOption[] = patientRows;

  const statusBadge = (status: string) =>
    status === "live" ? (
      <Badge tone="green">{t.live.status.live}</Badge>
    ) : status === "scheduled" ? (
      <Badge tone="amber">{t.live.status.scheduled}</Badge>
    ) : status === "cancelled" ? (
      <Badge tone="red">{t.live.status.cancelled}</Badge>
    ) : (
      <Badge tone="neutral">{t.live.status.ended}</Badge>
    );

  const SessionCard = ({ s, patientName, patientEmail }: (typeof rows)[number]) => (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-bold text-brand-900">
          {patientName} <span className="text-xs font-normal text-ink-soft" dir="ltr">{patientEmail}</span>
        </p>
        <p className="mt-0.5 text-sm text-ink-soft">
          {formatInstant(s.scheduledAt, lang, tz)} · {t.live.duration} {s.durationMinutes} {t.live.minutesShort}
          {s.manualLink && <span className="ms-2 text-xs">({t.live.manualLink})</span>}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {statusBadge(s.status)}
        <SessionRowActions id={s.id} status={s.status} t={t.live} />
      </div>
    </Card>
  );

  return (
    <ToastProvider>
      <PageTitle title={t.live.admin.tab} subtitle={t.live.subtitle} />
      <div className="space-y-8">
        <CreateSessionForm patients={patients} t={t.live} />

        <section>
          <h2 className="mb-3 text-lg font-bold text-brand-900">{t.live.admin.upcoming}</h2>
          {upcoming.length === 0 ? (
            <Card className="text-sm text-ink-soft">{t.live.emptyUpcoming}</Card>
          ) : (
            <div className="grid gap-3">{upcoming.map((r) => <SessionCard key={r.s.id} {...r} />)}</div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-brand-900">{t.live.admin.past}</h2>
          {past.length === 0 ? (
            <Card className="text-sm text-ink-soft">{t.live.emptyPast}</Card>
          ) : (
            <div className="grid gap-3">{past.map((r) => <SessionCard key={r.s.id} {...r} />)}</div>
          )}
        </section>
      </div>
    </ToastProvider>
  );
}
