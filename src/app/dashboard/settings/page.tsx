import { desc } from "drizzle-orm";
import { db } from "@/db";
import { notificationLog } from "@/db/schema";
import { saveSettings } from "@/actions/admin";
import { PageTitle } from "@/components/dashboard/shell";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Badge, Card, Checkbox, Field, Input } from "@/components/ui";
import { requireDoctor } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export default async function AdminSettings({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireDoctor();
  const [s, sp] = await Promise.all([getSettings(), searchParams]);
  const log = await db.select().from(notificationLog).orderBy(desc(notificationLog.createdAt)).limit(15);

  return (
    <>
      <PageTitle title="الإعدادات" subtitle="إعدادات الحجز والعملة والإشعارات. بيانات الدكتور ووسائل التواصل بتتعدل من ملف src/lib/profile.ts." />
      {sp.saved && <div className="mb-4"><Alert tone="success">تم حفظ الإعدادات.</Alert></div>}
      {sp.error && <div className="mb-4"><Alert tone="error">{sp.error === "tz" ? "المنطقة الزمنية مش صح (مثال: Asia/Riyadh)." : "راجع الحقول."}</Alert></div>}

      <form action={saveSettings} className="space-y-6">
        <Card className="space-y-4">
          <h2 className="font-bold text-brand-900">الحجز والعملة</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="العملة (عربي)"><Input name="currencyAr" defaultValue={s.currencyAr} required /></Field>
            <Field label="العملة (إنجليزي)"><Input name="currencyEn" defaultValue={s.currencyEn} required dir="ltr" /></Field>
            <Field label="المنطقة الزمنية"><Input name="timezone" defaultValue={s.timezone} required dir="ltr" /></Field>
            <Field label="الفاصل بين المواعيد (دقيقة)"><Input type="number" name="slotStepMin" defaultValue={s.slotStepMin} min={5} max={120} required dir="ltr" /></Field>
            <Field label="أقل مهلة للحجز (ساعات)"><Input type="number" name="minNoticeHours" defaultValue={s.minNoticeHours} min={0} required dir="ltr" /></Field>
            <Field label="مهلة الإلغاء المجاني (ساعات)"><Input type="number" name="cancelWindowHours" defaultValue={s.cancelWindowHours} min={0} required dir="ltr" /></Field>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-bold text-brand-900">تفضيلات الإشعارات</h2>
          <Checkbox name="notifyEmail" defaultChecked={s.notifyEmail}>ابعت إيميل للمراجع عند الحجز/التعديل/الإلغاء</Checkbox>
          <Checkbox name="notifyWhatsapp" defaultChecked={s.notifyWhatsapp}>ابعت رسالة واتساب للمراجع</Checkbox>
          <Checkbox name="notifyDoctor" defaultChecked={s.notifyDoctor}>ابعتلي إيميل (أنا) عند حجز جديد أو رسالة</Checkbox>
          <p className="text-xs text-ink-soft">الإرسال حالياً تجريبي (Mock) وبيتحفظ في السجل اللي تحت. اربط مزود إيميل وواتساب حقيقي في <code dir="ltr">src/lib/integrations/notify.ts</code>.</p>
        </Card>

        <SubmitButton size="lg" pendingText="بنحفظ...">احفظ الإعدادات</SubmitButton>
      </form>

      <Card className="mt-8">
        <h2 className="mb-3 font-bold text-brand-900">سجل الإشعارات التجريبية (آخر 15)</h2>
        <ul className="space-y-2 text-sm">
          {log.length === 0 && <li className="text-ink-soft">مفيش سجل لسه.</li>}
          {log.map((l) => (
            <li key={l.id} className="rounded-2xl bg-sand-50 p-3">
              <div className="flex items-center justify-between gap-2"><Badge tone={l.channel === "email" ? "blue" : "green"}>{l.channel}</Badge><span className="text-xs text-ink-soft" dir="ltr">{l.recipient}</span></div>
              {l.subject && <p className="mt-1 font-semibold">{l.subject}</p>}
              <p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-ink-soft">{l.body}</p>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
