import Link from "next/link";
import { asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients } from "@/db/schema";
import { AdminSessionsPanel } from "@/components/live/admin-sessions-panel";
import { PageTitle } from "@/components/dashboard/shell";
import { Badge, Card, Input, btn, cn } from "@/components/ui";
import { requireDoctor } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/time";

export default async function AdminPatients({ searchParams }: { searchParams: Promise<{ q?: string; tab?: string }> }) {
  await requireDoctor();
  const { q, tab } = await searchParams;
  const { t } = await getI18n();
  const onSessions = tab === "sessions";

  if (onSessions) {
    return (
      <>
        <TabNav active="sessions" patientsLabel="المرضى" sessionsLabel={t.live.admin.tab} />
        <AdminSessionsPanel />
      </>
    );
  }

  const term = q?.trim();
  const rows = await db
    .select({
      p: patients,
      sessions: sql<number>`count(${appointments.id})::int`,
      last: sql<string | null>`max(${appointments.date})`,
    })
    .from(patients)
    .leftJoin(appointments, eq(appointments.patientId, patients.id))
    .where(term ? or(ilike(patients.fullName, `%${term}%`), ilike(patients.email, `%${term}%`), ilike(patients.phone, `%${term}%`)) : undefined)
    .groupBy(patients.id)
    .orderBy(desc(sql`max(${appointments.date})`), asc(patients.fullName))
    .limit(200);

  return (
    <>
      <TabNav active="patients" patientsLabel="المرضى" sessionsLabel={t.live.admin.tab} />
      <PageTitle title="المرضى" subtitle="بيانات حساسة – الوصول مقصور على الدكتور بس." />
      <form className="mb-5 flex max-w-md gap-2">
        <Input name="q" defaultValue={q} placeholder="دوّر بالاسم أو الإيميل أو الموبايل" className="min-w-0 flex-1" />
        <button className={btn("primary", "md", "shrink-0")}>دوّر</button>
      </form>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.length === 0 && <Card className="text-sm text-ink-soft">مفيش نتايج.</Card>}
        {rows.map(({ p, sessions, last }) => (
          <Link key={p.id} href={`/dashboard/patients/${p.id}`}>
            <Card className="p-5 transition hover:border-brand-300 hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-brand-900">{p.fullName}</p>
                {p.userId ? <Badge tone="green">عنده حساب</Badge> : <Badge>ضيف</Badge>}
              </div>
              <p className="mt-1 text-xs text-ink-soft" dir="ltr">{p.email} · {p.phone}</p>
              <p className="mt-3 text-xs text-ink-soft">{sessions} جلسة {last && `· آخر موعد: ${formatDate(last, "ar", { day: "numeric", month: "short", year: "numeric" })}`}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

function TabNav({ active, patientsLabel, sessionsLabel }: { active: "patients" | "sessions"; patientsLabel: string; sessionsLabel: string }) {
  const tab = (href: string, label: string, on: boolean) => (
    <Link
      key={href}
      href={href}
      className={cn(
        "rounded-full px-5 py-2 text-sm font-bold transition",
        on ? "bg-brand-600 text-white shadow-sm" : "bg-white text-ink-soft hover:bg-sand-100",
      )}
    >
      {label}
    </Link>
  );
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {tab("/dashboard/patients", patientsLabel, active === "patients")}
      {tab("/dashboard/patients?tab=sessions", sessionsLabel, active === "sessions")}
    </div>
  );
}
