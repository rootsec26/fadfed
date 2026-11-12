import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { contactMessages, messages, patients } from "@/db/schema";
import { setContactHandled } from "@/actions/admin";
import { PageTitle } from "@/components/dashboard/shell";
import { Badge, Card, btn } from "@/components/ui";
import { requireDoctor } from "@/lib/auth";

const fmt = (d: Date) => d.toLocaleString("ar-u-nu-latn", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" });

export default async function AdminMessages() {
  await requireDoctor();
  const [threads, contacts] = await Promise.all([
    db
      .select({
        patient: patients,
        last: sql<string>`(array_agg(${messages.body} order by ${messages.createdAt} desc))[1]`,
        lastAt: sql<Date>`max(${messages.createdAt})`,
        unread: sql<number>`count(*) filter (where ${messages.sender} = 'patient' and ${messages.readAt} is null)::int`,
      })
      .from(messages)
      .innerJoin(patients, eq(patients.id, messages.patientId))
      .groupBy(patients.id)
      .orderBy(desc(sql`max(${messages.createdAt})`)),
    db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(50),
  ]);

  return (
    <>
      <PageTitle title="الرسائل" />
      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 font-bold text-brand-900">رسايل المرضى</h2>
          <div className="space-y-3">
            {threads.length === 0 && <Card className="text-sm text-ink-soft">مفيش رسايل.</Card>}
            {threads.map(({ patient, last, lastAt, unread }) => (
              <Link key={patient.id} href={`/dashboard/patients/${patient.id}#messages`}>
                <Card className="p-5 transition hover:border-brand-300">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-brand-900">{patient.fullName}</p>
                    {unread > 0 && <Badge tone="red">{unread} جديدة</Badge>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{last}</p>
                  <p className="mt-2 text-xs text-ink-soft">{fmt(new Date(lastAt))}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-bold text-brand-900">رسايل فورم التواصل</h2>
          <div className="space-y-3">
            {contacts.length === 0 && <Card className="text-sm text-ink-soft">مفيش رسايل.</Card>}
            {contacts.map((c) => (
              <Card key={c.id} className="space-y-2 p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">{c.name}</p>
                  <Badge tone={c.handled ? "green" : "amber"}>{c.handled ? "اتعاملت" : "جديدة"}</Badge>
                </div>
                <p className="text-xs text-ink-soft" dir="ltr">{c.email} {c.phone && `· ${c.phone}`}</p>
                <p className="whitespace-pre-wrap text-sm leading-7">{c.message}</p>
                <div className="flex items-center justify-between text-xs text-ink-soft">
                  <span>{fmt(c.createdAt)}</span>
                  <form action={setContactHandled.bind(null, c.id, !c.handled)}>
                    <button className={btn("secondary", "sm")}>{c.handled ? "افتحها تاني" : "اتعاملت"}</button>
                  </form>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
