"use client";

import { useEffect } from "react";

/**
 * Registers after `load` so the first paint isn’t blocked.
 * `navigator.serviceWorker.ready` helps Chromium treat the app as installable once active.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(async (reg) => {
          await reg.update().catch(() => {});
          await navigator.serviceWorker.ready;
        })
        .catch(() => {});
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
