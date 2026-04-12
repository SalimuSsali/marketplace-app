/** Console logging only in development; keeps production bundles quiet. */
export function devError(...args) {
  if (process.env.NODE_ENV === "development") {
    console.error(...args);
  }
}

const warnedKeys = new Set();

/** One-time console.warn for misconfiguration (dev + prod) so deploy issues are visible. */
export function misconfigWarnOnce(key, message) {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(message);
}

/**
 * Server / API routes: log a short line in production (e.g. Vercel logs), full detail in dev.
 * @param {string} context
 * @param {unknown} err
 */
export function logServerError(context, err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (process.env.NODE_ENV === "development") {
    console.error(`[${context}]`, err);
  } else {
    console.error(`[${context}]`, msg);
  }
}
