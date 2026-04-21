"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { deleteDoc, doc, getDoc } from "firebase/firestore";
import ContactSellerSection from "../../../components/ContactSellerSection";
import { useFirebaseAuthUser } from "../../../hooks/useFirebaseAuthUser";
import { useFirebaseBootstrapVersion } from "../../../hooks/useFirebaseBootstrapVersion";
import { digitsOnly } from "../../../lib/digitsOnly";
import { devError } from "../../../lib/devLog";
import { db } from "../../../lib/firebase";
import { getFirestoreDocIdFromParams } from "../../../lib/routeParams";
import { notifyRequestResponded } from "../../../lib/notifications";

export default function RequestDetailPage() {
  const params = useParams();
  const id = getFirestoreDocIdFromParams(params, "id");
  const router = useRouter();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const authUser = useFirebaseAuthUser();
  const currentUserEmail = authUser?.email ?? null;
  const requestRespondedRef = useRef(false);
  const fbBoot = useFirebaseBootstrapVersion();

  useEffect(() => {
    requestRespondedRef.current = false;
  }, [id]);

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        if (!db || !id) {
          setRequest(null);
          return;
        }

        const snap = await getDoc(doc(db, "requests", id));
        if (!snap.exists()) {
          setRequest(null);
          return;
        }

        setRequest({ id: snap.id, ...snap.data() });
      } catch (err) {
        devError("RequestDetailPage fetch", err);
        setRequest(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [id, fbBoot]);

  const trySimulateRequestResponse = useCallback(() => {
    if (!request?.email || requestRespondedRef.current) return;
    const owner = String(request.email).trim().toLowerCase();
    const viewer = String(currentUserEmail ?? "").trim().toLowerCase();
    if (viewer && viewer === owner) return;
    requestRespondedRef.current = true;
    notifyRequestResponded(request.email);
  }, [request, currentUserEmail]);

  useEffect(() => {
    if (!request?.email) return;
    const owner = String(request.email).trim().toLowerCase();
    const viewer = String(currentUserEmail ?? "").trim().toLowerCase();
    if (viewer && viewer === owner) return;
    const t = setTimeout(() => trySimulateRequestResponse(), 2000);
    return () => clearTimeout(t);
  }, [request, currentUserEmail, trySimulateRequestResponse]);

  if (loading) {
    return (
      <main className="app-shell">
        <p className="text-neutral-600">Loading…</p>
      </main>
    );
  }

  if (!request) {
    return (
      <main className="app-shell">
        <p className="app-empty">Request not found. Submit item.</p>
      </main>
    );
  }

  const contactForWa = digitsOnly(request.contact);
  const whatsappHref = contactForWa
    ? `https://wa.me/${contactForWa}`
    : null;

  async function handleDelete() {
    if (!db || !id) return;
    const u = String(currentUserEmail ?? "").trim().toLowerCase();
    const listing = String(request?.email ?? "").trim().toLowerCase();
    if (u && listing && listing !== u) {
      alert("You can only delete your own listing.");
      return;
    }
    if (!confirm("Are you sure you want to delete this?")) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "requests", id));
      router.push("/requests");
    } catch {
      alert("Could not delete request.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="app-shell">
      <h1 className="app-title mb-4">{request.title}</h1>

      <div className="app-fields mb-6">
        <p>
          <strong className="font-semibold text-neutral-900">
            Description:
          </strong>{" "}
          {request.description}
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">Budget:</strong>{" "}
          {request.budget}
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">Location:</strong>{" "}
          {request.location}
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">
            Requester Name:
          </strong>{" "}
          {request.requesterName}
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">Email:</strong>{" "}
          {request.email}
        </p>
        <p>
          <strong className="font-semibold text-neutral-900">Contact:</strong>{" "}
          {request.contact}
        </p>
      </div>

      <ContactSellerSection onSendMessage={trySimulateRequestResponse} />

      <div className="mt-2">
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="app-btn-primary"
          >
            Contact Requester
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
          {deleting ? "Deleting…" : "Delete Request"}
        </button>
      </div>
    </main>
  );
}
