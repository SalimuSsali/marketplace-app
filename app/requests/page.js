"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useFirebaseBootstrapVersion } from "../../hooks/useFirebaseBootstrapVersion";

function RequestsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fbBoot = useFirebaseBootstrapVersion();
  const prefillTimerRef = useRef(null);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [titleFromQuery, setTitleFromQuery] = useState("");

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        if (!db) {
          setRequests([]);
          return;
        }

        const snapshot = await getDocs(collection(db, "requests"));
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setRequests(data);
      } catch {
        setRequests([]);
      }
    };

    fetchRequests();
  }, [fbBoot]);

  useEffect(() => {
    const t = searchParams.get("title");
    setTitleFromQuery(t && t.trim() ? t.trim() : "");
  }, [searchParams]);

  useEffect(() => {
    if (prefillTimerRef.current) {
      clearTimeout(prefillTimerRef.current);
      prefillTimerRef.current = null;
    }
    if (!titleFromQuery) return;

    const delayMs = 700;
    prefillTimerRef.current = setTimeout(() => {
      prefillTimerRef.current = null;
      router.replace(
        `/add?mode=request&title=${encodeURIComponent(titleFromQuery)}`
      );
    }, delayMs);

    return () => {
      if (prefillTimerRef.current) {
        clearTimeout(prefillTimerRef.current);
        prefillTimerRef.current = null;
      }
    };
  }, [titleFromQuery, router]);

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((req) => {
      const title = String(req.title ?? "").toLowerCase();
      const loc = String(req.location ?? "").toLowerCase();
      return title.includes(q) || loc.includes(q);
    });
  }, [requests, searchQuery]);

  return (
    <main className="app-shell">
      <h1 className="app-title">Requests</h1>

      <p className="mt-2 text-sm text-neutral-600">
        Browsing spaces to rent?{" "}
        <Link href="/rentals" className="font-semibold text-emerald-700 underline">
          View rentals
        </Link>
        .
      </p>

      {titleFromQuery ? (
        <p className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-center text-sm text-emerald-900">
          Be the first to request
        </p>
      ) : null}

      <label className="sr-only" htmlFor="requests-search">
        Search requests
      </label>
      <div className="relative mt-4">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-neutral-400"
          aria-hidden
        >
          🔍
        </span>
        <input
          id="requests-search"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title or location…"
          className="app-search"
        />
      </div>

      <Link
        href={
          titleFromQuery
            ? `/add?mode=request&title=${encodeURIComponent(titleFromQuery)}`
            : "/add"
        }
        className="app-btn-primary mt-4 mb-6 shadow-md"
      >
        Post Request
      </Link>

      {requests.length === 0 ? (
        <p className="app-empty">No requests yet.</p>
      ) : filteredRequests.length === 0 ? (
        <p className="app-empty">No matching requests.</p>
      ) : (
        <div className="app-list">
          {filteredRequests.map((req) => (
            <Link
              key={req.id}
              href={`/requests/${req.id}`}
              className="app-card-link no-underline text-inherit"
            >
              <div className="app-card-body">
                <div className="app-card-title">{req.title}</div>
                <div className="app-card-meta">{req.budget}</div>
                <div className="app-card-meta">{req.location}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

export default function RequestsPage() {
  return (
    <Suspense
      fallback={
        <main className="app-shell">
          <p className="text-sm text-neutral-500">Loading…</p>
        </main>
      }
    >
      <RequestsPageInner />
    </Suspense>
  );
}
