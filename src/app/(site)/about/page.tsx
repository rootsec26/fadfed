import Link from "next/link";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { btn } from "@/components/ui";
import { getI18n, pick } from "@/lib/i18n";
import { doctorProfile } from "@/lib/profile";

export const metadata = { title: "عن الدكتور | About" };

export default async function AboutPage() {
  const { t, lang } = await getI18n();
  const a = t.about;
  return (
    <>
      <PageHero
        title={a.title}
        subtitle={`${pick(lang, doctorProfile.nameAr, doctorProfile.nameEn)} — ${pick(lang, doctorProfile.titleAr, doctorProfile.titleEn)}`}
      />

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[340px_1fr]">
        <div className="mx-auto w-full max-w-xs">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-100 to-sage-100">
            <Image
              src={doctorProfile.photo}
              alt={lang === "ar" ? doctorProfile.photoAltAr : doctorProfile.photoAltEn}
              fill
              priority
              sizes="(max-width: 1024px) 90vw, 340px"
              className="object-cover object-top"
            />
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-extrabold text-brand-900">{a.bioTitle}</h2>
            <div className="mt-4 space-y-4 leading-9 text-ink-soft">
              {a.bio.map((p) => <p key={p}>{p}</p>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-6xl px-5">
        <div className="rounded-[2rem] bg-sage-50 p-8 sm:p-10">
          <h2 className="text-2xl font-extrabold text-brand-900">{a.approachTitle}</h2>
          {a.approach.map((p) => <p key={p} className="mt-4 leading-9 text-ink-soft">{p}</p>)}
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {a.approachPoints.map((p) => (
              <li key={p} className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-brand-800">
                <CheckCircle2 className="size-4 text-brand-500" /> {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-10 text-center">
          <Link href="/book" className={btn("primary", "lg")}>{t.nav.book}</Link>
        </div>
      </section>
    </>
  );
}
