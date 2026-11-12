import { eq } from "drizzle-orm";
import { db } from "@/db";
import { intakeForms } from "@/db/schema";
import { saveIntake } from "@/actions/patient";
import { PageTitle } from "@/components/dashboard/shell";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, Checkbox, Field, Textarea } from "@/components/ui";
import { requirePatient } from "@/lib/auth";

export default async function IntakePage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [patient, sp] = await Promise.all([requirePatient(), searchParams]);
  const [intake] = await db.select().from(intakeForms).where(eq(intakeForms.patientId, patient.id)).limit(1);

  return (
    <>
      <PageTitle title="استمارة أول تقييم" subtitle="المعلومات دي بتساعد الدكتور يجهز لأول جلسة معاك. كل حاجة سرّية ومفيش غيره اللي بيشوفها." />
      <Card className="max-w-2xl space-y-5">
        {sp.saved && <Alert tone="success">اتحفظت الاستمارة.</Alert>}
        {sp.error === "consent" && <Alert tone="error">لازم توافق على معالجة بياناتك عشان تكمل.</Alert>}
        {sp.error === "invalid" && <Alert tone="error">اكتب سبب الزيارة (5 حروف على الأقل).</Alert>}
        <form action={saveIntake} className="space-y-5">
          <Field label="إيه سبب زيارتك؟ *"><Textarea name="reason" required minLength={5} defaultValue={intake?.reason} /></Field>
          <Field label="حكي شوية عن تاريخك الصحي والنفسي والاجتماعي"><Textarea name="history" defaultValue={intake?.history ?? ""} /></Field>
          <Field label="خدت علاج نفسي أو استشارة قبل كده؟ (اكتب التفاصيل)"><Textarea name="previousTherapy" defaultValue={intake?.previousTherapy ?? ""} className="min-h-20" /></Field>
          <Field label="الأدوية اللي بتاخدها دلوقتي (لو فيه)"><Textarea name="medications" defaultValue={intake?.medications ?? ""} className="min-h-20" /></Field>
          <Checkbox name="consent" required defaultChecked={!!intake}>
            موافق على جمع المعلومات الصحية دي ومعالجتها لغرض العلاج، وفاهم إنها سرّية ومفيش غير الدكتور اللي بيعالجني بيشوفها (شوف سياسة الخصوصية).
          </Checkbox>
          <SubmitButton pendingText="بنحفظ...">احفظ الاستمارة</SubmitButton>
        </form>
      </Card>
    </>
  );
}
