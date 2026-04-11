/**
 * Firebase Auth only allows sign-in from hostnames listed under
 * Authentication → Settings → Authorized domains.
 */

export function getBrowserHostname() {
  if (typeof window === "undefined") return "";
  return window.location.hostname || "";
}
