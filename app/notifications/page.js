"use client";

import { useCallback, useEffect, useState } from "react";
import { useFirebaseAuthSession } from "../../hooks/useFirebaseAuthSession";
import { fetchNotificationsForEmail } from "../../lib/notifications";

function formatTime(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function NotificationsPage() {
  const { user, ready: authReady } = useFirebaseAuthSession();
  const userEmail = user?.email ?? null;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userEmail) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const rows = await fetchNotificationsForEmail(userEmail, 10);
    setItems(rows);
    setLoading(false);
  }, [userEmail]);

  useEffect(() => {
    if (!authReady) return;
    load();
  }, [authReady, load]);

  return (
    <main className="app-shell">
      <h1 className="app-title">Notifications</h1>

      {!authReady ? (
        <p className="mt-4 text-sm text-neutral-500">Loading…</p>
      ) : !userEmail ? (
        <p className="mt-4 text-sm text-neutral-600">
          Sign in to see notifications linked to your account email.
        </p>
      ) : loading ? (
        <p className="mt-4 text-sm text-neutral-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="app-empty mt-4">No notifications yet.</p>
      ) : (
        <ul className="mt-4 list-none divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white p-0 shadow-sm">
          {items.map((n) => (
            <li key={n.id} className="px-4 py-3 first:pt-4 last:pb-4">
              <p className="text-sm font-medium text-neutral-900">{n.message}</p>
              <p className="mt-1 text-xs text-neutral-500">
                {formatTime(n.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
