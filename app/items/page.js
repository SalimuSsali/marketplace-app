"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { ItemExpiryWarning } from "../../components/ExpiryWarning";
import { SearchHighlightText } from "../../components/SearchHighlightText";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import {
  deleteExpiredFromList,
  isExpiringSoon,
  newItemExpiresAt,
} from "../../lib/expiry";
import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_DEFAULT_LIMIT,
  buildGlobalSearchIndex,
  formatItemPrice,
  rankItemSearch,
} from "../../lib/globalSearch";
import { getItemTitle } from "../../lib/itemFields";
import { getItemPrimaryImageUrl } from "../../lib/itemImages";
import { db } from "../../lib/firebase";
import {
  filterAndSortItemsByNearby,
  itemLocationMatchesNeedle,
  sortItemsByLocationMatch,
} from "../../lib/locationNearby";
import { notifyPostExpiringSoonOncePerSession } from "../../lib/notifications";

function ItemsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [failedImagesById, setFailedImagesById] = useState({});
  const [renewingId, setRenewingId] = useState(null);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearchTerm(q);
  }, [searchParams]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        if (!db) {
          setItems([]);
          return;
        }
        const snapshot = await getDocs(collection(db, "items"));
        let data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        const now = new Date();
        data = await deleteExpiredFromList(db, "items", data);
        for (const item of data) {
          if (isExpiringSoon(item.expiresAt, now) && item.email) {
            notifyPostExpiringSoonOncePerSession(item.id, item.email);
          }
        }
        setItems(data);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  async function renewItem(itemId) {
    if (!db) return;
    setRenewingId(itemId);
    try {
      const next = newItemExpiresAt();
      await updateDoc(doc(db, "items", itemId), { expiresAt: next });
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, expiresAt: next } : i))
      );
    } catch (err) {
      alert("Could not renew post.");
    } finally {
      setRenewingId(null);
    }
  }

  const searchIndex = useMemo(() => buildGlobalSearchIndex(items), [items]);
  const debouncedSearch = useDebouncedValue(searchTerm, SEARCH_DEBOUNCE_MS);
  const debouncedTrim = debouncedSearch.trim();
  const rankedSearch = useMemo(
    () =>
      rankItemSearch(items, debouncedTrim, searchIndex, {
        limit: SEARCH_DEFAULT_LIMIT,
      }),
    [items, debouncedTrim, searchIndex],
  );

  const nearParam = useMemo(
    () => (searchParams.get("near") ?? "").trim(),
    [searchParams],
  );

  /** Keep `?q=` when dropping `?near=` from the home “Find nearby” flow. */
  const hrefClearNear = useMemo(() => {
    const t = searchTerm.trim();
    return t ? `/items?q=${encodeURIComponent(t)}` : "/items";
  }, [searchTerm]);

  const [displayItems, setDisplayItems] = useState(items);
  useEffect(() => {
    if (searchTerm.trim() !== debouncedSearch.trim()) return;

    if (debouncedTrim) {
      let next = rankedSearch.results.map((r) => r.item);
      if (nearParam) {
        next = next.filter((item) =>
          itemLocationMatchesNeedle(item.location, nearParam),
        );
        next = sortItemsByLocationMatch(next, nearParam);
      }
      setDisplayItems(next);
      return;
    }

    if (nearParam) {
      setDisplayItems(filterAndSortItemsByNearby(items, nearParam));
      return;
    }

    setDisplayItems(items);
  }, [
    items,
    debouncedSearch,
    debouncedTrim,
    rankedSearch,
    searchTerm,
    nearParam,
  ]);

  const hasSearch = searchTerm.trim() !== "";
  const searchPending = hasSearch && searchTerm.trim() !== debouncedTrim;
  const suggestionRows = debouncedTrim
    ? rankedSearch.results.slice(0, 5)
    : [];
  const searchNoResults =
    !searchPending &&
    debouncedTrim &&
    rankedSearch.results.length === 0 &&
    items.length > 0;

  const nearOnlyNoResults =
    !searchPending &&
    Boolean(nearParam) &&
    !debouncedTrim &&
    items.length > 0 &&
    displayItems.length === 0;

  const nearRefineNoResults =
    !searchPending &&
    Boolean(nearParam) &&
    Boolean(debouncedTrim) &&
    rankedSearch.results.length > 0 &&
    displayItems.length === 0;

  function openRequestFlow() {
    const t = searchTerm.trim();
    router.push(`/add?mode=request&title=${encodeURIComponent(t)}`);
  }

  return (
    <main className="app-shell relative z-0">
      <h1 className="app-title">Items</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Smart search: title, tags, and description (typo-tolerant).
      </p>

      {nearParam ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-950">
          <span>
            <span className="font-semibold">Near:</span>{" "}
            <span className="text-emerald-900">{nearParam}</span>
            <span className="text-emerald-800/90">
              {" "}
              — sorted by closest text match to this location.
            </span>
          </span>
          <Link
            href={hrefClearNear}
            className="shrink-0 font-semibold text-emerald-800 underline decoration-emerald-600/50 underline-offset-2"
          >
            Clear location
          </Link>
        </div>
      ) : null}

      <label className="sr-only" htmlFor="items-search">
        Search items
      </label>
      <div className="relative z-20 mt-4">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-neutral-400"
          aria-hidden
        >
          🔍
        </span>
        <input
          id="items-search"
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchNoResults) {
              e.preventDefault();
              openRequestFlow();
            }
          }}
          placeholder="Search items…"
          autoComplete="off"
          className="app-search"
        />
        {hasSearch ? (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-md">
            {searchPending ? (
              <p className="px-3 py-2 text-xs text-neutral-500">Searching…</p>
            ) : null}
            {!searchPending &&
            debouncedTrim &&
            rankedSearch.wasChanged ? (
              <p className="border-b border-gray-100 px-3 py-2 text-xs text-neutral-600">
                <span className="font-semibold">Did you mean:</span>{" "}
                <span className="italic">{rankedSearch.correctedQuery}</span>
              </p>
            ) : null}
            {!searchPending && debouncedTrim && suggestionRows.length > 0 ? (
              <ul className="m-0 list-none p-0" role="listbox">
                {suggestionRows.map(({ item }) => (
                  <li key={item.id} role="option">
                    <Link
                      href={`/items/${item.id}`}
                      className="flex gap-2 px-3 py-2.5 text-sm no-underline transition hover:bg-gray-50"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                        {getItemPrimaryImageUrl(item) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getItemPrimaryImageUrl(item)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[9px] text-neutral-400">
                            —
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-neutral-900">
                          <SearchHighlightText
                            text={getItemTitle(item)}
                            terms={rankedSearch.highlightTerms}
                          />
                        </div>
                        <div className="text-xs font-semibold text-emerald-800">
                          {formatItemPrice(item)}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="app-empty">Loading…</p>
      ) : items.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-4 py-6">
          <p className="app-empty text-center">No items yet.</p>
          <button
            type="button"
            onClick={openRequestFlow}
            className="app-btn-primary max-w-[260px] text-sm"
          >
            Post Request
          </button>
        </div>
      ) : searchNoResults ? (
        <div className="mt-8 flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm font-semibold text-neutral-800">
            No results found
          </p>
          <p className="max-w-sm text-xs text-neutral-600">
            Try different keywords. Search matches titles, tags, and descriptions
            and tolerates small typos.
          </p>
          <button
            type="button"
            onClick={openRequestFlow}
            className="app-btn-primary max-w-[260px] text-sm"
          >
            Post a request
          </button>
        </div>
      ) : nearRefineNoResults ? (
        <div className="mt-8 flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm font-semibold text-neutral-800">
            No listings in this area for your search
          </p>
          <p className="max-w-sm text-xs text-neutral-600">
            Your search matched items, but none list a location that matches{" "}
            <span className="font-medium text-neutral-800">{nearParam}</span>.
            Try another keyword or{" "}
            <Link
              href={hrefClearNear}
              className="font-semibold text-emerald-800 underline"
            >
              clear location
            </Link>
            .
          </p>
        </div>
      ) : nearOnlyNoResults ? (
        <div className="mt-8 flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm font-semibold text-neutral-800">
            No items found near this location
          </p>
          <p className="max-w-sm text-xs text-neutral-600">
            No listings matched your area text. Try a broader neighborhood or{" "}
            <Link
              href={`/requests?title=${encodeURIComponent(nearParam)}`}
              className="font-semibold text-emerald-800 underline"
            >
              post a request
            </Link>
            .
          </p>
          <Link
            href={hrefClearNear}
            className="text-sm font-semibold text-emerald-800 underline"
          >
            Clear location filter
          </Link>
        </div>
      ) : (
        <div className="app-list">
          {displayItems.map((item) => {
            const thumbUrl = getItemPrimaryImageUrl(item);
            const hasImage = Boolean(thumbUrl);
            const failed = Boolean(failedImagesById[item.id]);
            const soon = isExpiringSoon(item.expiresAt);

            return (
              <div
                key={item.id}
                className={`app-card-link overflow-hidden no-underline text-inherit ${
                  soon ? "ring-2 ring-amber-400/90" : ""
                }`}
              >
                <Link
                  href={`/items/${item.id}`}
                  className="block no-underline text-inherit"
                >
                  <div className="app-item-row">
                    <div className="h-[150px] w-full shrink-0 overflow-hidden bg-neutral-100 sm:w-64">
                      {!hasImage ? (
                        <div className="flex h-[150px] w-full items-center justify-center text-sm text-neutral-500">
                          No Image
                        </div>
                      ) : failed ? (
                        <div className="flex h-[150px] w-full items-center justify-center text-sm text-neutral-500">
                          Image failed to load
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbUrl}
                          alt="item"
                          className="h-[150px] w-full object-cover"
                          onError={() =>
                            setFailedImagesById((prev) => ({
                              ...prev,
                              [item.id]: true,
                            }))
                          }
                        />
                      )}
                    </div>
                    <div className="app-card-body">
                      <div className="app-card-title">
                        <SearchHighlightText
                          text={getItemTitle(item)}
                          terms={
                            debouncedTrim
                              ? rankedSearch.highlightTerms
                              : []
                          }
                        />
                      </div>
                      <div className="app-card-meta">{formatItemPrice(item)}</div>
                      <div className="app-card-meta">{item.location}</div>
                    </div>
                  </div>
                </Link>
                {soon ? (
                  <div
                    className="border-t border-amber-200 bg-amber-50/95 px-3 py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ItemExpiryWarning
                      onRenew={() => renewItem(item.id)}
                      busy={renewingId === item.id}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default function ItemsPage() {
  return (
    <Suspense
      fallback={
        <main className="app-shell">
          <p className="app-empty">Loading…</p>
        </main>
      }
    >
      <ItemsPageInner />
    </Suspense>
  );
}
