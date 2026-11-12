import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { EmergencyBanner } from "@/components/site/emergency-banner";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { getI18n } from "@/lib/i18n";
import { doctorProfile } from "@/lib/profile";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const { t } = await getI18n();
  const wa = doctorProfile.whatsapp
    ? `https://wa.me/${doctorProfile.whatsapp}?text=${encodeURIComponent(t.contact.whatsappText)}`
    : null;
  return (
    <>
      <EmergencyBanner />
      <Header />
      <main>{children}</main>
      <Footer />
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp"
          className="fixed bottom-5 end-5 z-30 grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/15 transition hover:scale-105"
        >
          <MessageCircle className="size-7" />
        </a>
      )}
    </>
  );
}
