import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, lt, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients, services } from "@/db/schema";
import { PageTitle } from "@/components/dashboard/shell";
import { StatusActions } from "@/components/dashboard/status-actions";
import { Badge, Card, btn, cn, statusTone } from "@/components/ui";
import { requireDoctor } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatDate, formatTime, todayInTz } from "@/lib/time";

const STATUS_AR = { pending: "مستني التأكيد", confirmed: "متأكد", cancelled: "ملغي", completed: "خلص", no_show: "مارضاش" } as const;
const FILTERS = [
  ["upcoming", "الجاية"],
  ["pending", "مستنية التأكيد"],
  ["past", "اللي فاتت"],
  ["cancelled", "الملغية"],
  ["all", "الكل"],
] as const;

export default async function AdminAppointments({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await requireDoctor();
  const [{ filter = "upcoming" }, settings] = await Promise.all([searchParams, getSettings()]);
  const today = todayInTz(settings.timezone);

  let where: SQL | undefined;
  if (filter === "upcoming") where = and(gte(appointments.date, today), inArray(appointments.status, ["pending", "confirmed"]));
  else if (filter === "pending") where = eq(appointments.status, "pending");
  else if (filter === "past") where = or(lt(appointments.date, today), inArray(appointments.status, ["completed", "no_show"]));
  else if (filter === "cancelled") where = eq(appointments.status, "cancelled");

  const rows = await db
    .select({ a: appointments, p: patients, s: services })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .innerJoin(services, eq(services.id, appointments.serviceId))
    .where(where)
    .orderBy(filter === "upcoming" || filter === "pending" ? asc(appointments.date) : desc(appointments.date), asc(appointments.startTime))
    .limit(200);

  return (
    <>
      <PageTitle title="المواعيد" />
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(([key, label]) => (
          <Link key={key} href={`/dashboard/appointments?filter=${key}`} className={cn(btn(filter === key ? "primary" : "outline", "sm"), "shrink-0")}>{label}</Link>
        ))}
      </div>
      <div className="space-y-3">
        {rows.length === 0 && <Card className="text-sm text-ink-soft">مفيش مواعيد.</Card>}
        {rows.map(({ a, p, s }) => (
          <Card key={a.id} className="space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link href={`/dashboard/appointments/${a.id}`} className="font-bold text-brand-800 hover:underline">{p.fullName}</Link>
                <p className="mt-0.5 text-sm text-ink-soft">{s.titleAr} · {a.sessionType === "online" ? "أونلاين" : "في العيادة"}</p>
              </div>
              <Badge tone={statusTone(a.status)}>{STATUS_AR[a.status]}</Badge>
            </div>
            <p className="text-sm font-semibold">{formatDate(a.date, "ar")} · {formatTime(a.startTime, "ar")} – {formatTime(a.endTime, "ar")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <StatusActions id={a.id} status={a.status} />
              <Link href={`/dashboard/appointments/${a.id}`} className={btn("secondary", "sm")}>التفاصيل / غيّر الموعد</Link>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
