/**
 * Firebase Auth only allows sign-in from hostnames listed under
 * Authentication → Settings → Authorized domains.
 */

export function authorizedDomainsTroubleshooting() {
  return [
    "This domain is not authorized for Firebase Auth.",
    "",
    "Fix: Firebase Console → Authentication → Settings → Authorized domains → Add domain.",
    "Add the hostname from your address bar (e.g. localhost, 127.0.0.1, or your-app.vercel.app).",
    "Note: localhost and 127.0.0.1 are separate entries—add the one you actually use.",
  ].join("\n");
}
