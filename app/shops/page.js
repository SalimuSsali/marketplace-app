"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ShopExpiryWarning } from "../../components/ExpiryWarning";
import {
  deleteExpiredFromList,
  isExpiringSoon,
  newShopExpiresAt,
} from "../../lib/expiry";
import { shopMatchesSearch } from "../../lib/itemFields";
import { getItemPrimaryImageUrl } from "../../lib/itemImages";
import { db } from "../../lib/firebase";
import { notifyShopExpiringSoonOncePerSession } from "../../lib/notifications";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";

export default function ShopsPage() {
  const [shops, setShops] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [renewingId, setRenewingId] = useState(null);

  useEffect(() => {
    const fetchShops = async () => {
      try {
        if (!db) {
          setShops([]);
          return;
        }

        const snapshot = await getDocs(collection(db, "shops"));
        let data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        const now = new Date();
        data = await deleteExpiredFromList(db, "shops", data);
        for (const shop of data) {
          if (isExpiringSoon(shop.expiresAt, now) && shop.email) {
            notifyShopExpiringSoonOncePerSession(shop.id, shop.email);
          }
        }
        setShops(data);
      } catch {
        setShops([]);
      }
    };

    fetchShops();
  }, []);

  async function renewShop(shopId) {
    if (!db) return;
    setRenewingId(shopId);
    try {
      const next = newShopExpiresAt();
      await updateDoc(doc(db, "shops", shopId), { expiresAt: next });
      setShops((prev) =>
        prev.map((s) => (s.id === shopId ? { ...s, expiresAt: next } : s))
      );
    } catch {
      alert("Could not renew shop.");
    } finally {
      setRenewingId(null);
    }
  }

  const filteredShops = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return shops;
    return shops.filter((shop) => shopMatchesSearch(shop, q));
  }, [shops, searchQuery]);

  return (
    <main className="app-shell">
      <h1 className="app-title">Shops</h1>

      <label className="sr-only" htmlFor="shops-search">
        Search shops
      </label>
      <div className="relative mt-4">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-neutral-400"
          aria-hidden
        >
          {String.fromCodePoint(0x1f50d)}
        </span>
        <input
          id="shops-search"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by shop name or location…"
          className="app-search"
        />
      </div>

      <Link
        href="/add"
        className="app-btn-primary mt-4 mb-6 shadow-md"
      >
        Post Item
      </Link>

      {shops.length === 0 ? (
        <p className="app-empty">No shops yet.</p>
      ) : filteredShops.length === 0 ? (
        <p className="app-empty">No matching shops.</p>
      ) : (
        <div className="app-list">
          {filteredShops.map((shop) => {
            const soon = isExpiringSoon(shop.expiresAt);
            const thumb = getItemPrimaryImageUrl(shop);
            return (
              <div
                key={shop.id}
                className={`app-card-link overflow-hidden no-underline text-inherit ${
                  soon ? "ring-2 ring-rose-300/90" : ""
                }`}
              >
                <Link
                  href={`/shops/${shop.id}`}
                  className="block no-underline text-inherit"
                >
                  <div className="app-item-row">
                    <div className="h-[100px] w-full shrink-0 overflow-hidden bg-neutral-100 sm:w-36">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="h-[100px] w-full object-cover sm:w-36"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-[100px] w-full items-center justify-center text-[10px] text-neutral-500">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="app-card-body min-w-0">
                      <div className="app-card-title">{shop.shopName}</div>
                      {Array.isArray(shop.tags) && shop.tags.length > 0 ? (
                        <div className="app-card-meta">{shop.tags.join(", ")}</div>
                      ) : null}
                      <div className="app-card-meta">{shop.location}</div>
                    </div>
                  </div>
                </Link>
                {soon ? (
                  <div
                    className="border-t border-rose-200 bg-rose-50/95 px-3 py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ShopExpiryWarning
                      onRenew={() => renewShop(shop.id)}
                      busy={renewingId === shop.id}
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
