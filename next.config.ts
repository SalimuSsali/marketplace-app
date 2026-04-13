import type { NextConfig } from "next";

/**
 * Vercel sets VERCEL=1 — keep default `.next` output on the platform.
 * For local Windows EPERM on `.next`, set NEXT_DIST_DIR or use temp dist (see repo docs).
 */
function getDistDir(): string {
  const explicit = process.env.NEXT_DIST_DIR?.trim().replace(/[/\\]+$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL === "1") return ".next";
  return ".next";
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: getDistDir(),
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
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
