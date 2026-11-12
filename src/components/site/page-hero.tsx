import type { ReactNode } from "react";

export function PageHero({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-sand-50">
      <div className="pointer-events-none absolute -top-24 start-1/2 size-80 rounded-full bg-sage-100/70 blur-3xl" />
      <div className="relative mx-auto max-w-3xl animate-fade-up px-5 py-14 text-center sm:py-20">
        <h1 className="text-3xl font-extrabold text-brand-900 sm:text-4xl">{title}</h1>
        <span className="mx-auto mt-4 block h-1 w-14 rounded-full bg-accent" aria-hidden />
        {subtitle && <p className="mt-4 text-base leading-8 text-ink-soft sm:text-lg">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <h2 className="text-2xl font-extrabold text-brand-900 sm:text-3xl">{title}</h2>
      <span className="mx-auto mt-3 block h-1 w-10 rounded-full bg-accent" aria-hidden />
      {subtitle && <p className="mt-3 leading-8 text-ink-soft">{subtitle}</p>}
    </div>
  );
}
