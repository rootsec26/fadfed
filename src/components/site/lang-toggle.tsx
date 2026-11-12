import { Languages } from "lucide-react";
import { setLanguage } from "@/actions/auth";
import { getI18n } from "@/lib/i18n";

export async function LangToggle() {
  const { lang, t } = await getI18n();
  return (
    <form action={setLanguage}>
      <input type="hidden" name="lang" value={lang === "ar" ? "en" : "ar"} />
      <button
        type="submit"
        className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-ink-soft transition hover:bg-sand-100 lg:min-h-0"
      >
        <Languages className="size-4" />
        {t.nav.switchLang}
      </button>
    </form>
  );
}
