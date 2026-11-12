import Link from "next/link";
import Image from "next/image";
import { and, asc, count, desc, eq, gte, like, ne, sql, sum } from "drizzle-orm";
import { CalendarDays, CheckCircle2, Clock, Play, Star, Users, Wallet, XCircle } from "lucide-react";
import { db } from "@/db";
import { appointments, patients, services, videos } from "@/db/schema";
import { PageTitle } from "@/components/dashboard/shell";
import { StatusActions } from "@/components/dashboard/status-actions";
import { Badge, Card, statusTone } from "@/components/ui";
import { requireDoctor } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatDate, formatTime, todayInTz } from "@/lib/time";

const STATUS_AR = { pending: "مستني التأكيد", confirmed: "متأكد", cancelled: "ملغي", completed: "خلص", no_show: "مارضاش" } as const;

export default async function AdminOverview() {
  await requireDoctor();
  const settings = await getSettings();
  const today = todayInTz(settings.timezone);
  const month = today.slice(0, 7);

  const [todays, pending, [patientCount], [monthSessions], [monthDone], [monthCancelled], [revenue], videoStats, recentVideos] = await Promise.all([
    db
      .select({ a: appointments, p: patients, s: services })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .innerJoin(services, eq(services.id, appointments.serviceId))
      .where(and(eq(appointments.date, today), ne(appointments.status, "cancelled")))
      .orderBy(asc(appointments.startTime)),
    db
      .select({ a: appointments, p: patients, s: services })
      .from(appointments)
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .innerJoin(services, eq(services.id, appointments.serviceId))
      .where(and(eq(appointments.status, "pending"), gte(appointments.date, today)))
      .orderBy(desc(appointments.createdAt))
      .limit(6),
    db.select({ n: count() }).from(patients),
    db.select({ n: count() }).from(appointments).where(and(like(appointments.date, `${month}%`), ne(appointments.status, "cancelled"))),
    db.select({ n: count() }).from(appointments).where(and(like(appointments.date, `${month}%`), eq(appointments.status, "completed"))),
    db.select({ n: count() }).from(appointments).where(and(like(appointments.date, `${month}%`), eq(appointments.status, "cancelled"))),
    db.select({ total: sum(appointments.price) }).from(appointments).where(and(like(appointments.date, `${month}%`), eq(appointments.status, "completed"))),
    db
      .select({
        total: count(),
        published: sql<number>`count(*) filter (where ${videos.isPublished})`,
        drafts: sql<number>`count(*) filter (where not ${videos.isPublished})`,
        featured: sql<number>`count(*) filter (where ${videos.isFeatured})`,
      })
      .from(videos),
    db
      .select({ id: videos.id, titleAr: videos.titleAr, titleEn: videos.titleEn, isPublished: videos.isPublished, thumbnailUrl: videos.thumbnailUrl })
      .from(videos)
      .orderBy(desc(videos.createdAt))
      .limit(5),
  ]);

  const [vs] = videoStats;
  const stats = [
    { label: "جلسات النهارده", value: todays.length, icon: CalendarDays },
    { label: "حجوزات جديدة مستنية التأكيد", value: pending.length, icon: Clock },
    { label: "إجمالي المرضى", value: patientCount.n, icon: Users },
    { label: "جلسات الشهر ده", value: monthSessions.n, icon: CalendarDays },
    { label: "جلسات خلصت", value: monthDone.n, icon: CheckCircle2 },
    { label: "ملغية الشهر ده", value: monthCancelled.n, icon: XCircle },
    { label: `إيراد الجلسات اللي خلصت (${settings.currencyAr})`, value: Number(revenue.total ?? 0), icon: Wallet },
    { label: "فيديوهات منشورة", value: Number(vs?.published ?? 0), icon: Play },
    { label: "فيديوهات مسودة", value: Number(vs?.drafts ?? 0), icon: Clock },
    { label: "فيديوهات مميزة", value: Number(vs?.featured ?? 0), icon: Star },
    { label: "إجمالي الفيديوهات", value: Number(vs?.total ?? 0), icon: Play },
  ];

  return (
    <>
      <PageTitle title="نظرة عامة" subtitle={formatDate(today, "ar")} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <Icon className="size-5 text-brand-500" />
            <p className="mt-3 text-2xl font-extrabold text-brand-900">{value}</p>
            <p className="mt-0.5 text-xs leading-5 text-ink-soft">{label}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-bold text-brand-900">جلسات النهارده</h2>
          <Card className="divide-y divide-sand-100 p-0">
            {todays.length === 0 && <p className="p-5 text-sm text-ink-soft">مفيش جلسات النهارده.</p>}
            {todays.map(({ a, p, s }) => (
              <div key={a.id} className="space-y-2 px-5 py-4">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/dashboard/appointments/${a.id}`} className="font-bold text-brand-800 hover:underline">{formatTime(a.startTime, "ar")} · {p.fullName}</Link>
                  <Badge tone={statusTone(a.status)}>{STATUS_AR[a.status]}</Badge>
                </div>
                <p className="text-xs text-ink-soft">{s.titleAr} · {a.sessionType === "online" ? "أونلاين" : "في العيادة"}</p>
              </div>
            ))}
          </Card>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-brand-900">أحدث الفيديوهات</h2>
            <Link href="/dashboard/videos" className="text-sm font-bold text-brand-600 hover:underline">كل الفيديوهات</Link>
          </div>
          <Card className="divide-y divide-sand-100 p-0">
            {recentVideos.length === 0 && <p className="p-5 text-sm text-ink-soft">مفيش فيديوهات لسه. <Link href="/dashboard/videos/new" className="font-bold text-brand-600">ضيف أول فيديو</Link></p>}
            {recentVideos.map((v) => (
              <Link key={v.id} href={`/dashboard/videos/${v.id}/edit`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-sand-50">
                <span className="relative h-9 w-14 shrink-0 overflow-hidden rounded-lg bg-brand-100">
                  {v.thumbnailUrl && <Image src={v.thumbnailUrl} alt="" fill sizes="56px" className="object-cover" />}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-900">{v.titleAr}</span>
                <Badge tone={v.isPublished ? "green" : "neutral"}>{v.isPublished ? "منشور" : "مسودة"}</Badge>
              </Link>
            ))}
          </Card>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-brand-900">حجوزات جديدة</h2>
          <Card className="divide-y divide-sand-100 p-0">
            {pending.length === 0 && <p className="p-5 text-sm text-ink-soft">مفيش حجوزات مستنية التأكيد.</p>}
            {pending.map(({ a, p, s }) => (
              <div key={a.id} className="space-y-2 px-5 py-4">
                <Link href={`/dashboard/appointments/${a.id}`} className="font-bold text-brand-800 hover:underline">{p.fullName}</Link>
                <p className="text-xs text-ink-soft">{s.titleAr} · {formatDate(a.date, "ar", { weekday: "long", day: "numeric", month: "long" })} · {formatTime(a.startTime, "ar")}</p>
                <StatusActions id={a.id} status={a.status} />
              </div>
            ))}
          </Card>
        </section>
      </div>
    </>
  );
}
