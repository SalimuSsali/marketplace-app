"use client";

import { useMemo } from "react";
import { isExpired, toDate } from "../lib/expiry";

/**
 * Expiry line derived only from Firestore `expiresAt` (no client countdown timers).
 */
export function ItemExpiryCountdown({ expiresAt, className = "" }) {
  const label = useMemo(() => {
    const d = toDate(expiresAt);
    if (!d) return null;
    const now = new Date();
    if (isExpired(expiresAt, now)) return "expired";
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }, [expiresAt]);

  if (label == null) return null;

  return (
    <p
      className={`text-[11px] font-semibold tabular-nums text-neutral-600 ${className}`.trim()}
      aria-live="polite"
    >
      {label === "expired" ? (
        <span className="text-red-600">Expired</span>
      ) : (
        <span>Expires {label}</span>
      )}
    </p>
  );
}
