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
 * API routes: log errors in development only (responses still carry safe messages).
 * @param {string} context
 * @param {unknown} err
 */
export function logServerError(context, err) {
  if (process.env.NODE_ENV !== "development") return;
  console.error(`[${context}]`, err);
}
