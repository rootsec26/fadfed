"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";
import type { Lang } from "@/lib/i18n";

export type NavItem = { href: string; label: string; labelEn?: string; exact?: boolean; badge?: number };

/** Sidebar on desktop, horizontally scrollable tabs on mobile. */
export function NavLinks({ items, lang = "ar" }: { items: NavItem[]; lang?: Lang }) {
  const pathname = usePathname();
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
      {items.map((i) => {
        const label = lang === "en" && i.labelEn ? i.labelEn : i.label;
        const active = i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(`${i.href}/`);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={cn(
              "flex shrink-0 items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
              active ? "bg-brand-600 text-white shadow-sm" : "text-ink-soft hover:bg-white",
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
      })}
    </nav>
  );
}
