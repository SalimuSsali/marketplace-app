"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { deleteDoc, doc, getDoc } from "firebase/firestore";
import ContactSellerSection from "../../../components/ContactSellerSection";
import { useFirebaseAuthUser } from "../../../hooks/useFirebaseAuthUser";
import { digitsOnly } from "../../../lib/digitsOnly";
import { db } from "../../../lib/firebase";

/** Same collection as legacy “property” listings. */
const RENTALS_COLLECTION = "properties";

export default function RentalDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const router = useRouter();

  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const authUser = useFirebaseAuthUser();
  const currentUserEmail = authUser?.email ?? null;

  useEffect(() => {
    const fetchRental = async () => {
      try {
        if (!db || !id) {
          setRental(null);
          return;
        }

        const snap = await getDoc(doc(db, RENTALS_COLLECTION, id));
        if (!snap.exists()) {
          setRental(null);
          return;
        }

        setRental({ id: snap.id, ...snap.data() });
      } finally {
        setLoading(false);
      }
    };

    fetchRental();
  }, [id]);

  async function handleDelete() {
    if (!db || !id) return;
    const u = String(currentUserEmail ?? "").trim().toLowerCase();
    const listing = String(rental?.email ?? "").trim().toLowerCase();
    if (u && listing && listing !== u) {
      alert("You can only delete your own listing.");
      return;
    }
    if (!confirm("Are you sure you want to delete this?")) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, RENTALS_COLLECTION, id));
      router.push("/rentals");
    } catch {
      alert("Could not delete rental.");
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

  if (!rental) {
    return (
      <main className="app-shell">
        <p className="app-empty">Rental not found.</p>
        <Link href="/rentals" className="mt-4 inline-block text-sm font-semibold text-emerald-700">
          Back to rentals
        </Link>
      </main>
    );
  }

  const contactForWa = digitsOnly(rental.contact);
  const whatsappHref = contactForWa ? `https://wa.me/${contactForWa}` : null;

  return (
    <main className="app-shell">
      <h1 className="app-title mb-4">{rental.name}</h1>

      <p className="mb-4 text-sm text-neutral-600">
        Need something you don&apos;t see?{" "}
        <Link href="/requests" className="font-semibold text-emerald-700 underline">
          Browse or post requests
        </Link>
        .
      </p>

      <div className="mb-5 h-[150px] w-full overflow-hidden rounded-xl bg-neutral-100">
        {!rental.imageUrl || String(rental.imageUrl).trim() === "" ? (
          <div className="flex h-[150px] w-full items-center justify-center text-sm text-neutral-500">
            No Image
          </div>
        ) : imageFailed ? (
          <div className="flex h-[150px] w-full items-center justify-center text-sm text-neutral-500">
            Image failed to load
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={rental.imageUrl}
            alt=""
            className="h-[150px] w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        )}
      </div>

      <div className="app-fields mb-6">
        <p>
          <strong className="font-semibold text-neutral-900">Price:</strong>{" "}
          {rental.price}
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">
            Description:
          </strong>{" "}
          {rental.description}
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">Location:</strong>{" "}
          {rental.location}
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">Seller Name:</strong>{" "}
          {rental.sellerName}
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">Contact:</strong>{" "}
          {rental.contact}
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">Email:</strong>{" "}
          {rental.email}
        </p>
      </div>

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
          {deleting ? "Deleting…" : "Delete rental"}
        </button>
      </div>
    </main>
  );
}
