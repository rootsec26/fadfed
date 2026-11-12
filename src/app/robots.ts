import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

const FALLBACK = "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl() ?? FALLBACK;
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/account", "/session", "/api", "/appointments"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
