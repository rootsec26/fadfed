import type { NextConfig } from "next";

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
