import Link from "next/link";
import { Leaf } from "lucide-react";
import { Facebook, TikTok, WhatsApp } from "./social-icons";
import { getI18n, pick } from "@/lib/i18n";
import { doctorProfile } from "@/lib/profile";
import { getSettings } from "@/lib/settings";

/** Only absolute https URLs are allowed — never render an empty/bad href. */
const https = (u: string | null | undefined) => (u && /^https:\/\//.test(u.trim()) ? u.trim() : "");

export async function Footer() {
  const [{ t, lang }, settings] = await Promise.all([getI18n(), getSettings()]);
  const quick = [
    { href: "/home", label: t.nav.home },
    { href: "/about", label: t.nav.about },
    { href: "/services", label: t.nav.services },
    { href: "/blog", label: t.nav.blog },
    { href: "/contact", label: t.nav.contact },
    { href: "/book", label: t.nav.book },
  ];
  const waDigits = (settings.whatsapp || doctorProfile.whatsapp || "").replace(/\D/g, "");
  const socials = [
    { href: https(settings.facebook || doctorProfile.facebook), icon: Facebook, label: t.footer.socialFacebook },
    { href: waDigits ? `https://wa.me/${waDigits}` : "", icon: WhatsApp, label: t.footer.socialWhatsapp },
    { href: https(settings.tiktok || doctorProfile.tiktok), icon: TikTok, label: t.footer.socialTiktok },
  ].filter((x) => x.href);

  return (
    <footer className="mt-24 border-t border-sand-200 bg-sand-100/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-2xl bg-brand-600 text-white"><Leaf className="size-5" /></span>
            <span className="text-lg font-extrabold text-brand-800">{pick(lang, doctorProfile.clinicNameAr, doctorProfile.clinicNameEn)}</span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-7 text-ink-soft">{t.footer.tagline}</p>
          {socials.length > 0 && (
            <div className="mt-5 flex items-center gap-2.5">
              {socials.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid size-10 place-items-center rounded-full bg-brand-700 text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5 motion-safe:transition-transform"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          <h3 className="font-bold text-brand-800">{t.footer.quickLinks}</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-soft">
            {quick.map((l) => (
              <li key={l.href}><Link href={l.href} className="hover:text-brand-700">{l.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-brand-800">{t.footer.legal}</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-soft">
            <li><Link href="/privacy" className="hover:text-brand-700">{t.footer.privacy}</Link></li>
            <li><Link href="/terms" className="hover:text-brand-700">{t.footer.terms}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-sand-200">
        <div className="mx-auto max-w-6xl space-y-1.5 px-5 py-5 text-center text-xs leading-relaxed text-ink-soft">
          <p>{t.disclaimer}</p>
          <p>© {new Date().getFullYear()} {pick(lang, doctorProfile.clinicNameAr, doctorProfile.clinicNameEn)}. {t.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}
