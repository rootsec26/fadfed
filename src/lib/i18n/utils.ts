export type Lang = "ar" | "en";

/** Pick the English value when the language is English and a value exists, otherwise Arabic. */
export function pick(lang: Lang, ar: string, en?: string | null) {
  return lang === "en" && en ? en : ar;
}
