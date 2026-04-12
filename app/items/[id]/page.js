"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import ContactSellerSection from "../../../components/ContactSellerSection";
import ItemReviewsSection from "../../../components/ItemReviewsSection";
import { ItemExpiryWarning } from "../../../components/ExpiryWarning";
import { useFirebaseAuthUser } from "../../../hooks/useFirebaseAuthUser";
import { digitsOnly } from "../../../lib/digitsOnly";
import {
  isExpired,
  isExpiringSoon,
  newItemExpiresAt,
} from "../../../lib/expiry";
import { getItemImageUrls } from "../../../lib/itemImages";
import { getItemTagList, getItemTitle } from "../../../lib/itemFields";
import { devError } from "../../../lib/devLog";
import { db } from "../../../lib/firebase";
import { getFirestoreDocIdFromParams } from "../../../lib/routeParams";
import { notifyPostExpiringSoonOncePerSession } from "../../../lib/notifications";

export default function ItemDetailPage() {
  const params = useParams();
  const id = getFirestoreDocIdFromParams(params, "id");
  const router = useRouter();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const authUser = useFirebaseAuthUser();
  const currentUserEmail = authUser?.email ?? null;

  useEffect(() => {
    const fetchItem = async () => {
      try {
        if (!db || !id) {
          setItem(null);
          return;
        }

        const snap = await getDoc(doc(db, "items", id));
        if (!snap.exists()) {
          setItem(null);
          return;
        }

        const data = { id: snap.id, ...snap.data() };
        const now = new Date();
        if (isExpired(data.expiresAt, now)) {
          await deleteDoc(doc(db, "items", id));
          setItem(null);
          return;
        }
        if (isExpiringSoon(data.expiresAt, now) && data.email) {
          notifyPostExpiringSoonOncePerSession(data.id, data.email);
        }
        setItem(data);
      } catch (err) {
        devError("ItemDetailPage fetch", err);
        setItem(null);
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  const imageUrls = useMemo(() => getItemImageUrls(item), [item]);

  useEffect(() => {
    setActiveImageIndex(0);
    setImageFailed(false);
  }, [id, item?.id, imageUrls.join("|")]);

  async function handleRenew() {
    if (!db || !id) return;
    setRenewing(true);
    try {
      const next = newItemExpiresAt();
      await updateDoc(doc(db, "items", id), { expiresAt: next });
      setItem((prev) => (prev ? { ...prev, expiresAt: next } : prev));
    } catch (err) {
      alert("Could not renew post.");
    } finally {
      setRenewing(false);
    }
  }

  async function handleDelete() {
    if (!db || !id) return;
    const u = String(currentUserEmail ?? "").trim().toLowerCase();
    const listing = String(item?.email ?? "").trim().toLowerCase();
    if (u && listing && listing !== u) {
      alert("You can only delete your own listing.");
      return;
    }
    if (!confirm("Are you sure you want to delete this?")) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "items", id));
      router.push("/items");
    } catch (err) {
      alert("Could not delete item.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="app-shell">
        <p className="text-neutral-600">Loading…</p>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="app-shell">
        <p className="app-empty">Item not found. Submit request.</p>
      </main>
    );
  }

  const contactForWa = digitsOnly(item.contact);
  const whatsappHref = contactForWa
    ? `https://wa.me/${contactForWa}`
    : null;

  const showExpiryWarning = isExpiringSoon(item.expiresAt);
  const tagList = getItemTagList(item);

  return (
    <main className="app-shell">
      <h1 className="app-title mb-4">{getItemTitle(item)}</h1>

      {showExpiryWarning ? (
        <div className="mb-4 rounded-xl ring-2 ring-amber-400/90">
          <ItemExpiryWarning onRenew={handleRenew} busy={renewing} />
        </div>
      ) : null}

      <div className="mb-5">
        <div className="h-[200px] w-full overflow-hidden rounded-xl bg-neutral-100 sm:h-[220px]">
          {imageUrls.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
              No Image
            </div>
          ) : imageFailed ? (
            <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
              Image failed to load
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrls[activeImageIndex] ?? imageUrls[0]}
              alt="item"
              className="h-full w-full object-contain sm:object-cover"
              onError={() => setImageFailed(true)}
            />
          )}
        </div>
        {imageUrls.length > 1 ? (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {imageUrls.map((url, idx) => (
              <button
                key={`${url}-${idx}`}
                type="button"
                onClick={() => {
                  setActiveImageIndex(idx);
                  setImageFailed(false);
                }}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 bg-neutral-100 ${
                  idx === activeImageIndex
                    ? "border-blue-600 ring-1 ring-blue-600"
                    : "border-transparent opacity-80 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="app-fields mb-6">
        {tagList.length > 0 ? (
          <p>
            <strong className="font-semibold text-neutral-900">Tags:</strong>{" "}
            {tagList.join(", ")}
          </p>
        ) : null}
        <p>
          <strong className="font-semibold text-neutral-900">Price:</strong>{" "}
          {item.price}
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">
            Description:
          </strong>{" "}
          {item.description}
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">Images:</strong>{" "}
          {imageUrls.length === 0
            ? "None"
            : `${imageUrls.length} photo${imageUrls.length === 1 ? "" : "s"}`}
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">Location:</strong>{" "}
          {item.location}
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">Seller Name:</strong>{" "}
          {item.sellerName}
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">Contact:</strong>{" "}
          {item.contact}
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">Email:</strong>{" "}
          {item.email}
        </p>
      </div>

      <ItemReviewsSection itemId={id} />

      <ContactSellerSection />

      <div className="mt-2">
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="app-btn-primary"
          >
            Contact Seller
          </a>
        ) : (
          <p className="app-hint">
            Add a contact number to message on WhatsApp.
          </p>
        )}
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base font-semibold text-red-700 shadow-sm transition hover:bg-red-100 disabled:opacity-60"
        >
          {deleting ? "Deleting…" : "Delete Item"}
        </button>
      </div>
    </main>
  );
}
