import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { getI18n } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: {
    default: "عيادة سكينة للصحة النفسية | Sakeena Clinic",
    template: "%s | عيادة سكينة",
  },
  description:
    "جلسات علاج نفسي فردية وزوجية وللمراهقين، حضورياً وأونلاين، بخصوصية تامة. Confidential psychological therapy, in clinic or online.",
};

export const viewport: Viewport = { themeColor: "#2f6f6b", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { lang, dir } = await getI18n();
  return (
    <html lang={lang} dir={dir} data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap"
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
