import Link from "next/link";
import { Leaf, MonitorPlay } from "lucide-react";
import { VideoCard, type VideoChrome } from "@/components/site/video-card";
import { btn } from "@/components/ui";
import { getI18n } from "@/lib/i18n";
import {
  countPublishedVideos,
  listPublishedVideos,
  listVideoCategories,
  type PublicVideo,
} from "@/lib/video-queries";

export const metadata = { title: "الفيديوهات | Videos" };

const PAGE_SIZE = 9;

function href(category: string | null, page: number) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (page > 1) params.set("page", String(page));
  const q = params.toString();
  return q ? `/videos?${q}` : "/videos";
}

function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-sand-200/80 bg-white px-6 py-14 text-center shadow-sm">
      <span className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-brand-100 to-sage-100 text-brand-600">
        <MonitorPlay className="size-8" />
      </span>
      <p className="mt-5 text-lg font-bold text-brand-900">{title}</p>
      {hint && <p className="mt-2 text-sm leading-7 text-ink-soft">{hint}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { t, lang } = await getI18n();
  const sp = await searchParams;
  const category = (sp.category ?? "").trim().slice(0, 80) || null;
  const page = Math.max(1, Number(sp.page) || 1);

  const categories = await listVideoCategories();
  const activeCategory = category && categories.includes(category) ? category : null;

  // Featured card: the top featured video inside the active filter, if any.
  const featured = activeCategory
    ? (await listPublishedVideos({ featuredOnly: true, category: activeCategory, limit: 1 }))[0] ?? null
    : (await listPublishedVideos({ featuredOnly: true, limit: 1 }))[0] ?? null;

  const [list, total] = await Promise.all([
    listPublishedVideos({
      category: activeCategory,
      excludeId: featured?.id ?? null,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    countPublishedVideos({ category: activeCategory, excludeId: featured?.id ?? null }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const chrome: VideoChrome = {
    play: t.videos.play,
    watchOn: t.videos.watchOn,
    book: t.videos.book,
    close: t.videos.close,
    upload: t.videos.upload,
  };

  const nothingAtAll = list.length === 0 && !featured && categories.length === 0;
  const gridClass =
    list.length === 1
      ? "mx-auto max-w-md sm:max-w-lg"
      : list.length === 2
        ? "mx-auto max-w-3xl sm:grid-cols-2 lg:grid-cols-2"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <>
      {/* Compact hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-sand-50 to-sand-50">
        <div className="pointer-events-none absolute -top-16 start-[6%] size-56 rounded-full bg-brand-100/80 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 end-[4%] size-64 rounded-full bg-sage-100/80 blur-3xl" />
        <div className="pointer-events-none absolute top-4 end-1/3 size-40 rounded-full bg-accent-soft/70 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-5 pb-9 pt-12 text-center sm:pb-11 sm:pt-16">
          <h1 className="text-3xl font-extrabold text-brand-900 sm:text-4xl">{t.videos.title}</h1>
          <span className="mx-auto mt-4 block h-1 w-14 rounded-full bg-accent" aria-hidden />
          <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-ink-soft sm:text-lg">{t.videos.subtitle}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:pt-10">
        {/* Category chips — server-rendered links, scrollable on mobile */}
        {(categories.length > 0 || activeCategory) && (
          <nav aria-label={t.videos.filterLabel} className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-center gap-2 pe-4">
              <Link
                href={href(null, 1)}
                scroll={false}
                aria-current={!activeCategory ? "true" : undefined}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  !activeCategory
                    ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                    : "border-sand-200 bg-white text-ink-soft hover:border-brand-300 hover:text-brand-700"
                }`}
              >
                {t.videos.all}
              </Link>
              {categories.map((c) => {
                const active = c === activeCategory;
                return (
                  <Link
                    key={c}
                    href={href(c, 1)}
                    scroll={false}
                    aria-current={active ? "true" : undefined}
                    className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                        : "border-sand-200 bg-white text-ink-soft hover:border-brand-300 hover:text-brand-700"
                    }`}
                  >
                    {c}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}

        {nothingAtAll ? (
          <div className="pt-10">
            <EmptyState title={t.videos.empty} hint={t.disclaimer} />
          </div>
        ) : (
          <>
            {featured && (
              <div className="mt-8">
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-accent">
                  <Leaf className="size-4" /> {t.videos.featured}
                </p>
                <VideoCard video={featured} lang={lang} chrome={chrome} preload featured />
              </div>
            )}

            {list.length === 0 ? (
              <div className="pt-10">
                <EmptyState
                  title={activeCategory ? t.videos.emptyCategory : t.videos.empty}
                  action={
                    activeCategory ? (
                      <Link href="/videos" scroll={false} className={btn("outline", "sm")}>
                        {t.videos.all}
                      </Link>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <div className={`mt-8 grid gap-6 ${gridClass}`}>
                {list.map((v: PublicVideo, i: number) => (
                  <VideoCard
                    key={v.id}
                    video={v}
                    lang={lang}
                    chrome={chrome}
                    preload={!featured && i === 0}
                  />
                ))}
              </div>
            )}

            {pages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3">
                {page > 1 && (
                  <Link href={href(activeCategory, page - 1)} scroll={false} className={btn("outline", "sm")}>
                    {t.videos.prev}
                  </Link>
                )}
                <span className="text-sm text-ink-soft">
                  {page} / {pages}
                </span>
                {page < pages && (
                  <Link href={href(activeCategory, page + 1)} scroll={false} className={btn("outline", "sm")}>
                    {t.videos.next}
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
