"use client";

import { useEffect } from "react";
import { devError } from "../lib/devLog";

const FCM_VAPID = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();

/**
 * Registers after `load` so the first paint isn’t blocked.
 * When FCM is configured, uses `firebase-messaging-sw.js` (same scope as the PWA worker — pick one).
 * Otherwise registers the offline-capable `sw.js`.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
      if (FCM_VAPID) {
        const registerFcm = () => {
          navigator.serviceWorker
            .register("/firebase-messaging-sw.js", { scope: "/" })
            .catch(() => {});
        };
        if (document.readyState === "complete") registerFcm();
        else window.addEventListener("load", registerFcm, { once: true });
        return;
      }
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});
      return;
    }
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const swPath = FCM_VAPID ? "/firebase-messaging-sw.js" : "/sw.js";

    const register = () => {
      navigator.serviceWorker
        .register(swPath, { scope: "/" })
        .then(async (reg) => {
          await reg.update().catch(() => {});
          await navigator.serviceWorker.ready;
        })
        .catch((err) => devError("ServiceWorkerRegister", err));
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
