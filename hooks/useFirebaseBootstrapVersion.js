"use client";

import { useEffect, useState } from "react";
import { FIREBASE_BOOTSTRAP_EVENT } from "../lib/firebase";

/**
 * Increments when Firebase finishes async bootstrap (e.g. `/api/firebase-web-config`).
 * Use as a `useEffect` dependency so data loaders re-run once `db` / `auth` exist.
 */
export function useFirebaseBootstrapVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const h = () => setV((n) => n + 1);
    if (typeof window !== "undefined") {
      window.addEventListener(FIREBASE_BOOTSTRAP_EVENT, h);
      return () => window.removeEventListener(FIREBASE_BOOTSTRAP_EVENT, h);
    }
    return undefined;
  }, []);
  return v;
}
