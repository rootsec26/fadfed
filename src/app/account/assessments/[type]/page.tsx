import { notFound } from "next/navigation";
import { submitAssessment } from "@/actions/patient";
import { PageTitle } from "@/components/dashboard/shell";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card } from "@/components/ui";
import { requirePatient } from "@/lib/auth";
import { ASSESSMENTS, DISCLAIMER, OPTIONS, isAssessmentType } from "@/lib/assessments";

export default async function TakeAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [, { type }, sp] = await Promise.all([requirePatient(), params, searchParams]);
  if (!isAssessmentType(type)) notFound();
  const a = ASSESSMENTS[type];
  const action = submitAssessment.bind(null, type);

  return (
    <>
      <PageTitle title={a.title} subtitle={a.intro} />
      <div className="mb-5"><Alert tone="warning">{DISCLAIMER}</Alert></div>
      {sp.error && <div className="mb-5"><Alert tone="error">رد على كل الأسئلة.</Alert></div>}
      <form action={action} className="space-y-4">
        {a.questions.map((q, i) => (
          <Card key={q} className="p-5">
            <p className="font-semibold text-ink">{i + 1}. {q}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {OPTIONS.map((o) => (
                <label key={o.value} className="cursor-pointer">
                  <input type="radio" name={`q${i}`} value={o.value} required className="peer sr-only" />
                  <span className="block rounded-2xl border border-sand-200 px-3 py-2 text-center text-xs font-semibold text-ink-soft transition peer-checked:border-brand-600 peer-checked:bg-brand-600 peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-brand-100 sm:text-sm">
                    {o.label}
                  </span>
                </label>
              ))}
            </div>
          </Card>
        ))}
        <SubmitButton size="lg" pendingText="بنحسب...">شوف النتيجة</SubmitButton>
      </form>
    </>
  );
}
