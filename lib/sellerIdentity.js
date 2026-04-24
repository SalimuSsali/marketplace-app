/**
 * Seller posting identity: all sign-in is email + password (Firebase).
 * Mode is kept in localStorage for back-compat; posting requires a signed-in user.
 * Guests can browse without signing in.
 */

const MODE_KEY = "marketplace_seller_signup_mode";

export const SELLER_SIGNUP_MODE = {
  EMAIL: "email",
  /** @deprecated Google sign-in was removed; kept only so old localStorage values don't break. */
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
  return {
    ok: false,
    message:
      "Sign in on Profile with your email and password before posting. Guests can browse without an account.",
  };
}

/**
 * Marketplace **items** (including shop inventory): requires a signed-in user with an email.
 * @param {import("firebase/auth").User | null} authUser
 * @returns {{ ok: true, email: string } | { ok: false, message: string }}
 */
export function validateGoogleUserForItemPost(authUser) {
  if (!authUser?.uid) {
    return {
      ok: false,
      message: "You must be signed in to post marketplace items.",
    };
  }
  const email = String(authUser.email ?? "").trim();
  if (!email) {
    return {
      ok: false,
      message: "Your account must have an email address to post items.",
    };
  }
  return { ok: true, email };
}
