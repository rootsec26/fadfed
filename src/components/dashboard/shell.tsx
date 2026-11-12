import Link from "next/link";
import type { ReactNode } from "react";
import { Leaf, LogOut } from "lucide-react";
import { logout } from "@/actions/auth";
import { EmergencyBanner } from "@/components/site/emergency-banner";
import { LangToggle } from "@/components/site/lang-toggle";
import type { Lang } from "@/lib/i18n";
import { NavLinks, type NavItem } from "./nav-links";

/**
 * Shared frame for the patient area and the doctor dashboard.
 * Pass `lang` to make the frame bilingual (uses the same lang cookie as the
 * public site); it defaults to Arabic/RTL.
 */
export function DashboardShell({
  title,
  titleEn,
  lang = "ar",
  userName,
  items,
  children,
  showEmergency = false,
}: {
  title: string;
  titleEn?: string;
  lang?: Lang;
  userName: string;
  items: NavItem[];
  children: ReactNode;
  showEmergency?: boolean;
}) {
  const dir = lang === "ar" ? "rtl" : "ltr";
  return (
    <div dir={dir} lang={lang} className="dash-scope min-h-screen bg-sand-50">
      {showEmergency && <EmergencyBanner />}
      <header className="border-b border-sand-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-2xl bg-brand-600 text-white"><Leaf className="size-5" /></span>
            <span className="font-extrabold text-brand-800">{lang === "en" && titleEn ? titleEn : title}</span>
          </Link>
          <div className="flex items-center gap-2">
            <LangToggle />
            <span className="hidden text-sm text-ink-soft sm:inline">{userName}</span>
            <Link href="/home" className="inline-flex min-h-11 items-center rounded-full px-3 py-1.5 text-sm font-semibold text-ink-soft hover:bg-sand-100 lg:min-h-0">
              {lang === "ar" ? "الموقع" : "Website"}
            </Link>
            <form action={logout}>
              <button className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 lg:min-h-0">
                <LogOut className="size-4" /> {lang === "ar" ? "خروج" : "Log out"}
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[230px_1fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <NavLinks items={items} lang={lang} />
        </aside>
        <main className="min-w-0 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
