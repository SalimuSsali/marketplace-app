/**
 * Read Firebase web config: server-injected global first, then Next-inlined env.
 * `globalThis.__NEXT_PUBLIC_FIREBASE__` is set from `app/layout.js` on each response.
 */
export function readFirebaseWebConfigFromEnvironment() {
  const g =
    typeof globalThis !== "undefined" && globalThis.__NEXT_PUBLIC_FIREBASE__
      ? globalThis.__NEXT_PUBLIC_FIREBASE__
      : null;

  const fromG = (key, envName) => {
    const v = g && typeof g === "object" ? g[key] : undefined;
    if (v != null && String(v).trim() !== "") return String(v).trim();
    const e = process.env[envName];
    return e != null && String(e).trim() !== "" ? String(e).trim() : "";
  };

  const cfg = {
    apiKey: fromG("apiKey", "NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: fromG("authDomain", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: fromG("projectId", "NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: fromG("storageBucket", "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: fromG(
      "messagingSenderId",
      "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    ),
    appId: fromG("appId", "NEXT_PUBLIC_FIREBASE_APP_ID"),
  };
  const mid = fromG("measurementId", "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID");
  if (mid) {
    cfg.measurementId = mid;
  }
  return cfg;
}

export function hasRequiredWebConfig(cfg) {
  return Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);
}
