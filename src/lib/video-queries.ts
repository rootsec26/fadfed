import "server-only";
import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { videos } from "@/db/schema";

/** Columns the public site needs — never select storage internals. */
const publicCols = {
  id: videos.id,
  titleAr: videos.titleAr,
  titleEn: videos.titleEn,
  descriptionAr: videos.descriptionAr,
  descriptionEn: videos.descriptionEn,
  sourceType: videos.sourceType,
  videoUrl: videos.videoUrl,
  thumbnailUrl: videos.thumbnailUrl,
  category: videos.category,
  durationSeconds: videos.durationSeconds,
  isFeatured: videos.isFeatured,
} as const;

export type VideoQueryOpts = {
  featuredOnly?: boolean;
  category?: string | null;
  /** Hide one row (e.g. the featured card already shown above the grid). */
  excludeId?: number | null;
  limit?: number;
  offset?: number;
};

function where(opts: VideoQueryOpts) {
  return and(
    eq(videos.isPublished, true),
    opts.featuredOnly ? eq(videos.isFeatured, true) : undefined,
    opts.category ? eq(videos.category, opts.category) : undefined,
    opts.excludeId ? ne(videos.id, opts.excludeId) : undefined,
  );
}

/** Published videos in display order. Always limited — never fetches all rows. */
export async function listPublishedVideos(opts: VideoQueryOpts = {}) {
  const { limit = 12, offset = 0 } = opts;
  return db
    .select(publicCols)
    .from(videos)
    .where(where(opts))
    .orderBy(asc(videos.sortOrder), asc(videos.id))
    .limit(limit)
    .offset(offset);
}

export type PublicVideo = Awaited<ReturnType<typeof listPublishedVideos>>[number];

export async function countPublishedVideos(opts: VideoQueryOpts = {}) {
  const [row] = await db.select({ n: count() }).from(videos).where(where(opts));
  return row?.n ?? 0;
}

/** Distinct non-empty categories across published videos, alphabetical. */
export async function listVideoCategories(): Promise<string[]> {
  const rows = await db
    .select({ category: videos.category })
    .from(videos)
    .where(and(eq(videos.isPublished, true), sql`${videos.category} is not null and ${videos.category} <> ''`))
    .groupBy(videos.category)
    .orderBy(asc(videos.category));
  return rows.map((r) => r.category).filter((c): c is string => Boolean(c));
}
