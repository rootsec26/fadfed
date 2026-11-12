import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

const FALLBACK = "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl() ?? FALLBACK;
  const routes = ["", "/home", "/about", "/services", "/book", "/blog", "/videos", "/contact", "/privacy", "/terms"];
  return routes.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "" || path === "/home" ? "weekly" : "monthly",
    priority: path === "" || path === "/home" ? 1 : path === "/book" || path === "/services" ? 0.8 : 0.5,
  }));
}
