/** Shown next to password fields */
export const PASSWORD_RULES_HINT =
  "Use at least 8 characters, including at least one letter and one number.";

/**
 * Stricter than Firebase’s minimum so users pick a reasonable password.
 * @param {string} password
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validatePasswordForSignup(password) {
  const p = String(password ?? "");
  if (p.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }
  if (!/[a-zA-Z]/.test(p)) {
    return { ok: false, message: "Password must include at least one letter." };
  }
  if (!/[0-9]/.test(p)) {
    return { ok: false, message: "Password must include at least one number." };
  }
  return { ok: true };
}
