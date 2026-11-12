import { asc } from "drizzle-orm";
import { Plus, Trash2 } from "lucide-react";
import { db } from "@/db";
import { testimonials } from "@/db/schema";
import { deleteTestimonial, saveTestimonial } from "@/actions/admin";
import { ActionForm } from "@/components/dashboard/action-form";
import { PageTitle } from "@/components/dashboard/shell";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Badge, Card, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { requireDoctor } from "@/lib/auth";

type T = typeof testimonials.$inferSelect;

function Fields({ t }: { t?: T }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {t && <input type="hidden" name="id" value={t.id} />}
      <Field label="الاسم (مختصر للخصوصية)"><Input name="nameAr" defaultValue={t?.nameAr} required /></Field>
      <Field label="الاسم (إنجليزي)"><Input name="nameEn" defaultValue={t?.nameEn ?? ""} dir="ltr" /></Field>
      <Field label="النص (عربي)"><Textarea name="textAr" defaultValue={t?.textAr} required className="min-h-20" /></Field>
      <Field label="النص (إنجليزي)"><Textarea name="textEn" defaultValue={t?.textEn ?? ""} className="min-h-20" dir="ltr" /></Field>
      <Field label="التقييم">
        <Select name="rating" defaultValue={t?.rating ?? 5}>{[5, 4, 3, 2, 1].map((n) => <option key={n}>{n}</option>)}</Select>
      </Field>
      <div className="flex items-end"><Checkbox name="published" defaultChecked={t?.published ?? true}>منشور</Checkbox></div>
    </div>
  );
}

export default async function AdminTestimonials() {
  await requireDoctor();
  const list = await db.select().from(testimonials).orderBy(asc(testimonials.id));
  return (
    <>
      <PageTitle title="آراء المراجعين" />
      <div className="mb-4"><Alert tone="warning">انشر آراء حقيقية بس، وبموافقة صاحبها، وشيل أي بيانات تعريفية عشان تحافظ على الخصوصية.</Alert></div>
      <div className="space-y-4">
        <details className="rounded-3xl border border-dashed border-brand-300 bg-brand-50/40 p-5">
          <summary className="flex cursor-pointer items-center gap-2 font-bold text-brand-700"><Plus className="size-4" /> رأي جديد</summary>
          <ActionForm action={saveTestimonial} className="mt-5 space-y-4">
            <Fields />
            <SubmitButton size="sm">ضيف</SubmitButton>
          </ActionForm>
        </details>
        {list.map((t) => (
          <Card key={t.id} className="p-0">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-5">
                <span className="font-bold text-brand-900">{t.nameAr}</span>
                <Badge tone={t.published ? "green" : "neutral"}>{t.published ? "منشور" : "مخفي"}</Badge>
              </summary>
              <div className="space-y-4 border-t border-sand-100 p-5">
                <form action={saveTestimonial} className="space-y-4">
                  <Fields t={t} />
                  <SubmitButton size="sm">احفظ التعديلات</SubmitButton>
                </form>
                <form action={deleteTestimonial.bind(null, t.id)}>
                  <button className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-rose-600"><Trash2 className="size-4" /> امسح</button>
                </form>
              </div>
            </details>
          </Card>
        ))}
      </div>
    </>
  );
}
