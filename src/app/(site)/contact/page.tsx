import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { ContactForm } from "@/components/site/contact-form";
import { PageHero } from "@/components/site/page-hero";
import { Card, btn } from "@/components/ui";
import { getI18n, pick } from "@/lib/i18n";
import { getWorkingHours } from "@/lib/hours";
import { doctorProfile } from "@/lib/profile";

export const metadata = { title: "كلمنا | Contact" };

export default async function ContactPage() {
  const { t, lang } = await getI18n();
  const hours = await getWorkingHours(lang);
  const c = t.contact;
  const wa = doctorProfile.whatsapp
    ? `https://wa.me/${doctorProfile.whatsapp}?text=${encodeURIComponent(c.whatsappText)}`
    : null;
  const address = lang === "ar" ? doctorProfile.addressAr : doctorProfile.addressEn;
  const hasContact = Boolean(doctorProfile.phone || doctorProfile.email || address);

  return (
    <>
      <PageHero title={c.title} subtitle={c.subtitle} />
      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-2">
        <Card className="p-7"><ContactForm t={c} /></Card>

        <div className="space-y-5">
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className={btn("whatsapp", "lg", "w-full")}>
              <MessageCircle className="size-5" /> {c.whatsapp}
            </a>
          )}
          <Card className="space-y-4">
            {address && (
              <div className="flex gap-3">
                <MapPin className="mt-1 size-5 shrink-0 text-brand-500" />
                <div><p className="font-bold text-brand-900">{c.address}</p><p className="mt-1 text-sm leading-7 text-ink-soft">{address}</p></div>
              </div>
            )}
            {hasContact && (
              <div className="flex gap-3">
                <Phone className="mt-1 size-5 shrink-0 text-brand-500" />
                <div>
                  <p className="font-bold text-brand-900">{c.call}</p>
                  {doctorProfile.phone && <p className="mt-1 text-sm text-ink-soft" dir="ltr">{doctorProfile.phone}</p>}
                  {doctorProfile.email && <p className="text-sm text-ink-soft" dir="ltr">{doctorProfile.email}</p>}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Clock className="mt-1 size-5 shrink-0 text-brand-500" />
              <div className="flex-1">
                <p className="font-bold text-brand-900">{c.hours}</p>
                <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                  {hours.map((h) => (
                    <li key={h.day} className="flex justify-between gap-4">
                      <span>{h.day}</span>
                      <span dir="ltr" className="text-end">{h.ranges.length ? h.ranges.join(" · ") : c.closed}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}
