/** Strip non-digits (e.g. for tel: links from formatted phone strings). */
export function digitsOnly(input) {
  return String(input ?? "").replace(/[^\d]/g, "");
}
