import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, ChevronDown, Quote, ShieldCheck, Star } from "lucide-react";
import { listActiveServices, listPublishedTestimonials } from "@/lib/catalog";
import { SectionTitle } from "@/components/site/page-hero";
import { ServiceCard } from "@/components/site/service-card";
import { BreathingVisual } from "@/components/site/breathing-visual";
import { Card, btn } from "@/components/ui";
import { getI18n, pick } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { doctorProfile } from "@/lib/profile";

export default async function HomePage() {
  const [{ t, lang }, settings] = await Promise.all([getI18n(), getSettings()]);
  // Keep the page rendering (with empty sections) if the DB is unreachable.
  const [allServices, reviews] = await Promise.all([
    listActiveServices().catch((err) => {
      console.error("[home] services query failed:", err);
      return [];
    }),
    listPublishedTestimonials().catch((err) => {
      console.error("[home] testimonials query failed:", err);
      return [];
    }),
  ]);
  const svc = allServices.slice(0, 4);
  const h = t.home;
  const currency = pick(lang, settings?.currencyAr ?? "ج.م", settings?.currencyEn ?? "EGP");

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-sand-50 to-sand-50">
        <div className="pointer-events-none absolute -top-20 -start-20 size-96 animate-float rounded-full bg-brand-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 end-0 size-96 rounded-full bg-sage-100/80 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:py-24 lg:grid-cols-2">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-brand-700 shadow-sm">
              <ShieldCheck className="size-4" /> {h.hero.badge}
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.35] text-brand-900 sm:text-5xl">{h.hero.title}</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-ink-soft">{h.hero.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book" className={btn("primary", "lg")}>{h.hero.cta}</Link>
              <Link href="/services" className={btn("outline", "lg")}>{h.hero.secondary}</Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md animate-fade-in">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[3rem] bg-gradient-to-br from-brand-200 via-brand-100 to-sage-100">
              <Image
                src={doctorProfile.photo}
                alt={lang === "ar" ? doctorProfile.photoAltAr : doctorProfile.photoAltEn}
                fill
                priority
                sizes="(max-width: 768px) 90vw, 28rem"
                className="object-cover object-top"
              />
            </div>
            <Card className="absolute inset-x-6 -bottom-8 p-4 text-center sm:inset-x-10">
              <p className="text-lg font-extrabold text-brand-800">{pick(lang, doctorProfile.nameAr, doctorProfile.nameEn)}</p>
              <p className="mt-0.5 text-sm text-ink-soft">{pick(lang, doctorProfile.titleAr, doctorProfile.titleEn)}</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Breathing visual — calm procedural 3D moment under the hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sand-50 via-brand-50/50 to-sand-50 py-14 sm:py-20">
        <div className="pointer-events-none absolute -top-10 end-[10%] size-64 rounded-full bg-brand-100/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 start-[8%] size-56 rounded-full bg-sage-100/60 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-5">
          <SectionTitle title={h.breath.title} subtitle={h.breath.subtitle} />
          <BreathingVisual
            inhaleLabel={h.breath.inhale}
            exhaleLabel={h.breath.exhale}
            captionAriaLabel={h.breath.caption}
          />
        </div>
      </section>

      {/* Intro */}
      <section className="mx-auto max-w-4xl px-5 py-20 text-center">
        <h2 className="text-2xl font-extrabold text-brand-900 sm:text-3xl">{h.intro.title}</h2>
        <p className="mt-5 text-lg leading-9 text-ink-soft">{h.intro.text}</p>
        <ul className="mt-8 flex flex-wrap justify-center gap-3">
          {h.intro.points.map((p) => (
            <li key={p} className="inline-flex items-center gap-2 rounded-full bg-sage-50 px-4 py-2 text-sm font-semibold text-sage-700">
              <CheckCircle2 className="size-4" /> {p}
            </li>
          ))}
        </ul>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-6xl px-5 py-6">
        <SectionTitle title={h.services.title} subtitle={h.services.subtitle} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {svc.map((s) => (
            <ServiceCard key={s.id} service={s} lang={lang} t={t} currency={currency} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/services" className={btn("ghost")}>{h.services.all}</Link>
        </div>
      </section>

      {/* How it works */}
      <section className="mt-16 bg-sage-50 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionTitle title={h.how.title} subtitle={h.how.subtitle} />
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {h.how.steps.map((s, i) => (
              <li key={s.title} className="relative rounded-3xl bg-white p-6 shadow-sm">
                <span className="grid size-10 place-items-center rounded-full bg-brand-600 text-lg font-extrabold text-white">{i + 1}</span>
                <h3 className="mt-4 font-bold text-brand-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-7 text-ink-soft">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Testimonials */}
      {reviews.length > 0 && (
      <section className="mx-auto max-w-6xl px-5 py-20">
        <SectionTitle title={h.testimonials.title} subtitle={h.testimonials.subtitle} />
        <div className="grid gap-5 md:grid-cols-2">
          {reviews.map((r) => (
            <Card key={r.id} className="relative">
              <Quote className="absolute end-6 top-6 size-8 text-brand-100" />
              <div className="flex gap-0.5">
                {Array.from({ length: r.rating }).map((_, i) => (
                  <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mt-4 leading-8 text-ink">{pick(lang, r.textAr, r.textEn)}</p>
              <p className="mt-4 text-sm font-bold text-brand-700">— {pick(lang, r.nameAr, r.nameEn)}</p>
            </Card>
          ))}
        </div>
      </section>
      )}

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 pb-10">
        <SectionTitle title={h.faq.title} />
        <div className="space-y-3">
          {h.faq.items.map((f) => (
            <details key={f.q} className="group rounded-3xl border border-sand-200 bg-white px-6 py-4 open:shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-brand-900">
                {f.q}
                <ChevronDown className="size-5 shrink-0 text-brand-500 transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 leading-8 text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto mt-16 max-w-5xl px-5">
        <div className="rounded-[2.5rem] bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-14 text-center text-white">
          <h2 className="text-2xl font-extrabold sm:text-3xl">{h.cta.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">{h.cta.text}</p>
          <Link href="/book" className={btn("secondary", "lg", "mt-8")}>{h.cta.button}</Link>
        </div>
      </section>
    </>
  );
}
