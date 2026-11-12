import Link from "next/link";
import Image from "next/image";
import { and, asc, count, eq, ilike, isNotNull, ne, or } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { ToastProvider } from "@/components/admin/toast";
import { VideoRowActions } from "@/components/admin/video-row-actions";
import { PageTitle } from "@/components/dashboard/shell";
import { Badge, btn, Card, Input, Select } from "@/components/ui";
import { requireDoctor } from "@/lib/auth";
import { getI18n, pick, type Lang } from "@/lib/i18n";
import { adminVideosT } from "@/lib/i18n/admin-videos";
import { formatDate } from "@/lib/time";

export const metadata = { title: "الفيديوهات", robots: { index: false } };

const PAGE_SIZE = 12;

function hrefWith(base: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...patch })) {
    if (v) p.set(k, v);
  }
  const s = p.toString();
  return `/dashboard/videos${s ? `?${s}` : ""}`;
}

export default async function AdminVideosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireDoctor();
  const { lang } = await getI18n();
  const t = adminVideosT(lang);
  const SOURCE_LABEL = {
    youtube: t.sourceYoutube,
    vimeo: t.sourceVimeo,
    tiktok: t.sourceTiktok,
    instagram: t.sourceInstagram,
    facebook: t.sourceFacebook,
    direct: t.sourceDirect,
    external: t.sourceExternal,
    upload: t.sourceUpload,
  } as const;
  const sp = await searchParams;

  const q = (sp.q ?? "").trim().slice(0, 100);
  const status = sp.status === "published" || sp.status === "draft" ? sp.status : "";
  const category = (sp.category ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);

  const conds = [];
  if (q) {
    const like = `%${q}%`;
    conds.push(or(ilike(videos.titleAr, like), ilike(videos.titleEn, like), ilike(videos.category, like)));
  }
  if (status === "published") conds.push(eq(videos.isPublished, true));
  if (status === "draft") conds.push(eq(videos.isPublished, false));
  if (category) conds.push(eq(videos.category, category));
  const where = conds.length ? and(...conds) : undefined;

  const [rows, [{ n: total }], cats] = await Promise.all([
    db
      .select({
        id: videos.id,
        titleAr: videos.titleAr,
        titleEn: videos.titleEn,
        thumbnailUrl: videos.thumbnailUrl,
        sourceType: videos.sourceType,
        isPublished: videos.isPublished,
        isFeatured: videos.isFeatured,
        category: videos.category,
        createdAt: videos.createdAt,
      })
      .from(videos)
      .where(where)
      .orderBy(asc(videos.sortOrder), asc(videos.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(videos).where(where),
    db.selectDistinct({ c: videos.category }).from(videos).where(and(isNotNull(videos.category), ne(videos.category, ""))),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = { q: q || undefined, status: status || undefined, category: category || undefined };

  return (
    <ToastProvider>
      <PageTitle
        title={t.videos}
        action={
          <Link href="/dashboard/videos/new" className={btn("primary", "sm")}>
            <Plus className="size-4" /> {t.addVideo}
          </Link>
        }
      />

      {/* Filters */}
      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <Input name="q" defaultValue={q} placeholder={t.searchPlaceholder} className="w-full sm:w-64" />
        <Select name="status" defaultValue={status} className="w-auto">
          <option value="">{t.statusAll}</option>
          <option value="published">{t.statusPublished}</option>
          <option value="draft">{t.statusDraft}</option>
        </Select>
        <Select name="category" defaultValue={category} className="w-auto">
          <option value="">{t.filterAll}</option>
          {cats.map((c) => (
            <option key={c.c} value={c.c ?? ""}>{c.c}</option>
          ))}
        </Select>
        <button className={btn("secondary", "sm")}>{lang === "ar" ? "دوّر" : "Search"}</button>
      </form>

      {rows.length === 0 ? (
        <Card className="py-14 text-center">
          <p className="text-ink-soft">{t.empty}</p>
          <Link href="/dashboard/videos/new" className={`${btn("primary", "sm")} mt-4`}>{t.addVideo}</Link>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-sand-100 text-start text-xs text-ink-soft">
                <th className="px-4 py-3 text-start font-semibold">{t.colVideo}</th>
                <th className="px-4 py-3 text-start font-semibold">{t.colStatus}</th>
                <th className="px-4 py-3 text-start font-semibold">{t.colSource}</th>
                <th className="px-4 py-3 text-start font-semibold">{t.colDate}</th>
                <th className="px-4 py-3 text-end font-semibold">{t.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-100">
              {rows.map((v) => (
                <tr key={v.id} className="align-middle">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-100">
                        {v.thumbnailUrl ? (
                          <Image src={v.thumbnailUrl} alt="" fill sizes="80px" className="object-cover" />
                        ) : (
                          <div className="grid size-full place-items-center text-[10px] text-brand-400">—</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/dashboard/videos/${v.id}/edit`} className="block truncate font-bold text-brand-900 hover:underline">
                          {pick(lang as Lang, v.titleAr, v.titleEn)}
                        </Link>
                        {v.category && <p className="truncate text-xs text-ink-soft">{v.category}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone={v.isPublished ? "green" : "neutral"}>{v.isPublished ? t.statusPublished : t.statusDraft}</Badge>
                      {v.isFeatured && <Badge tone="amber">{t.featured}</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {SOURCE_LABEL[v.sourceType as keyof typeof SOURCE_LABEL] ?? v.sourceType}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft">
                    {formatDate(v.createdAt.toISOString().slice(0, 10), lang, { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/dashboard/videos/${v.id}/edit`}
                        className="inline-flex min-h-11 items-center rounded-full px-3.5 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-50 lg:min-h-0"
                      >
                        {lang === "ar" ? "تعديل" : "Edit"}
                      </Link>
                      <VideoRowActions id={v.id} isPublished={v.isPublished} isFeatured={v.isFeatured} t={t} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-ink-soft">
          <span>
            {t.page} {page} {t.of} {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={hrefWith(base, { page: String(page - 1) })} className={btn("outline", "sm")}>
                {t.prev}
              </Link>
            )}
            {page < pages && (
              <Link href={hrefWith(base, { page: String(page + 1) })} className={btn("outline", "sm")}>
                {t.next}
              </Link>
            )}
          </div>
        </div>
      )}
    </ToastProvider>
  );
}
