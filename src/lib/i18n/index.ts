import { cookies } from "next/headers";
import { ar, type Dictionary } from "./ar";
import { en } from "./en";
import type { Lang } from "./utils";

export type { Lang };
export { pick } from "./utils";

const dictionaries: Record<Lang, Dictionary> = { ar, en };

/** Server-side helper: `const { t, lang, dir } = await getI18n()` */
export async function getI18n() {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  const lang: Lang = value === "en" ? "en" : "ar";
  return { lang, dir: lang === "ar" ? ("rtl" as const) : ("ltr" as const), t: dictionaries[lang] };
}

export const LANG_COOKIE = "lang";

export type { Dictionary };
