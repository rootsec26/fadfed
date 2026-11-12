import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { PageHero } from "@/components/site/page-hero";
import { Badge, Card } from "@/components/ui";
import { getI18n, pick } from "@/lib/i18n";
import { formatDate } from "@/lib/time";

export const metadata = { title: "المقالات | Articles" };

export default async function BlogPage() {
  const { t, lang } = await getI18n();
  const list = await db.select().from(articles).where(eq(articles.published, true)).orderBy(desc(articles.publishedAt));
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  return (
    <>
      <PageHero title={t.blog.title} subtitle={t.blog.subtitle} />
      <section className="mx-auto max-w-6xl px-5 py-14">
        {list.length === 0 && <p className="text-center text-ink-soft">{t.blog.empty}</p>}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a) => (
            <Link key={a.id} href={`/blog/${a.slug}`} className="group">
              <Card className="flex h-full flex-col p-0 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-brand-200/40">
                <div className="h-36 rounded-t-3xl bg-gradient-to-br from-brand-100 via-sage-100 to-sand-100" />
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center justify-between text-xs text-ink-soft">
                    <Badge tone="blue">{a.category}</Badge>
                    <time>{formatDate(a.publishedAt.toISOString().slice(0, 10), lang, { day: "numeric", month: "short", year: "numeric" })}</time>
                  </div>
                  <h2 className="mt-3 text-lg font-bold leading-8 text-brand-900">{pick(lang, a.titleAr, a.titleEn)}</h2>
                  <p className="mt-2 flex-1 text-sm leading-7 text-ink-soft">{pick(lang, a.excerptAr, a.excerptEn)}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600">
                    {t.common.readMore} <Arrow className="size-4 transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
