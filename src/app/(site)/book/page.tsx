import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { PageHero } from "@/components/site/page-hero";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getI18n, pick } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "احجز جلستك | Book" };

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const [{ t, lang }, settings, user, sp] = await Promise.all([getI18n(), getSettings(), getCurrentUser(), searchParams]);
  const list = await db.select().from(services).where(eq(services.active, true)).orderBy(asc(services.sortOrder));
  const wanted = Number(sp.service);

  return (
    <>
      <PageHero title={t.booking.title} subtitle={t.booking.subtitle} />
      <section className="mx-auto max-w-3xl px-5 py-10">
        <Card className="p-5 sm:p-8">
          <BookingWizard
            services={list.map((s) => ({
              id: s.id,
              title: pick(lang, s.titleAr, s.titleEn),
              description: pick(lang, s.descriptionAr, s.descriptionEn),
              price: s.price,
              durationMin: s.durationMin,
              mode: s.mode,
            }))}
            currency={pick(lang, settings.currencyAr, settings.currencyEn)}
            lang={lang}
            t={t}
            initialServiceId={list.some((s) => s.id === wanted) ? wanted : undefined}
            prefill={user && user.role === "patient" ? { name: user.name, email: user.email, phone: user.phone ?? "" } : null}
          />
        </Card>
      </section>
    </>
  );
}
