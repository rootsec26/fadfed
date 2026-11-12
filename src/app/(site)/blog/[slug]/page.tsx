import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedArticle } from "@/lib/catalog";
import { ArticleBody } from "@/components/site/article-body";
import { Alert, Badge, btn } from "@/components/ui";
import { getI18n, pick } from "@/lib/i18n";
import { formatDate } from "@/lib/time";

type Props = { params: Promise<{ slug: string }> };

const getArticle = (slug: string) => getPublishedArticle(decodeURIComponent(slug));

export async function generateMetadata({ params }: Props) {
  const a = await getArticle((await params).slug);
  return { title: a?.titleAr ?? "مقال" };
}

export default async function ArticlePage({ params }: Props) {
  const [{ t, lang }, { slug }] = await Promise.all([getI18n(), params]);
  const a = await getArticle(slug);
  if (!a) notFound();

  return (
    <article className="mx-auto max-w-3xl animate-fade-up px-5 py-14">
      <Link href="/blog" className="text-sm font-semibold text-brand-600 hover:underline">← {t.blog.back}</Link>
      <div className="mt-6 flex items-center gap-3 text-sm text-ink-soft">
        <Badge tone="blue">{a.category}</Badge>
        <time>{formatDate(a.publishedAt.toISOString().slice(0, 10), lang)}</time>
      </div>
      <h1 className="mt-4 text-3xl font-extrabold leading-[1.5] text-brand-900 sm:text-4xl">{pick(lang, a.titleAr, a.titleEn)}</h1>
      <div className="mt-8"><ArticleBody content={pick(lang, a.contentAr, a.contentEn)} /></div>
      <div className="mt-10"><Alert tone="warning">{t.disclaimer}</Alert></div>
      <div className="mt-10 text-center"><Link href="/book" className={btn("primary", "lg")}>{t.nav.book}</Link></div>
    </article>
  );
}
