import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { CalendarPlus, ClipboardList, Video } from "lucide-react";
import { db } from "@/db";
import { appointments, intakeForms, services } from "@/db/schema";
import { PageTitle } from "@/components/dashboard/shell";
import { Alert, Badge, Card, btn, statusTone } from "@/components/ui";
import { requirePatient } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatDate, formatTime, todayInTz } from "@/lib/time";

export default async function AccountDashboard() {
  const patient = await requirePatient();
  const settings = await getSettings();
  const today = todayInTz(settings.timezone);

  const [rows, [intake]] = await Promise.all([
    db
      .select({ a: appointments, service: services })
      .from(appointments)
      .innerJoin(services, eq(services.id, appointments.serviceId))
      .where(eq(appointments.patientId, patient.id))
      .orderBy(asc(appointments.date), asc(appointments.startTime)),
    db.select({ id: intakeForms.id }).from(intakeForms).where(eq(intakeForms.patientId, patient.id)).limit(1),
  ]);

  const isUpcoming = (r: (typeof rows)[number]) =>
    (r.a.status === "pending" || r.a.status === "confirmed") && r.a.date >= today;
  const upcoming = rows.filter(isUpcoming);
  const past = rows.filter((r) => !isUpcoming(r)).reverse();

  return (
    <>
      <PageTitle
        title={`مرحباً ${patient.fullName.split(" ")[0]} 👋`}
        subtitle="هنا هتلاقي جلساتك الجاية واللي فاتت وبياناتك."
        action={<Link href="/book" className={btn("primary", "sm")}><CalendarPlus className="size-4" /> احجز جلسة جديدة</Link>}
      />

      {!intake && (
        <div className="mb-6">
          <Alert tone="warning">
            <span className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2"><ClipboardList className="size-4" /> كمّل استمارة التقييم الأولي قبل أول جلسة ليك.</span>
              <Link href="/account/intake" className={btn("primary", "sm")}>كمّل الاستمارة</Link>
            </span>
          </Alert>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-brand-900">الجلسات الجاية</h2>
        {upcoming.length === 0 ? (
          <Card className="text-sm text-ink-soft">مفيش جلسات جاية.</Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {upcoming.map(({ a, service }) => (
              <Card key={a.id} className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-brand-900">{service.titleAr}</p>
                  <Badge tone={statusTone(a.status)}>{({ pending: "مستني التأكيد", confirmed: "متأكدة" } as Record<string, string>)[a.status]}</Badge>
                </div>
                <p className="text-sm text-ink-soft">{formatDate(a.date, "ar")} · {formatTime(a.startTime, "ar")}</p>
                <p className="text-xs text-sage-700">{a.sessionType === "online" ? "أونلاين (فيديو)" : "في العيادة"}</p>
                <div className="flex flex-wrap gap-2">
                  {a.sessionType === "online" && a.meetingUrl && (
                    <a href={a.meetingUrl} target="_blank" rel="noreferrer" className={btn("primary", "sm")}><Video className="size-4" /> ادخل</a>
                  )}
                  <Link href={`/appointments/${a.manageToken}`} className={btn("outline", "sm")}>إدارة الحجز</Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-brand-900">الجلسات اللي فاتت</h2>
        {past.length === 0 ? (
          <Card className="text-sm text-ink-soft">مفيش جلسات فاتت.</Card>
        ) : (
          <Card className="divide-y divide-sand-100 p-0">
            {past.map(({ a, service }) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-sm">
                <div>
                  <p className="font-semibold">{service.titleAr}</p>
                  <p className="text-ink-soft">{formatDate(a.date, "ar", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <Badge tone={statusTone(a.status)}>{({ completed: "خلصت", cancelled: "ملغية", no_show: "مارضاش", pending: "انتهت", confirmed: "انتهت" } as Record<string, string>)[a.status]}</Badge>
              </div>
            ))}
          </Card>
        )}
      </section>
    </>
  );
}
