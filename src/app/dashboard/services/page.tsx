import { asc } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/db";
import { services } from "@/db/schema";
import { saveService } from "@/actions/admin";
import { ActionForm } from "@/components/dashboard/action-form";
import { PageTitle } from "@/components/dashboard/shell";
import { serviceIconKeys } from "@/components/site/service-card";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { requireDoctor } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

type Service = typeof services.$inferSelect;

function ServiceFields({ s }: { s?: Service }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {s && <input type="hidden" name="id" value={s.id} />}
      <Field label="العنوان (عربي)"><Input name="titleAr" defaultValue={s?.titleAr} required /></Field>
      <Field label="العنوان (إنجليزي)"><Input name="titleEn" defaultValue={s?.titleEn ?? ""} dir="ltr" /></Field>
      <Field label="الوصف (عربي)"><Textarea name="descriptionAr" defaultValue={s?.descriptionAr} required className="min-h-20" /></Field>
      <Field label="الوصف (إنجليزي)"><Textarea name="descriptionEn" defaultValue={s?.descriptionEn ?? ""} className="min-h-20" dir="ltr" /></Field>
      <Field label="السعر"><Input type="number" min={0} name="price" defaultValue={s?.price ?? 0} required dir="ltr" /></Field>
      <Field label="المدة (دقيقة)"><Input type="number" min={10} max={240} step={5} name="durationMin" defaultValue={s?.durationMin ?? 50} required dir="ltr" /></Field>
      <Field label="نوع الجلسة">
        <Select name="mode" defaultValue={s?.mode ?? "both"}>
          <option value="both">أونلاين أو في العيادة</option><option value="online">أونلاين بس</option><option value="clinic">في العيادة بس</option>
        </Select>
      </Field>
      <Field label="الأيقونة">
        <Select name="icon" defaultValue={s?.icon ?? "user"}>{serviceIconKeys.map((k) => <option key={k}>{k}</option>)}</Select>
      </Field>
      <Field label="المعرّف في اللينك (slug)"><Input name="slug" defaultValue={s?.slug} required dir="ltr" /></Field>
      <Field label="الترتيب"><Input type="number" name="sortOrder" defaultValue={s?.sortOrder ?? 0} dir="ltr" /></Field>
      <div className="sm:col-span-2"><Checkbox name="active" defaultChecked={s?.active ?? true}>شغالة (بتظهر في الموقع والحجز)</Checkbox></div>
    </div>
  );
}

export default async function AdminServices() {
  await requireDoctor();
  const [list, settings] = await Promise.all([db.select().from(services).orderBy(asc(services.sortOrder)), getSettings()]);
  return (
    <>
      <PageTitle title="الخدمات والأسعار" subtitle="أي تعديل بيظهر على طول في صفحة الخدمات ونموذج الحجز." />
      <div className="space-y-4">
        <details className="rounded-3xl border border-dashed border-brand-300 bg-brand-50/40 p-5">
          <summary className="flex cursor-pointer items-center gap-2 font-bold text-brand-700"><Plus className="size-4" /> ضيف خدمة جديدة</summary>
          <ActionForm action={saveService} className="mt-5 space-y-4">
            <ServiceFields />
            <SubmitButton size="sm">ضيف الخدمة</SubmitButton>
          </ActionForm>
        </details>

        {list.map((s) => (
          <Card key={s.id} className="p-0">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-5">
                <span className="font-bold text-brand-900">{s.titleAr}</span>
                <span className="flex items-center gap-2 text-sm text-ink-soft">
                  {s.price > 0 ? `${s.price} ${settings.currencyAr} · ` : ""}{s.durationMin} د {!s.active && <Badge tone="red">مخفية</Badge>}
                </span>
              </summary>
              <form action={saveService} className="space-y-4 border-t border-sand-100 p-5">
                <ServiceFields s={s} />
                <SubmitButton size="sm">احفظ التعديلات</SubmitButton>
              </form>
            </details>
          </Card>
        ))}
      </div>
    </>
  );
}
