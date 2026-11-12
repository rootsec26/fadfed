import { desc } from "drizzle-orm";
import { Plus, Trash2 } from "lucide-react";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { deleteArticle, saveArticle } from "@/actions/admin";
import { ActionForm } from "@/components/dashboard/action-form";
import { PageTitle } from "@/components/dashboard/shell";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Badge, Card, Checkbox, Field, Input, Textarea } from "@/components/ui";
import { requireDoctor } from "@/lib/auth";

type Article = typeof articles.$inferSelect;

function ArticleFields({ a }: { a?: Article }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {a && <input type="hidden" name="id" value={a.id} />}
      <Field label="العنوان (عربي)"><Input name="titleAr" defaultValue={a?.titleAr} required /></Field>
      <Field label="العنوان (إنجليزي - اختياري)"><Input name="titleEn" defaultValue={a?.titleEn ?? ""} dir="ltr" /></Field>
      <Field label="مقتطف (عربي)"><Textarea name="excerptAr" defaultValue={a?.excerptAr} required className="min-h-20" /></Field>
      <Field label="مقتطف (إنجليزي)"><Textarea name="excerptEn" defaultValue={a?.excerptEn ?? ""} className="min-h-20" dir="ltr" /></Field>
      <div className="sm:col-span-2"><Field label="المحتوى (عربي)" hint="فقرة جديدة = سطر فارغ · العنوان الفرعي: ابدأ السطر بـ ## · ملاحظة مائلة: *نص*"><Textarea name="contentAr" defaultValue={a?.contentAr} required className="min-h-48" /></Field></div>
      <div className="sm:col-span-2"><Field label="المحتوى (إنجليزي – اختياري)"><Textarea name="contentEn" defaultValue={a?.contentEn ?? ""} className="min-h-32" dir="ltr" /></Field></div>
      <Field label="التصنيف"><Input name="category" defaultValue={a?.category ?? "عام"} required /></Field>
      <Field label="المعرّف في اللينك (slug)"><Input name="slug" defaultValue={a?.slug} required dir="ltr" /></Field>
      <div className="sm:col-span-2"><Checkbox name="published" defaultChecked={a?.published ?? false}>منشور</Checkbox></div>
    </div>
  );
}

export default async function AdminArticles() {
  await requireDoctor();
  const list = await db.select().from(articles).orderBy(desc(articles.publishedAt));
  return (
    <>
      <PageTitle title="المقالات" />
      <div className="mb-4"><Alert>المحتوى الحالي للتوضيح بس. بدله بمقالاتك.</Alert></div>
      <div className="space-y-4">
        <details className="rounded-3xl border border-dashed border-brand-300 bg-brand-50/40 p-5">
          <summary className="flex cursor-pointer items-center gap-2 font-bold text-brand-700"><Plus className="size-4" /> مقال جديد</summary>
          <ActionForm action={saveArticle} className="mt-5 space-y-4">
            <ArticleFields />
            <SubmitButton size="sm">ضيف المقال</SubmitButton>
          </ActionForm>
        </details>

        {list.map((a) => (
          <Card key={a.id} className="p-0">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-5">
                <span className="font-bold text-brand-900">{a.titleAr}</span>
                <Badge tone={a.published ? "green" : "neutral"}>{a.published ? "منشور" : "مسودة"}</Badge>
              </summary>
              <div className="space-y-4 border-t border-sand-100 p-5">
                <form action={saveArticle} className="space-y-4">
                  <ArticleFields a={a} />
                  <SubmitButton size="sm">احفظ التعديلات</SubmitButton>
                </form>
                <form action={deleteArticle.bind(null, a.id)}>
                  <button className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-rose-600"><Trash2 className="size-4" /> امسح المقال</button>
                </form>
              </div>
            </details>
          </Card>
        ))}
      </div>
    </>
  );
}
