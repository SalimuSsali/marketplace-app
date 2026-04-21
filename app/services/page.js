"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addDoc, collection, getDocs } from "firebase/firestore";
import { useFirebaseAuthUser } from "../../hooks/useFirebaseAuthUser";
import { descriptionWordCount } from "../../lib/descriptionWords";
import { formatSubmitError } from "../../lib/formatSubmitError";
import { db } from "../../lib/firebase";
import { useFirebaseBootstrapVersion } from "../../hooks/useFirebaseBootstrapVersion";
import {
  imageFieldsForFirestore,
  MAX_ITEM_IMAGES,
  getItemPrimaryImageUrl,
} from "../../lib/itemImages";
import {
  planItemImageFileBatch,
  uploadItemImageBatch,
} from "../../lib/itemImageUpload";
import { notifyPostCreated } from "../../lib/notifications";

async function fetchAllServices() {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, "services"));
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [providerName, setProviderName] = useState("");
  const [contact, setContact] = useState("");
  const authUser = useFirebaseAuthUser();
  const [location, setLocation] = useState("");
  const [serviceImageUrls, setServiceImageUrls] = useState([]);
  const [serviceImageUploading, setServiceImageUploading] = useState(false);
  const fbBoot = useFirebaseBootstrapVersion();

  const loadServices = useCallback(async () => {
    try {
      const data = await fetchAllServices();
      setServices(data);
    } catch {
      setServices([]);
    }
  }, [fbBoot]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return services;
    return services.filter((svc) => {
      const t = String(svc.title ?? "").toLowerCase();
      const loc = String(svc.location ?? "").toLowerCase();
      return t.includes(q) || loc.includes(q);
    });
  }, [services, searchQuery]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!db) return;
    const postEmail = String(authUser?.email ?? "").trim();
    if (!postEmail) {
      alert("Sign in on Profile to offer a service — your account email is used for this listing.");
      return;
    }
    setSaving(true);
    try {
      const { imageUrl, imageUrls } = imageFieldsForFirestore(serviceImageUrls);
      await addDoc(collection(db, "services"), {
        title: title.trim(),
        description: description.trim(),
        priceRange: priceRange.trim(),
        providerName: providerName.trim(),
        email: postEmail,
        contact: contact.trim(),
        location: location.trim(),
        imageUrl,
        imageUrls,
      });
      await notifyPostCreated(postEmail);
      setTitle("");
      setDescription("");
      setPriceRange("");
      setProviderName("");
      setContact("");
      setLocation("");
      setServiceImageUrls([]);
      setShowForm(false);
      await loadServices();
    } catch {
      alert("Could not save service.");
    } finally {
      setSaving(false);
    }
  }

  async function onServiceImagesChange(e) {
    const plan = planItemImageFileBatch(e.target.files, serviceImageUrls.length);
    if (plan.action === "none") return;
    if (plan.action === "full") {
      alert(`You can add up to ${MAX_ITEM_IMAGES} images.`);
      e.target.value = "";
      return;
    }
    if (plan.truncated) {
      alert(
        `Only the first ${plan.batch.length} file(s) were added (max ${MAX_ITEM_IMAGES}).`,
      );
    }
    setServiceImageUploading(true);
    try {
      const uploaded = await uploadItemImageBatch(plan.batch);
      setServiceImageUrls((prev) => [...prev, ...uploaded]);
    } catch (err) {
      alert(formatSubmitError(err));
    } finally {
      setServiceImageUploading(false);
      e.target.value = "";
    }
  }

  function removeServiceImageAt(index) {
    setServiceImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <main className="app-shell">
      <h1 className="app-title">Services</h1>

      <label className="sr-only" htmlFor="services-search">
        Search services
      </label>
      <div className="relative mt-4">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-neutral-400"
          aria-hidden
        >
          🔍
        </span>
        <input
          id="services-search"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search services..."
          className="app-search"
        />
      </div>

      <button
        type="button"
        onClick={() => setShowForm((v) => !v)}
        className="app-btn-primary mt-4 mb-6 shadow-md"
      >
        Offer Service
      </button>

      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="mt-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <label className="app-label">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter product name"
              className="app-input"
              required
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
            Price range
            <input
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              placeholder="Amount"
              className="app-input"
            />
          </label>
          <label className="app-label">
            Provider name
            <input
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder="Enter your name"
              className="app-input"
            />
          </label>
          {authUser?.email ? (
            <p className="text-xs text-neutral-600">
              Listing email: <span className="font-medium text-neutral-800">{authUser.email}</span>{" "}
              (from your signed-in account)
            </p>
          ) : (
            <p className="text-xs text-amber-800">
              Sign in on Profile to submit — your account email will be attached to this service.
            </p>
          )}
          <label className="app-label">
            Contact
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
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
            Photos (up to {MAX_ITEM_IMAGES})
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={onServiceImagesChange}
              disabled={
                serviceImageUploading ||
                serviceImageUrls.length >= MAX_ITEM_IMAGES
              }
              className="app-input py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700 disabled:opacity-60"
            />
            {serviceImageUploading ? (
              <span className="mt-1 block text-xs text-neutral-500">
                Uploading…
              </span>
            ) : null}
          </label>
          {serviceImageUrls.length > 0 ? (
            <ul className="grid grid-cols-2 gap-2">
              {serviceImageUrls.map((url, idx) => (
                <li
                  key={`${url}-${idx}`}
                  className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="mx-auto aspect-square max-h-32 w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={() => removeServiceImageAt(idx)}
                    className="absolute right-1 top-1 rounded-md bg-red-600 px-2 py-0.5 text-xs font-semibold text-white shadow hover:bg-red-700"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className="app-btn-primary disabled:opacity-60"
          >
            {saving ? "Saving…" : "Submit"}
          </button>
        </form>
      ) : null}

      {services.length === 0 ? (
        <p className="app-empty">No services available</p>
      ) : filteredServices.length === 0 ? (
        <p className="app-empty">No matching services.</p>
      ) : (
        <div className="app-list">
          {filteredServices.map((svc) => {
            const thumb = getItemPrimaryImageUrl(svc);
            return (
              <Link
                key={svc.id}
                href={`/services/${svc.id}`}
                className="app-card-link overflow-hidden no-underline text-inherit"
              >
                <div className="app-item-row">
                  <div className="h-[120px] w-full shrink-0 overflow-hidden bg-neutral-100 sm:w-40">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        className="h-[120px] w-full object-cover sm:w-40"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-[120px] w-full items-center justify-center text-xs text-neutral-500">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="app-card-body min-w-0">
                    <div className="app-card-title">{svc.title}</div>
                    <div className="app-card-meta">{svc.providerName}</div>
                    <div className="app-card-meta">{svc.location}</div>
                    <div className="app-card-meta">{svc.priceRange}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
