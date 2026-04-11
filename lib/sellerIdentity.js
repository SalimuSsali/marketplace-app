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
