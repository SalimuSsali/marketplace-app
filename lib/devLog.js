/** Console logging only in development; keeps production bundles quiet. */
export function devError(...args) {
  if (process.env.NODE_ENV === "development") {
    console.error(...args);
  }
}

const warnedKeys = new Set();

/** One-time console.warn for misconfiguration (development only). */
export function misconfigWarnOnce(key, message) {
  if (process.env.NODE_ENV !== "development") return;
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(message);
}

/**
 * API routes: always log errors to server logs. Responses still carry safe
 * user-facing messages; this only controls visibility in server logs
 * (Vercel Function Logs, local stdout, etc).
 * @param {string} context
 * @param {unknown} err
 */
export function logServerError(context, err) {
  const name =
    err && typeof err === "object" && err !== null && "name" in err
      ? String(/** @type {{ name?: unknown }} */ (err).name ?? "")
      : "";
  const code =
    err && typeof err === "object" && err !== null && "Code" in err
      ? String(/** @type {{ Code?: unknown }} */ (err).Code ?? "")
      : "";
  const msg = err instanceof Error ? err.message : String(err ?? "");
  console.error(`[${context}] ${code || name || "Error"}: ${msg}`, err);
}
