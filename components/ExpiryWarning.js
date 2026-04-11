"use client";

export function ItemExpiryWarning({ onRenew, busy }) {
  return (
    <div className="rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2 shadow-sm">
      <p className="text-center text-xs font-semibold text-amber-900">
        Your post is about to expire
      </p>
      <button
        type="button"
        onClick={onRenew}
        disabled={busy}
        className="mt-2 w-full rounded-lg bg-green-600 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-60"
      >
        {busy ? "Renewing…" : "Renew Post"}
      </button>
    </div>
  );
}

export function ShopExpiryWarning({ onRenew, busy }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 shadow-sm">
      <p className="text-center text-xs font-semibold text-rose-900">
        Shop expiring soon
      </p>
      <button
        type="button"
        onClick={onRenew}
        disabled={busy}
        className="mt-2 w-full rounded-lg bg-green-600 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-60"
      >
        {busy ? "Renewing…" : "Renew Shop"}
      </button>
    </div>
  );
}
