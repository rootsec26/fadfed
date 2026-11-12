import type { NextConfig } from "next";

// CSP allows: Next.js inline bootstrap scripts ('unsafe-inline' — App Router
// has no nonce pipeline here), the Daily.co prebuilt iframe, provider video
// embeds (YouTube nocookie / Vimeo / TikTok / Instagram / Facebook), Cloudinary
// + Supabase storage, and Google Fonts (self-hosted via next/font when possible).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://*.supabase.co https://api.cloudinary.com https://*.daily.co wss://*.daily.co",
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com https://www.tiktok.com https://www.instagram.com https://www.facebook.com https://*.daily.co",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // The dashboard used to live under /admin — keep old links working.
  async redirects() {
    return [{ source: "/admin/:path*", destination: "/dashboard/:path*", permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Allow camera/mic for our origin (pre-join preview) and the Daily iframe.
          {
            key: "Permissions-Policy",
            value: 'camera=(self "https://*.daily.co"), microphone=(self "https://*.daily.co")',
          },
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      // Video thumbnails: YouTube, Vimeo (vumbnail) and Supabase Storage.
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "vumbnail.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
    ],
  },
};

export default nextConfig;
