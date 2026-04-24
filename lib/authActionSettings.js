"use client";

export function getAuthActionCodeSettings() {
  const envOrigin =
    typeof process !== "undefined"
      ? process.env?.NEXT_PUBLIC_SITE_URL || null
      : null;
  const winOrigin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : null;
  const origin = envOrigin || winOrigin || "https://marketplace-app-woad.vercel.app";
  const base = String(origin).replace(/\/$/, "");
  return {
    url: `${base}/auth/action`,
    handleCodeInApp: true,
  };
}
