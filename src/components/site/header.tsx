import Link from "next/link";
import { Leaf } from "lucide-react";
import { logout } from "@/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { getI18n, pick } from "@/lib/i18n";
import { doctorProfile } from "@/lib/profile";
import { btn } from "@/components/ui";
import { LangToggle } from "./lang-toggle";
import { MobileMenu } from "./mobile-menu";

export async function Header() {
  const [{ t, lang }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  const links = [
    { href: "/home", label: t.nav.home },
    { href: "/about", label: t.nav.about },
    { href: "/services", label: t.nav.services },
    { href: "/blog", label: t.nav.blog },
    { href: "/videos", label: t.nav.videos },
    { href: "/contact", label: t.nav.contact },
  ];
  const dash = user ? (user.role === "doctor" ? { href: "/dashboard", label: t.nav.admin } : { href: "/account", label: t.nav.account }) : null;

  const actions = (bookLabel: string) => (
    <>
      <LangToggle />
      {dash ? (
        <>
          <Link href={dash.href} className={btn("outline", "sm")}>{dash.label}</Link>
          <form action={logout}>
            <button className={btn("ghost", "sm")}>{t.nav.logout}</button>
          </form>
        </>
      ) : (
        <Link href="/login" className={btn("ghost", "sm")}>{t.nav.login}</Link>
      )}
      <Link href="/book" className={btn("primary", "sm", "whitespace-nowrap")}>{bookLabel}</Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-sand-200/70 bg-sand-50/90 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-5">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white">
            <Leaf className="size-5" />
          </span>
          <span className="max-w-[7rem] truncate text-base font-extrabold text-brand-800 sm:max-w-[10rem] lg:max-w-[12rem] xl:max-w-none xl:text-lg">
            {pick(lang, doctorProfile.clinicNameAr, doctorProfile.clinicNameEn)}
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-semibold text-ink-soft transition hover:bg-sand-100 hover:text-brand-700 xl:px-3.5"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-1.5 lg:flex">{actions(t.nav.bookShort)}</div>

        <MobileMenu label={t.nav.menu}>
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-2xl px-4 py-3 font-semibold text-ink hover:bg-sand-100">
                {l.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-sand-200 pt-4">{actions(t.nav.book)}</div>
          </div>
        </MobileMenu>
      </div>
    </header>
  );
}
