"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addDoc, collection, getDocs } from "firebase/firestore";
import { useFirebaseAuthUser } from "../../hooks/useFirebaseAuthUser";
import { descriptionWordCount } from "../../lib/descriptionWords";
import { db } from "../../lib/firebase";
import { notifyPostCreated } from "../../lib/notifications";
import { validateSellerEmailForPost } from "../../lib/sellerIdentity";

/** Firestore collection id stays `properties` so existing listings keep working. */
const RENTALS_COLLECTION = "properties";

export default function RentalsPage() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failedImagesById, setFailedImagesById] = useState({});

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [location, setLocation] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [contact, setContact] = useState("");
  const authUser = useFirebaseAuthUser();

  const loadRentals = useCallback(async () => {
    try {
      if (!db) {
        setRentals([]);
        return;
      }
      const snapshot = await getDocs(collection(db, RENTALS_COLLECTION));
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setRentals(data);
    } catch {
      setRentals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRentals();
  }, [loadRentals]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rentals;
    return rentals.filter((p) => {
      const n = String(p.name ?? "").toLowerCase();
      const loc = String(p.location ?? "").toLowerCase();
      return n.includes(q) || loc.includes(q);
    });
  }, [rentals, searchQuery]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!db) return;
    const emailCheck = validateSellerEmailForPost(authUser);
    if (!emailCheck.ok) {
      alert(emailCheck.message);
      return;
    }
    const postEmail = emailCheck.email;
    setSaving(true);
    try {
      const n = price === "" ? null : Number(price);
      await addDoc(collection(db, RENTALS_COLLECTION), {
        name: name.trim(),
        price: n === null || Number.isNaN(n) ? 0 : n,
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        location: location.trim(),
        sellerName: sellerName.trim(),
        email: postEmail,
        contact: contact.trim(),
        createdAt: new Date(),
      });
      await notifyPostCreated(postEmail);
      setName("");
      setPrice("");
      setDescription("");
      setImageUrl("");
      setLocation("");
      setSellerName("");
      setContact("");
      setShowForm(false);
      await loadRentals();
    } catch {
      alert("Could not save rental listing.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <h1 className="app-title">Rentals</h1>

      <p className="mt-2 text-sm text-neutral-600">
        Looking for something specific?{" "}
        <Link href="/requests" className="font-semibold text-emerald-700 underline">
          Post a request
        </Link>
        .
      </p>

      <label className="sr-only" htmlFor="rentals-search">
        Search rentals
      </label>
      <div className="relative mt-4">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-neutral-400"
          aria-hidden
        >
          🔍
        </span>
        <input
          id="rentals-search"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search rentals…"
          autoComplete="off"
          className="app-search"
        />
      </div>

      <button
        type="button"
        onClick={() => setShowForm((v) => !v)}
        className="mt-3 w-full rounded-xl bg-emerald-600 py-3 text-center text-base font-bold text-white shadow-sm transition hover:bg-emerald-700"
      >
        Post rental
      </button>

      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="mt-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <label className="app-label">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Listing title"
              className="app-input"
              required
            />
          </label>
          <label className="app-label">
            Price
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              placeholder="Amount"
              className="app-input"
            />
          </label>
          <label className="app-label">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="5 or more words"
              className="app-input min-h-[6rem]"
            />
            {description.trim().length > 0 &&
            descriptionWordCount(description) < 5 ? (
              <span className="text-xs text-neutral-500">
                Please enter at least 5 words
              </span>
            ) : null}
          </label>
          <label className="app-label">
            Image URL
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              type="text"
              placeholder="Filled after upload"
              className="app-input"
            />
          </label>
          <label className="app-label">
            Location
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Area"
              className="app-input"
            />
          </label>
          <label className="app-label">
            Seller name
            <input
              value={sellerName}
              onChange={(e) => setSellerName(e.target.value)}
              placeholder="Enter your name"
              className="app-input"
            />
          </label>
          <label className="app-label">
            Contact
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="app-input"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="app-btn-primary disabled:opacity-60"
          >
            {saving ? "Saving…" : "Submit"}
          </button>
        </form>
      ) : null}

      <div className="mt-6">
        {loading ? (
          <p className="app-empty">Loading…</p>
        ) : rentals.length === 0 ? (
          <p className="app-empty">No rentals yet</p>
        ) : filtered.length === 0 ? (
          <p className="app-empty">No matching rentals.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p) => {
              const hasImage = Boolean(
                p.imageUrl && String(p.imageUrl).trim()
              );
              const failed = Boolean(failedImagesById[p.id]);

              return (
                <Link
                  key={p.id}
                  href={`/rentals/${p.id}`}
                  className="app-card-link block overflow-hidden border border-gray-200 bg-white shadow-sm no-underline text-inherit"
                >
                  <div className="h-[120px] w-full overflow-hidden bg-gray-100">
                    {!hasImage ? (
                      <div className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
                        No Image
                      </div>
                    ) : failed ? (
                      <div className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
                        Image failed
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={() =>
                          setFailedImagesById((prev) => ({
                            ...prev,
                            [p.id]: true,
                          }))
                        }
                      />
                    )}
                  </div>
                  <div className="app-card-body">
                    <div className="app-card-title line-clamp-2">{p.name}</div>
                    <div className="app-card-meta">{p.price}</div>
                    <div className="app-card-meta line-clamp-2">{p.location}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
