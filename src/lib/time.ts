import type { Lang } from "@/lib/i18n";

/** "HH:MM" → minutes since midnight */
export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** minutes since midnight → "HH:MM" */
export const fromMin = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

export function todayInTz(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function nowMinutesInTz(tz: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  return toMin(parts.replace("24:", "00:"));
}

/** Day of week for a "YYYY-MM-DD" string (0 = Sunday). */
export const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function isValidDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

export function isValidTime(s: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

const locale = (lang: Lang) => (lang === "ar" ? "ar-u-ca-gregory-nu-latn" : "en-US");

export function formatDate(date: string, lang: Lang = "ar", opts?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(
    locale(lang),
    opts ?? { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  ).format(new Date(`${date}T12:00:00Z`));
}

export function formatTime(time: string, lang: Lang = "ar") {
  const [h, m] = time.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const suffix = lang === "ar" ? (h < 12 ? "ص" : "م") : h < 12 ? "AM" : "PM";
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export const WEEKDAYS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/** Minutes from "now" (in the clinic timezone) until a clinic-local date + start time. Negative = in the past. */
export function minutesUntil(date: string, startTime: string, tz: string): number {
  const today = todayInTz(tz);
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 864e5);
  return days * 1440 + toMin(startTime) - nowMinutesInTz(tz);
}

/** "YYYY-MM-DD" + "HH:MM" wall-clock in `tz` → UTC Date. */
export function zonedDateTimeToUtc(date: string, time: string, tz: string): Date {
  const guess = Date.parse(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return new Date(guess - (asUTC - guess));
}

const dtLocale = (lang: Lang) => (lang === "ar" ? "ar-u-ca-gregory-nu-latn" : "en-US");

/** Format a timestamptz instant in the clinic timezone. */
export function formatInstant(date: Date, lang: Lang = "ar", tz = "Asia/Riyadh", opts?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(
    dtLocale(lang),
    opts ?? { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" },
  ).format(date);
}
