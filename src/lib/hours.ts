import { asc } from "drizzle-orm";
import { db } from "@/db";
import { availabilityRules } from "@/db/schema";
import type { Lang } from "@/lib/i18n";
import { addDays, formatDate, formatTime } from "@/lib/time";

/** Human-readable working hours per weekday, derived from availability rules. */
export async function getWorkingHours(lang: Lang) {
  const rules = await db.select().from(availabilityRules).orderBy(asc(availabilityRules.startTime));
  // 2024-01-07 was a Sunday → index 0..6 matches weekday numbers
  return Array.from({ length: 7 }, (_, i) => ({
    day: formatDate(addDays("2024-01-07", i), lang, { weekday: "long" }),
    ranges: rules
      .filter((r) => r.weekday === i && r.active)
      .map((r) => `${formatTime(r.startTime, lang)} – ${formatTime(r.endTime, lang)}`),
  }));
}
