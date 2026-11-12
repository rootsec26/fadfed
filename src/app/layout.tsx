import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Cairo } from "next/font/google";
import { getI18n } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

// Self-hosted via next/font — no render-blocking request to Google Fonts.
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: {
    default: "فضفض | Fadfed",
    template: "%s | فضفض",
  },
  description:
    "جلسات علاج نفسي فردية وزوجية وللمراهقين، حضورياً وأونلاين، بخصوصية تامة. Confidential psychological therapy, in clinic or online.",
};

export const viewport: Viewport = { themeColor: "#2f6f6b", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { lang, dir } = await getI18n();
  return (
    <html lang={lang} dir={dir} data-scroll-behavior="smooth" className={cairo.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
