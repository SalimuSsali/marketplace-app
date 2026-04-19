import { digitsOnly } from "./digitsOnly";

/**
 * Optional WhatsApp on post: empty is OK. If filled, only digits / + / spaces allowed; stored as digits only.
 */
export function parseOptionalWhatsapp(input) {
  const trimmed = String(input ?? "").trim();
  if (!trimmed) return { ok: true, digits: null };
  if (/[a-zA-Z]/.test(trimmed)) {
    return {
      ok: false,
      error:
        "WhatsApp number must use digits only (you can use + and spaces for readability).",
    };
  }
  const digits = digitsOnly(trimmed);
  if (digits.length < 8) {
    return {
      ok: false,
      error:
        "Enter a complete WhatsApp number in international format (e.g. +256 7…).",
    };
  }
  return { ok: true, digits };
}

/**
 * WhatsApp deep link: `https://wa.me/<digits>` (no + or spaces).
 * Uses `whatsapp`, `contactPhone`, or legacy `whatsappNumber` only (not generic `contact`).
 */
export function getItemWhatsappHref(item) {
  const raw =
    item?.whatsapp ??
    item?.contactPhone ??
    item?.whatsappNumber ??
    "";
  const d = digitsOnly(raw);
  if (!d) return null;
  return `https://wa.me/${d}`;
}

/**
 * Digits from stored WhatsApp fields only (`whatsapp`, `contactPhone`, legacy `whatsappNumber`).
 * Does not use general `contact` — use that only in {@link getItemWhatsappHref}.
 */
export function getItemStoredWhatsappDigits(item) {
  const raw =
    item?.whatsapp ?? item?.contactPhone ?? item?.whatsappNumber ?? "";
  const d = digitsOnly(raw);
  return d || null;
}
