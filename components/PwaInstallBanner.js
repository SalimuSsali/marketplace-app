"use client";

import { useCallback, useEffect, useState } from "react";

function isStandaloneDisplay() {
  if (typeof window === "undefined") return true;
  const m = window.matchMedia("(display-mode: standalone)");
  if (m.matches) return true;
  // iOS Safari PWA
  if (window.navigator.standalone === true) return true;
  return false;
}

/**
 * Chrome/Edge/Android Chromium: captures `beforeinstallprompt` and offers Install.
 * iOS Safari has no this event — users use Share → Add to Home Screen.
 */
export function PwaInstallBanner() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay()) return undefined;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };

    const onInstalled = () => {
      setDeferred(null);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const onInstall = useCallback(async () => {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
    setVisible(false);
  }, [deferred]);

  if (!visible || dismissed || !deferred) return null;

  return (
    <div
      className="fixed left-0 right-0 z-[60] flex justify-center px-3 pb-1"
      style={{ bottom: "calc(3.85rem + env(safe-area-inset-bottom, 0px))" }}
      role="region"
      aria-label="Install app"
    >
      <div className="flex max-w-md flex-1 items-center gap-2 rounded-xl border border-teal-200 bg-white px-3 py-2 shadow-lg">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-neutral-900">Install NEXT Marketplace</p>
          <p className="text-[11px] text-neutral-600">Add to Home Screen for quick access.</p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
          onClick={onInstall}
        >
          Install
        </button>
        <button
          type="button"
          className="shrink-0 rounded-lg px-2 py-1 text-xs text-neutral-500 hover:bg-gray-100"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss install prompt"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
