import { PageHero } from "@/components/site/page-hero";
import { ServiceCard } from "@/components/site/service-card";
import { Alert } from "@/components/ui";
import { listActiveServices } from "@/lib/catalog";
import { getI18n, pick } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "الخدمات | Services" };

export default async function ServicesPage() {
  const [{ t, lang }, s] = await Promise.all([getI18n(), getSettings()]);
  const list = await listActiveServices();
  return (
    <>
      <PageHero title={t.servicesPage.title} subtitle={t.servicesPage.subtitle} />
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-5 sm:grid-cols-2">
          {list.map((svc) => (
            <ServiceCard key={svc.id} service={svc} lang={lang} t={t} currency={pick(lang, s.currencyAr, s.currencyEn)} />
          ))}
        </div>
        <div className="mt-8"><Alert>{t.servicesPage.note}</Alert></div>
      </section>
    </>
  );
}
