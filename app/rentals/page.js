"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, getDocs } from "firebase/firestore";
import { useFirebaseAuthUser } from "../../hooks/useFirebaseAuthUser";
import { useFirebaseBootstrapVersion } from "../../hooks/useFirebaseBootstrapVersion";
import { descriptionWordCount } from "../../lib/descriptionWords";
import { db } from "../../lib/firebase";
import { formatSubmitError } from "../../lib/formatSubmitError";
import { notifyPostCreated } from "../../lib/notifications";
import { validateSellerEmailForPost } from "../../lib/sellerIdentity";
import {
  planItemImageFileBatch,
  uploadItemImageBatch,
} from "../../lib/itemImageUpload";
import {
  MAX_ITEM_IMAGES,
  getItemPrimaryImageUrl,
  imageFieldsForFirestore,
} from "../../lib/itemImages";

/** Firestore collection id stays `properties` so existing listings keep working. */
const RENTALS_COLLECTION = "properties";

/** Rentals: only these types in the picker and drag-drop (matches typical JPEG/PNG/WebP). */
const RENTAL_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const MIN_RENTAL_PHOTOS = 1;
const MAX_RENTAL_PHOTOS = MAX_ITEM_IMAGES;

const ALLOWED_RENTAL_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function isAllowedRentalFile(file) {
  const t = String(file?.type ?? "").trim().toLowerCase();
  if (ALLOWED_RENTAL_MIME.has(t)) return true;
  return /\.(jpe?g|png|webp)$/i.test(String(file?.name ?? ""));
}

function createdAtMs(docData) {
  const c = docData?.createdAt;
  if (c && typeof c.toMillis === "function") return c.toMillis();
  if (c && typeof c.seconds === "number") return c.seconds * 1000;
  if (c instanceof Date) return c.getTime();
  return 0;
}

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
  const [location, setLocation] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [contact, setContact] = useState("");
  /** @type {string[]} Public URLs after R2 upload (stored as Firestore `imageUrls`). */
  const [imageUrls, setImageUrls] = useState([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);
  const authUser = useFirebaseAuthUser();
  const fbBoot = useFirebaseBootstrapVersion();

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
      data.sort((a, b) => createdAtMs(b) - createdAtMs(a));
      setRentals(data);
    } catch {
      setRentals([]);
    } finally {
      setLoading(false);
    }
  }, [fbBoot]);

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

  function resetForm() {
    setName("");
    setPrice("");
    setDescription("");
    setLocation("");
    setSellerName("");
    setContact("");
    setImageUrls([]);
  }

  async function addRentalFiles(fileSource) {
    const raw = Array.from(fileSource ?? []).filter((f) => f instanceof File);
    const filtered = raw.filter(isAllowedRentalFile);
    if (filtered.length < raw.length) {
      alert("Some files were skipped. Only JPG, JPEG, PNG, and WebP are allowed.");
    }
    if (!filtered.length) return;

    const plan = planItemImageFileBatch(filtered, imageUrls.length);
    if (plan.action === "none") return;
    if (plan.action === "full") {
      alert(`You can add up to ${MAX_RENTAL_PHOTOS} images. Remove one to add more.`);
      return;
    }
    if (plan.truncated) {
      alert(
        `Only the first ${plan.batch.length} file(s) were added (max ${MAX_RENTAL_PHOTOS} images).`,
      );
    }

    setImageUploading(true);
    try {
      const uploaded = await uploadItemImageBatch(plan.batch);
      setImageUrls((prev) => [...prev, ...uploaded].filter(Boolean));
    } catch (err) {
      alert(formatSubmitError(err));
    } finally {
      setImageUploading(false);
    }
  }

  async function onRentalImagesChange(e) {
    await addRentalFiles(e.target.files);
    e.target.value = "";
  }

  function removeRentalImageAt(index) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function onDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!imageUploading && imageUrls.length < MAX_RENTAL_PHOTOS) setDragActive(true);
  }

  function onDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  async function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (imageUploading || imageUrls.length >= MAX_RENTAL_PHOTOS) return;
    await addRentalFiles(e.dataTransfer.files);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!db) {
      alert(
        "Database is not configured. Add Firebase keys to .env.local and restart the dev server.",
      );
      return;
    }
    if (imageUrls.length < MIN_RENTAL_PHOTOS) {
      alert(`Add at least ${MIN_RENTAL_PHOTOS} photo (up to ${MAX_RENTAL_PHOTOS}).`);
      return;
    }
    if (imageUrls.length > MAX_RENTAL_PHOTOS) {
      alert(`Remove photos until you have at most ${MAX_RENTAL_PHOTOS}.`);
      return;
    }
    const emailCheck = validateSellerEmailForPost(authUser);
    if (!emailCheck.ok) {
      alert(emailCheck.message);
      return;
    }
    const postEmail = emailCheck.email;
    setSaving(true);
    try {
      const n = price === "" ? null : Number(price);
      const img = imageFieldsForFirestore(imageUrls);
      await addDoc(collection(db, RENTALS_COLLECTION), {
        name: name.trim(),
        price: n === null || Number.isNaN(n) ? 0 : n,
        description: description.trim(),
        imageUrl: img.imageUrl,
        imageUrls: img.imageUrls,
        location: location.trim(),
        sellerName: sellerName.trim(),
        email: postEmail,
        contact: contact.trim(),
        createdAt: new Date(),
      });
      await notifyPostCreated(postEmail);
      resetForm();
      setShowForm(false);
      await loadRentals();
    } catch (err) {
      alert(formatSubmitError(err));
    } finally {
      setSaving(false);
    }
  }

  const canAddMore = !imageUploading && imageUrls.length < MAX_RENTAL_PHOTOS;
  const photoCountOk =
    imageUrls.length >= MIN_RENTAL_PHOTOS && imageUrls.length <= MAX_RENTAL_PHOTOS;

  return (
    <main className="app-shell">
      <header className="mb-1">
        <h1 className="app-title">Rentals</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Looking for something specific?{" "}
          <Link href="/requests" className="font-semibold text-emerald-700 underline">
            Post a request
          </Link>
          .
        </p>
      </header>

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
          placeholder="Search by title or location…"
          autoComplete="off"
          className="app-search"
        />
      </div>

      <button
        type="button"
        onClick={() => setShowForm((v) => !v)}
        className="mt-3 w-full rounded-xl border-2 border-emerald-600 bg-white py-3 text-center text-base font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
      >
        {showForm ? "Close form" : "Post a rental"}
      </button>

      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="mt-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <h2 className="text-base font-semibold text-neutral-900">New listing</h2>

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
            {description.trim().length > 0 && descriptionWordCount(description) < 5 ? (
              <span className="text-xs text-neutral-500">Please enter at least 5 words</span>
            ) : null}
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
              placeholder="Phone or WhatsApp number"
              className="app-input"
            />
          </label>

          <div className="app-label">
            <span>
              Photos ({MIN_RENTAL_PHOTOS}–{MAX_RENTAL_PHOTOS}, JPG / PNG / WebP)
            </span>
            <input
              ref={fileInputRef}
              id="rental-photo-upload"
              type="file"
              accept={RENTAL_IMAGE_ACCEPT}
              multiple
              className="sr-only"
              onChange={onRentalImagesChange}
              disabled={!canAddMore}
              aria-label={`Choose rental photos, ${MIN_RENTAL_PHOTOS} to ${MAX_RENTAL_PHOTOS} images`}
            />
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`rounded-lg border bg-white px-3 py-2.5 shadow-sm transition ${
                dragActive
                  ? "border-blue-500 ring-2 ring-blue-500/25"
                  : "border-gray-200"
              }`}
            >
              <div
                className={`rounded-md border border-dashed px-3 py-5 text-center text-sm ${
                  canAddMore ? "border-gray-300 bg-neutral-50/80" : "border-gray-200 bg-neutral-100"
                }`}
              >
                <p className="text-neutral-600">
                  {imageUploading
                    ? "Uploading…"
                    : canAddMore
                      ? "Drag and drop images here, or use Add Photos."
                      : "Maximum photos reached. Remove one to add more."}
                </p>
                <button
                  type="button"
                  disabled={!canAddMore}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 inline-flex min-h-[40px] items-center justify-center rounded-lg bg-sky-100 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add Photos
                </button>
              </div>
            </div>
            <span className="text-xs font-normal text-neutral-500">
              {imageUrls.length} / {MAX_RENTAL_PHOTOS} uploaded
              {!photoCountOk && !imageUploading ? " — add at least one photo to submit." : ""}
            </span>
            {imageUrls.length ? (
              <div className="mt-1 grid grid-cols-3 gap-2">
                {imageUrls.map((u, i) => (
                  <div
                    key={`${u}-${i}`}
                    className="relative overflow-hidden rounded-xl border border-gray-200 bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={u}
                      alt=""
                      className="h-24 w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => removeRentalImageAt(i)}
                      className="absolute right-1 top-1 rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold text-white hover:bg-black/70"
                      aria-label="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={saving || imageUploading || !photoCountOk}
            className="app-btn-primary font-bold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Submit"}
          </button>
        </form>
      ) : null}

      <section className="mt-6" aria-label="Rental listings">
        {loading ? (
          <p className="app-empty">Loading…</p>
        ) : rentals.length === 0 ? (
          <p className="app-empty">No rentals yet</p>
        ) : filtered.length === 0 ? (
          <p className="app-empty">No matching rentals.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p) => {
              const primaryUrl = getItemPrimaryImageUrl(p);
              const hasImage = Boolean(primaryUrl && String(primaryUrl).trim());
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
                        src={primaryUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
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
      </section>
    </main>
  );
}
