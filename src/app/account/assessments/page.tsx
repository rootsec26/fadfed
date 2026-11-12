import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ShieldAlert } from "lucide-react";
import { db } from "@/db";
import { assessments } from "@/db/schema";
import { PageTitle } from "@/components/dashboard/shell";
import { Alert, Badge, Card, btn } from "@/components/ui";
import { requirePatient } from "@/lib/auth";
import { ASSESSMENTS, DISCLAIMER, maxScore } from "@/lib/assessments";
import { formatDate } from "@/lib/time";

export default async function AssessmentsPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const [patient, sp] = await Promise.all([requirePatient(), searchParams]);
  const history = await db.select().from(assessments).where(eq(assessments.patientId, patient.id)).orderBy(desc(assessments.createdAt));
  const done = sp.done ? history.find((h) => String(h.id) === sp.done) : undefined;

  return (
    <>
      <PageTitle title="الاختبارات الذاتية" subtitle="أدوات بسيطة تساعدك تفهم مشاعرك في آخر أسبوعين." />
      <div className="mb-6"><Alert tone="warning"><ShieldAlert className="me-2 inline size-4" />{DISCLAIMER}</Alert></div>

      {done && (
        <Card className="mb-6 border-brand-200 bg-brand-50/60">
          <p className="text-sm text-ink-soft">نتيجتك في {ASSESSMENTS[done.type].title}</p>
          <p className="mt-1 text-3xl font-extrabold text-brand-700">{done.score} <span className="text-base font-semibold text-ink-soft">/ {maxScore(done.type)}</span></p>
          <p className="mt-1 font-semibold text-brand-900">{done.severity}</p>
          {done.type === "phq9" && done.answers[8] > 0 && (
            <div className="mt-4"><Alert tone="error">قلت إن عندك أفكار تأذي نفسك. لو في خطر قريب، كلم خدمات الطوارئ أو خط المساندة في بلدك على طول (الأرقام فوق في الصفحة)، والأحسن تبلغ الدكتور في أقرب وقت.</Alert></div>
          )}
          <p className="mt-4 text-xs text-ink-soft">النتيجة دي مش تشخيص. اتكلم فيها مع الدكتور.</p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {(Object.keys(ASSESSMENTS) as (keyof typeof ASSESSMENTS)[]).map((k) => (
          <Card key={k} className="flex flex-col">
            <h2 className="font-bold text-brand-900">{ASSESSMENTS[k].title}</h2>
            <p className="mt-1 flex-1 text-sm text-ink-soft">{ASSESSMENTS[k].short} · {ASSESSMENTS[k].questions.length} سؤال</p>
            <Link href={`/account/assessments/${k}`} className={btn("primary", "sm", "mt-4 self-start")}>ابدأ الاختبار</Link>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold text-brand-900">نتايجك القديمة</h2>
      {history.length === 0 ? (
        <Card className="text-sm text-ink-soft">لسه معملتش أي اختبار.</Card>
      ) : (
        <Card className="divide-y divide-sand-100 p-0">
          {history.map((h) => (
            <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-sm">
              <div>
                <p className="font-semibold">{ASSESSMENTS[h.type].title}</p>
                <p className="text-ink-soft">{formatDate(h.createdAt.toISOString().slice(0, 10), "ar", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
              <div className="flex items-center gap-2"><Badge tone="blue">{h.score} / {maxScore(h.type)}</Badge><span className="text-ink-soft">{h.severity}</span></div>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
