import type { NextConfig } from "next";

/** Vercel sets `VERCEL=1`; use the default `.next` output so the platform can cache and serve correctly. */
const onVercel = process.env.VERCEL === "1";

/** App Router marketplace client; add routes under `app/`, shared logic under `lib/`. */
const nextConfig: NextConfig = {
  // Local Windows: alternate distDir avoids occasional EPERM on `.next/types`. Not used on Vercel.
  distDir: onVercel ? ".next" : ".next-buildsafe5",
  // Disable route-type generation (writes under distDir) on local Windows; harmless on Vercel.
  typedRoutes: false,
  async redirects() {
    return [
      { source: "/categories", destination: "/items", permanent: false },
      { source: "/categories/:path*", destination: "/items", permanent: false },
      { source: "/property", destination: "/rentals", permanent: true },
      { source: "/property/:id", destination: "/rentals/:id", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json; charset=utf-8",
          },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
