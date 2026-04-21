"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useFirebaseBootstrapVersion } from "../hooks/useFirebaseBootstrapVersion";

const REVIEW_LIMIT = 100;
const DISPLAY_LIMIT = 5;

function toMillis(v) {
  if (v == null) return 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (v instanceof Date) return v.getTime();
  return 0;
}

export default function ItemReviewsSection({ itemId }) {
  const fbBoot = useFirebaseBootstrapVersion();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userName, setUserName] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const loadReviews = useCallback(async () => {
    if (!db || !itemId) {
      setReviews([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, "reviews"),
        where("itemId", "==", itemId),
        limit(REVIEW_LIMIT)
      );
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      setReviews(rows);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [itemId, fbBoot]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const average =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + Number(r.rating ?? 0), 0) / reviews.length
      : null;

  const displayed = reviews.slice(0, DISPLAY_LIMIT);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!db || !itemId) return;

    const name = userName.trim();
    if (!name) {
      alert("Please enter your name.");
      return;
    }
    if (!rating || rating < 1 || rating > 5) {
      alert("Please choose a rating from 1 to 5.");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "reviews"), {
        itemId,
        rating,
        comment: String(comment ?? "").trim(),
        userName: name,
        createdAt: serverTimestamp(),
      });
      setUserName("");
      setRating(0);
      setComment("");
      await loadReviews();
    } catch {
      alert("Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-neutral-900">Ratings &amp; Reviews</h2>

      <div className="mt-3 flex items-baseline gap-2 border-b border-gray-100 pb-3">
        <span className="text-lg" aria-hidden>
          {"\u2B50"}
        </span>
        {average != null ? (
          <p className="text-sm font-semibold text-neutral-900">
            {average.toFixed(1)} / 5 <span className="ml-2 font-normal text-neutral-500">
              ({reviews.length} review{reviews.length === 1 ? "" : "s"})
            </span>
          </p>
        ) : (
          <p className="text-sm text-neutral-500">No ratings yet</p>
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-neutral-500">Loading reviews…</p>
      ) : displayed.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">No reviews yet. Be the first.</p>
      ) : (
        <ul className="mt-2 list-none p-0">
          {displayed.map((r) => (
            <li
              key={r.id}
              className="border-b border-gray-200 py-3 last:border-b-0"
            >
              <p className="text-sm text-neutral-900">
                <span aria-hidden>{"\u2B50"}</span>{" "}
                <span className="font-semibold">{Number(r.rating ?? 0)}</span>
                <span className="mx-2 text-neutral-300">·</span>
                <span className="font-medium">{r.userName}</span>
              </p>
              {r.comment ? (
                <p className="mt-1 text-sm text-neutral-600">{r.comment}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-800">
          Your Name
          <input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="app-input"
            placeholder="Your name"
            autoComplete="name"
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-neutral-800">
            Rating <span className="text-red-600">*</span>
          </span>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Rating 1 to 5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`rounded-lg px-2 py-1 text-base transition ${
                  rating === n
                    ? "bg-amber-100 ring-2 ring-amber-400"
                    : "bg-gray-50 hover:bg-gray-100"
                }`}
                aria-pressed={rating === n}
                aria-label={`${n} stars`}
              >
                {"\u2B50"}
              </button>
            ))}
          </div>
          {rating === 0 ? (
            <span className="text-xs text-neutral-500">Tap a star to choose 1–5</span>
          ) : null}
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-800">
          Comment <span className="font-normal text-neutral-500">(optional)</span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Share your experience…"
            className="app-input min-h-[5rem]"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="app-btn-primary disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit Review"}
        </button>
      </form>
    </section>
  );
}
