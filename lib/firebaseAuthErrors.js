/**
 * Turn Firebase Auth errors into something a developer or user can act on.
 * Self-contained (no imports) so builds never fail on a missing sibling module.
 */

/**
 * @returns {string}
 */
function authorizedDomainsTroubleshooting() {
  const hostname =
    typeof window !== "undefined" && window.location?.hostname
      ? window.location.hostname
      : "";
  const lines = [
    "This domain is not authorized for Firebase Auth.",
    "",
    "Fix: Firebase Console → Authentication → Settings → Authorized domains → Add domain.",
    "Add the hostname from your address bar (e.g. localhost, 127.0.0.1, or your production host).",
    "Note: localhost and 127.0.0.1 are separate entries—add the one you actually use.",
  ];
  if (hostname) {
    lines.push("", `Your current hostname: ${hostname}`);
  }
  return lines.join("\n");
}

/**
 * @param {unknown} err
 * @returns {string}
 */
export function formatFirebaseAuthError(err) {
  const code = err && typeof err === "object" ? err.code : null;
  const msg =
    err && typeof err === "object" && typeof err.message === "string"
      ? err.message
      : "";

  if (code === "auth/operation-not-allowed") {
    return "This sign-in method is off in Firebase. Open Authentication → Sign-in method and enable Email/Password.";
  }
  if (code === "auth/email-already-in-use") {
    return "This email is already registered. Open “Sign in” and enter your password, or use a different email to create an account.";
  }
  if (code === "auth/weak-password") {
    return "That password is too weak. Use at least 8 characters with at least one letter and one number.";
  }
  if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
    return "Wrong password or email. Check both and try again.";
  }
  if (code === "auth/user-not-found") {
    return "No account for this email. Use “Create account” or check the spelling.";
  }
  if (code === "auth/invalid-email") {
    return "That email address is not valid.";
  }
  if (code === "auth/missing-password") {
    return "Enter your password.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many attempts. Wait a few minutes, then try again.";
  }
  if (code === "auth/requires-recent-login") {
    return "For security, please sign in again before changing your password or email.";
  }
  if (code === "auth/unauthorized-domain") {
    return authorizedDomainsTroubleshooting();
  }
  if (code === "auth/network-request-failed") {
    return "Network error while contacting Firebase. Check your connection and try again.";
  }
  if (code === "auth/invalid-api-key") {
    return "Invalid Firebase API key. In Firebase Console → Project settings → Your apps, copy the apiKey into NEXT_PUBLIC_FIREBASE_API_KEY and restart the dev server.";
  }

  if (msg && msg.length > 0 && msg.length < 500) return msg;
  return "Sign-in failed. Please try again.";
}
