import { saveProfile } from "@/actions/patient";
import { PageTitle } from "@/components/dashboard/shell";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, Field, Input, Select } from "@/components/ui";
import { requirePatient, requireUser } from "@/lib/auth";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [user, patient, sp] = await Promise.all([requireUser(), requirePatient(), searchParams]);
  return (
    <>
      <PageTitle title="ملفي الشخصي" />
      <Card className="max-w-2xl">
        {sp.saved && <div className="mb-4"><Alert tone="success">اتحفظت بياناتك.</Alert></div>}
        {sp.error && <div className="mb-4"><Alert tone="error">راجع البيانات.</Alert></div>}
        <form action={saveProfile} className="grid gap-4 sm:grid-cols-2">
          <Field label="الاسم بالكامل"><Input name="fullName" defaultValue={patient.fullName} required minLength={2} /></Field>
          <Field label="الإيميل"><Input value={user.email} disabled dir="ltr" readOnly /></Field>
          <Field label="رقم موبايلك"><Input name="phone" defaultValue={patient.phone ?? ""} dir="ltr" /></Field>
          <Field label="تاريخ ميلادك"><Input name="birthDate" type="date" defaultValue={patient.birthDate ?? ""} dir="ltr" /></Field>
          <Field label="الجنس">
            <Select name="gender" defaultValue={patient.gender ?? ""}>
              <option value="">—</option><option value="female">أنثى</option><option value="male">ذكر</option>
            </Select>
          </Field>
          <Field label="حد للطوارئ (اسم ورقم)"><Input name="emergencyContact" defaultValue={patient.emergencyContact ?? ""} /></Field>
          <div className="sm:col-span-2"><SubmitButton pendingText="بنحفظ...">احفظ التغييرات</SubmitButton></div>
        </form>
      </Card>
    </>
  );
}
