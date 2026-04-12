"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { deleteDoc, doc, getDoc } from "firebase/firestore";
import ContactSellerSection from "../../../components/ContactSellerSection";
import { useFirebaseAuthUser } from "../../../hooks/useFirebaseAuthUser";
import { digitsOnly } from "../../../lib/digitsOnly";
import { devError } from "../../../lib/devLog";
import { db } from "../../../lib/firebase";
import { getFirestoreDocIdFromParams } from "../../../lib/routeParams";
import { getItemImageUrls } from "../../../lib/itemImages";

export default function ServiceDetailPage() {
  const params = useParams();
  const id = getFirestoreDocIdFromParams(params, "id");
  const router = useRouter();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const authUser = useFirebaseAuthUser();
  const currentUserEmail = authUser?.email ?? null;

  useEffect(() => {
    const fetchService = async () => {
      try {
        if (!db || !id) {
          setService(null);
          return;
        }

        const snap = await getDoc(doc(db, "services", id));
        if (!snap.exists()) {
          setService(null);
          return;
        }

        setService({ id: snap.id, ...snap.data() });
      } catch (err) {
        devError("ServiceDetailPage fetch", err);
        setService(null);
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [id]);

  if (loading) {
    return (
      <main className="app-shell">
        <p className="text-neutral-600">Loading…</p>
      </main>
    );
  }

  if (!service) {
    return (
      <main className="app-shell">
        <p className="app-empty">Service not found.</p>
      </main>
    );
  }

  const contactForWa = digitsOnly(service.contact);
  const whatsappHref = contactForWa
    ? `https://wa.me/${contactForWa}`
    : null;

  async function handleDelete() {
    if (!db || !id) return;
    const u = String(currentUserEmail ?? "").trim().toLowerCase();
    const listing = String(service?.email ?? "").trim().toLowerCase();
    if (u && listing && listing !== u) {
      alert("You can only delete your own listing.");
      return;
    }
    if (!confirm("Are you sure you want to delete this?")) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "services", id));
      router.push("/services");
    } catch {
      alert("Could not delete service.");
    } finally {
      setDeleting(false);
    }
  }

  const imageUrls = getItemImageUrls(service);

  return (
    <main className="app-shell">
      <h1 className="app-title mb-4">{service.title}</h1>

      {imageUrls.length > 0 ? (
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {imageUrls.map((url, idx) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${url}-${idx}`}
              src={url}
              alt=""
              className="aspect-square w-full rounded-xl border border-gray-200 object-cover"
              referrerPolicy="no-referrer"
            />
          ))}
        </div>
      ) : null}

      <div className="app-fields mb-6">
        <p>
          <strong className="font-semibold text-neutral-900">
            Description:
          </strong>{" "}
          {service.description}
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">
            Price Range:
          </strong>{" "}
          {service.priceRange}
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">
            Provider Name:
          </strong>{" "}
          {service.providerName}
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">Email:</strong>{" "}
          {service.email}
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">Contact:</strong>{" "}
          {service.contact}
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">Location:</strong>{" "}
          {service.location}
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
            Contact Provider
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
          {deleting ? "Deleting…" : "Delete Service"}
        </button>
      </div>
    </main>
  );
}
