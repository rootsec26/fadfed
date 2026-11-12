import "server-only";
import { unstable_cache } from "next/cache";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { articles, services, testimonials } from "@/db/schema";

/**
 * Public catalog queries, cached across requests. These tables change only
 * through doctor admin actions, which revalidate the "catalog" tag — so a
 * public page never has to hit Postgres on every request.
 */

export const listActiveServices = unstable_cache(
  async () =>
    db.select().from(services).where(eq(services.active, true)).orderBy(asc(services.sortOrder)),
  ["active-services"],
  { revalidate: 300, tags: ["catalog"] },
);

export const listPublishedTestimonials = unstable_cache(
  async () => db.select().from(testimonials).where(eq(testimonials.published, true)).orderBy(asc(testimonials.id)),
  ["published-testimonials"],
  { revalidate: 300, tags: ["catalog"] },
);

export const listPublishedArticles = unstable_cache(
  async () => db.select().from(articles).where(eq(articles.published, true)).orderBy(desc(articles.publishedAt)),
  ["published-articles"],
  { revalidate: 300, tags: ["catalog"] },
);

export const getPublishedArticle = unstable_cache(
  async (slug: string) => {
    const [a] = await db
      .select()
      .from(articles)
      .where(eq(articles.slug, slug))
      .limit(1);
    return a && a.published ? a : null;
  },
  ["published-article"],
  { revalidate: 300, tags: ["catalog"] },
);
