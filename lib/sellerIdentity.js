/**
 * Seller posting identity: chosen on Profile — email+password (Firebase) or Google.
 * Mode is stored in localStorage; posting requires a signed-in user (either method).
 * Guests can browse without signing in.
 */

const MODE_KEY = "marketplace_seller_signup_mode";

export const SELLER_SIGNUP_MODE = {
  EMAIL: "email",
  ACCOUNT: "account",
};

export function isValidEmailFormat(value) {
  const email = String(value ?? "").trim();
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getSellerSignupMode() {
  if (typeof window === "undefined") return null;
  const m = localStorage.getItem(MODE_KEY);
  if (m === SELLER_SIGNUP_MODE.EMAIL || m === SELLER_SIGNUP_MODE.ACCOUNT) {
    return m;
  }
  return null;
}

export function setSellerSignupMode(mode) {
  if (typeof window === "undefined") return;
  if (
    mode === SELLER_SIGNUP_MODE.EMAIL ||
    mode === SELLER_SIGNUP_MODE.ACCOUNT
  ) {
    localStorage.setItem(MODE_KEY, mode);
  }
}

/**
 * @param {{ email?: string | null } | null} authUser
 * @returns {{ ok: true, email: string } | { ok: false, message: string }}
 */
export function validateSellerEmailForPost(authUser) {
  const fromAuth = String(authUser?.email ?? "").trim();
  if (fromAuth) {
    return { ok: true, email: fromAuth };
  }

  const mode = getSellerSignupMode();
  if (mode === SELLER_SIGNUP_MODE.ACCOUNT) {
    return {
      ok: false,
      message:
        "Sign in with Google on Profile (use the Google account option) before posting.",
    };
  }
  if (mode === SELLER_SIGNUP_MODE.EMAIL) {
    return {
      ok: false,
      message:
        "Sign in on Profile with your email and password before posting.",
    };
  }

  return {
    ok: false,
    message:
      "On Profile, choose posting with email or with a Google account, then sign in. Guests can browse without an account.",
  };
}

/**
 * Marketplace **items** (including shop inventory): Google sign-in only, stable seller id.
 * @param {import("firebase/auth").User | null} authUser
 * @returns {{ ok: true, email: string } | { ok: false, message: string }}
 */
export function validateGoogleUserForItemPost(authUser) {
  if (!authUser?.uid) {
    return {
      ok: false,
      message: "You must be signed in with Google to post marketplace items.",
    };
  }
  const providers = authUser.providerData || [];
  const hasGoogle = providers.some((p) => p?.providerId === "google.com");
  if (!hasGoogle) {
    return {
      ok: false,
      message: "Sign in with Google on Profile to post marketplace items.",
    };
  }
  const email = String(authUser.email ?? "").trim();
  if (!email) {
    return {
      ok: false,
      message: "Your Google account must have an email address to post items.",
    };
  }
  return { ok: true, email };
}
