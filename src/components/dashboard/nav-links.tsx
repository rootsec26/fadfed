"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/components/ui";
import type { Lang } from "@/lib/i18n";

export type NavItem = { href: string; label: string; labelEn?: string; exact?: boolean; badge?: number };

/** Sidebar on desktop (lg+), collapsible menu button on mobile/tablet. */
export function NavLinks({ items, lang = "ar" }: { items: NavItem[]; lang?: Lang }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Close the mobile menu after navigation (render-time state adjustment).
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }

  const renderItem = (i: NavItem) => {
    const label = lang === "en" && i.labelEn ? i.labelEn : i.label;
    const active = i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(`${i.href}/`);
    return (
      <Link
        key={i.href}
        href={i.href}
        onClick={() => setOpen(false)}
        className={cn(
          "flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition lg:py-2.5",
          active ? "bg-brand-600 text-white shadow-sm" : "text-ink-soft hover:bg-sand-100",
        )}
      >
        {label}
        {!!i.badge && (
          <span className={cn("grid min-w-5 place-items-center rounded-full px-1.5 text-xs", active ? "bg-white/25" : "bg-rose-100 text-rose-700")}>
            {i.badge}
          </span>
        )}
      </Link>
    );
  };

  const totalBadges = items.reduce((n, i) => n + (i.badge ?? 0), 0);

  return (
    <>
      {/* Mobile / tablet: hamburger-style collapsible menu */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-sand-200 bg-white px-4 py-3 text-sm font-bold text-brand-800 shadow-sm transition hover:bg-sand-50"
        >
          <span className="flex items-center gap-2">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
            {lang === "ar" ? "القائمة" : "Menu"}
          </span>
          {totalBadges > 0 && !open && (
            <span className="grid min-w-5 place-items-center rounded-full bg-rose-100 px-1.5 text-xs font-bold text-rose-700">
              {totalBadges}
            </span>
          )}
        </button>
        {open && (
          <nav className="mt-2 flex flex-col gap-1 rounded-2xl border border-sand-200 bg-white p-2 shadow-sm">
            {items.map(renderItem)}
          </nav>
        )}
      </div>

      {/* Desktop: sticky sidebar */}
      <nav className="hidden flex-col gap-1 lg:flex">{items.map(renderItem)}</nav>
    </>
  );
}
