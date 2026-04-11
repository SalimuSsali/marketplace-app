/** User-facing message for form/API failures; avoids dumping huge error blobs. */
export function formatSubmitError(err) {
  const msg = err?.message;
  if (typeof msg === "string" && msg.length > 0 && msg.length < 400) return msg;
  return "Something went wrong. Check the browser console (F12) for details.";
}
