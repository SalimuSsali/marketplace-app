"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addDoc, collection } from "firebase/firestore";
import { useFirebaseAuthUser } from "../../hooks/useFirebaseAuthUser";
import { descriptionWordCount } from "../../lib/descriptionWords";
import { parseTagsInput } from "../../lib/itemFields";
import { formatSubmitError } from "../../lib/formatSubmitError";
import { db } from "../../lib/firebase";
import { newItemExpiresAt, newShopExpiresAt } from "../../lib/expiry";
import {
  planItemImageFileBatch,
  uploadItemImageBatch,
} from "../../lib/itemImageUpload";
import { notifyPostCreated } from "../../lib/notifications";
import { imageFieldsForFirestore, MAX_ITEM_IMAGES } from "../../lib/itemImages";
import { validateSellerEmailForPost } from "../../lib/sellerIdentity";

function AddPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState("item");
  const [saving, setSaving] = useState(false);

  // Post Item
  const [itemTitle, setItemTitle] = useState("");
  const [price, setPrice] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemTagsInput, setItemTagsInput] = useState("");
  const [itemImageUrls, setItemImageUrls] = useState([]);
  const [itemLocation, setItemLocation] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [itemContact, setItemContact] = useState("");
  const [uploading, setUploading] = useState(false);

  // Post Request
  const [reqTitle, setReqTitle] = useState("");
  const [reqDescription, setReqDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [reqLocation, setReqLocation] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [reqContact, setReqContact] = useState("");

  // Register Shop
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [shopLocation, setShopLocation] = useState("");
  const [shopTagsInput, setShopTagsInput] = useState("");
  const [shopDescription, setShopDescription] = useState("");
  const [shopImageUrls, setShopImageUrls] = useState([]);
  const [shopImageUploading, setShopImageUploading] = useState(false);

  // Offer Service
  const [svcTitle, setSvcTitle] = useState("");
  const [svcDescription, setSvcDescription] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [providerName, setProviderName] = useState("");
  const [svcContact, setSvcContact] = useState("");
  const [svcLocation, setSvcLocation] = useState("");
  const [svcImageUrls, setSvcImageUrls] = useState([]);
  const [svcImageUploading, setSvcImageUploading] = useState(false);
  const authUser = useFirebaseAuthUser();

  useEffect(() => {
    const m = searchParams.get("mode");
    const t = searchParams.get("title");
    if (m === "request") setMode("request");
    if (t) setReqTitle(t);
  }, [searchParams]);

  async function onSubmit(e) {
    e.preventDefault();

    const emailCheck = validateSellerEmailForPost(authUser);
    if (!emailCheck.ok) {
      alert(emailCheck.message);
      return;
    }
    const postEmail = emailCheck.email;
    if (!db) {
      alert(
        "Database is not configured. Add Firebase keys to .env.local and restart the dev server.",
      );
      return;
    }
    if (mode === "item" && !itemTitle.trim()) {
      alert("Please enter a title");
      return;
    }
    setSaving(true);
    try {
      if (mode === "item") {
        const n = price === "" ? null : Number(price);
        const { imageUrl, imageUrls } = imageFieldsForFirestore(itemImageUrls);
        const tags = parseTagsInput(itemTagsInput);
        const title = itemTitle.trim();
        const itemData = {
          title,
          name: title,
          price: n === null || Number.isNaN(n) ? 0 : n,
          description: itemDescription.trim(),
          tags,
          imageUrl,
          imageUrls,
          location: itemLocation.trim(),
          sellerName: sellerName.trim(),
          email: postEmail,
          contact: itemContact.trim(),
          createdAt: new Date(),
          expiresAt: newItemExpiresAt(),
        };
        await addDoc(collection(db, "items"), itemData);
        await notifyPostCreated(postEmail);
        alert("Posted successfully");
        router.push("/items");
        return;
      }

      if (mode === "request") {
        const b = budget === "" ? null : Number(budget);
        await addDoc(collection(db, "requests"), {
          title: reqTitle.trim(),
          description: reqDescription.trim(),
          budget: b === null || Number.isNaN(b) ? 0 : b,
          location: reqLocation.trim(),
          requesterName: requesterName.trim(),
          email: postEmail,
          contact: reqContact.trim(),
        });
        await notifyPostCreated(postEmail);
        alert("Posted successfully");
        router.push("/requests");
        return;
      }

      if (mode === "shop") {
        const shopTags = parseTagsInput(shopTagsInput);
        const { imageUrl, imageUrls } = imageFieldsForFirestore(shopImageUrls);
        await addDoc(collection(db, "shops"), {
          shopName: shopName.trim(),
          ownerName: ownerName.trim(),
          email: postEmail,
          phone: phone.trim(),
          location: shopLocation.trim(),
          tags: shopTags,
          description: shopDescription.trim(),
          imageUrl,
          imageUrls,
          createdAt: new Date(),
          expiresAt: newShopExpiresAt(),
        });
        await notifyPostCreated(postEmail);
        alert("Posted successfully");
        router.push("/shops");
        return;
      }

      if (mode === "service") {
        const { imageUrl, imageUrls } = imageFieldsForFirestore(svcImageUrls);
        await addDoc(collection(db, "services"), {
          title: svcTitle.trim(),
          description: svcDescription.trim(),
          priceRange: priceRange.trim(),
          providerName: providerName.trim(),
          email: postEmail,
          contact: svcContact.trim(),
          location: svcLocation.trim(),
          imageUrl,
          imageUrls,
        });
        await notifyPostCreated(postEmail);
        alert("Posted successfully");
        router.push("/services");
      }
    } catch (err) {
      alert(formatSubmitError(err));
    } finally {
      setSaving(false);
    }
  }

  async function onItemImagesChange(e) {
    const plan = planItemImageFileBatch(e.target.files, itemImageUrls.length);
    if (plan.action === "none") return;
    if (plan.action === "full") {
      alert(`You can add up to ${MAX_ITEM_IMAGES} images. Remove one to add more.`);
      e.target.value = "";
      return;
    }
    if (plan.truncated) {
      alert(
        `Only the first ${plan.batch.length} file(s) were added (max ${MAX_ITEM_IMAGES} images).`,
      );
    }
    setUploading(true);
    try {
      const uploaded = await uploadItemImageBatch(plan.batch);
      setItemImageUrls((prev) => [...prev, ...uploaded]);
    } catch (err) {
      alert(formatSubmitError(err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function onShopImagesChange(e) {
    const plan = planItemImageFileBatch(e.target.files, shopImageUrls.length);
    if (plan.action === "none") return;
    if (plan.action === "full") {
      alert(`You can add up to ${MAX_ITEM_IMAGES} images. Remove one to add more.`);
      e.target.value = "";
      return;
    }
    if (plan.truncated) {
      alert(
        `Only the first ${plan.batch.length} file(s) were added (max ${MAX_ITEM_IMAGES} images).`,
      );
    }
    setShopImageUploading(true);
    try {
      const uploaded = await uploadItemImageBatch(plan.batch);
      setShopImageUrls((prev) => [...prev, ...uploaded]);
    } catch (err) {
      alert(formatSubmitError(err));
    } finally {
      setShopImageUploading(false);
      e.target.value = "";
    }
  }

  function removeShopImageAt(index) {
    setShopImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSvcImagesChange(e) {
    const plan = planItemImageFileBatch(e.target.files, svcImageUrls.length);
    if (plan.action === "none") return;
    if (plan.action === "full") {
      alert(`You can add up to ${MAX_ITEM_IMAGES} images. Remove one to add more.`);
      e.target.value = "";
      return;
    }
    if (plan.truncated) {
      alert(
        `Only the first ${plan.batch.length} file(s) were added (max ${MAX_ITEM_IMAGES} images).`,
      );
    }
    setSvcImageUploading(true);
    try {
      const uploaded = await uploadItemImageBatch(plan.batch);
      setSvcImageUrls((prev) => [...prev, ...uploaded]);
    } catch (err) {
      alert(formatSubmitError(err));
    } finally {
      setSvcImageUploading(false);
      e.target.value = "";
    }
  }

  function removeSvcImageAt(index) {
    setSvcImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function removeItemImageAt(index) {
    setItemImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <main className="app-shell">
      <h1 className="app-title mb-5">Add</h1>

      <div className="mb-6 flex flex-col gap-2.5">
        <button
          type="button"
          className={`app-mode-btn ${mode === "item" ? "app-mode-btn-active" : ""}`}
          onClick={() => setMode("item")}
        >
          Post Item
        </button>
        <button
          type="button"
          className={`app-mode-btn ${mode === "request" ? "app-mode-btn-active" : ""}`}
          onClick={() => setMode("request")}
        >
          Post Request
        </button>
        <button
          type="button"
          className={`app-mode-btn ${mode === "shop" ? "app-mode-btn-active" : ""}`}
          onClick={() => setMode("shop")}
        >
          Register Shop
        </button>
        <button
          type="button"
          className={`app-mode-btn ${mode === "service" ? "app-mode-btn-active" : ""}`}
          onClick={() => setMode("service")}
        >
          Offer Service
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {mode === "item" && (
          <>
            <label className="app-label">
              Title
              <input
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
                placeholder="What are you selling?"
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
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                rows={4}
                placeholder="5 or more words"
                className="app-input min-h-[6rem]"
              />
              {itemDescription.trim().length > 0 &&
              descriptionWordCount(itemDescription) < 5 ? (
                <span className="text-xs text-neutral-500">
                  Please enter at least 5 words
                </span>
              ) : null}
            </label>
            <label className="app-label">
              Item photos (up to {MAX_ITEM_IMAGES})
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={onItemImagesChange}
                disabled={uploading || itemImageUrls.length >= MAX_ITEM_IMAGES}
                className="app-input py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700 disabled:opacity-60"
              />
              <span className="text-xs text-neutral-500">
                Select one or more images — they upload and appear below
              </span>
              {uploading ? (
                <span className="mt-1 block text-xs text-neutral-500">
                  Uploading…
                </span>
              ) : null}
            </label>
            {itemImageUrls.length > 0 ? (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {itemImageUrls.map((url, idx) => (
                  <li
                    key={`${url}-${idx}`}
                    className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="mx-auto aspect-square max-h-36 w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => removeItemImageAt(idx)}
                      className="absolute right-1 top-1 rounded-md bg-red-600 px-2 py-0.5 text-xs font-semibold text-white shadow hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <label className="app-label">
              Location
              <input
                value={itemLocation}
                onChange={(e) => setItemLocation(e.target.value)}
                placeholder="Area"
                className="app-input"
              />
            </label>
            <label className="app-label">
              Seller Name
              <input
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                placeholder="Enter your name"
                className="app-input"
              />
            </label>
            <label className="app-label">
              Tags / keywords
              <input
                value={itemTagsInput}
                onChange={(e) => setItemTagsInput(e.target.value)}
                placeholder="e.g. phone, used, electronics"
                className="app-input"
              />
              <span className="text-xs text-neutral-500">
                Comma-separated — helps people find your listing
              </span>
            </label>
            <label className="app-label">
              Contact
              <input
                value={itemContact}
                onChange={(e) => setItemContact(e.target.value)}
                className="app-input"
              />
            </label>
          </>
        )}

        {mode === "request" && (
          <>
            <label className="app-label">
              Title
              <input
                value={reqTitle}
                onChange={(e) => setReqTitle(e.target.value)}
                placeholder="Enter product name"
                className="app-input"
              />
            </label>
            <label className="app-label">
              Description
              <textarea
                value={reqDescription}
                onChange={(e) => setReqDescription(e.target.value)}
                rows={4}
                placeholder="5 or more words"
                className="app-input min-h-[6rem]"
              />
              {reqDescription.trim().length > 0 &&
              descriptionWordCount(reqDescription) < 5 ? (
                <span className="text-xs text-neutral-500">
                  Please enter at least 5 words
                </span>
              ) : null}
            </label>
            <label className="app-label">
              Budget
              <input
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                inputMode="decimal"
                placeholder="Amount"
                className="app-input"
              />
            </label>
            <label className="app-label">
              Location
              <input
                value={reqLocation}
                onChange={(e) => setReqLocation(e.target.value)}
                placeholder="Area"
                className="app-input"
              />
            </label>
            <label className="app-label">
              Requester Name
              <input
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="Enter your name"
                className="app-input"
              />
            </label>
            <label className="app-label">
              Contact
              <input
                value={reqContact}
                onChange={(e) => setReqContact(e.target.value)}
                className="app-input"
              />
            </label>
          </>
        )}

        {mode === "shop" && (
          <>
            <label className="app-label">
              Shop Name
              <input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="app-input"
              />
            </label>
            <label className="app-label">
              Owner Name
              <input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Enter your name"
                className="app-input"
              />
            </label>
            <label className="app-label">
              Phone
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                className="app-input"
              />
            </label>
            <label className="app-label">
              Location
              <input
                value={shopLocation}
                onChange={(e) => setShopLocation(e.target.value)}
                placeholder="Area"
                className="app-input"
              />
            </label>
            <label className="app-label">
              Tags / keywords
              <input
                value={shopTagsInput}
                onChange={(e) => setShopTagsInput(e.target.value)}
                placeholder="e.g. groceries, delivery"
                className="app-input"
              />
              <span className="text-xs text-neutral-500">
                Comma-separated — used for search
              </span>
            </label>
            <label className="app-label">
              Description
              <textarea
                value={shopDescription}
                onChange={(e) => setShopDescription(e.target.value)}
                rows={4}
                placeholder="5 or more words"
                className="app-input min-h-[6rem]"
              />
              {shopDescription.trim().length > 0 &&
              descriptionWordCount(shopDescription) < 5 ? (
                <span className="text-xs text-neutral-500">
                  Please enter at least 5 words
                </span>
              ) : null}
            </label>
            <label className="app-label">
              Shop photos (up to {MAX_ITEM_IMAGES})
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={onShopImagesChange}
                disabled={
                  shopImageUploading ||
                  shopImageUrls.length >= MAX_ITEM_IMAGES
                }
                className="app-input py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700 disabled:opacity-60"
              />
              <span className="text-xs text-neutral-500">
                Optional — storefront, logo, or products
              </span>
              {shopImageUploading ? (
                <span className="mt-1 block text-xs text-neutral-500">
                  Uploading…
                </span>
              ) : null}
            </label>
            {shopImageUrls.length > 0 ? (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {shopImageUrls.map((url, idx) => (
                  <li
                    key={`${url}-${idx}`}
                    className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="mx-auto aspect-square max-h-36 w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => removeShopImageAt(idx)}
                      className="absolute right-1 top-1 rounded-md bg-red-600 px-2 py-0.5 text-xs font-semibold text-white shadow hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}

        {mode === "service" && (
          <>
            <label className="app-label">
              Title
              <input
                value={svcTitle}
                onChange={(e) => setSvcTitle(e.target.value)}
                placeholder="Enter product name"
                className="app-input"
              />
            </label>
            <label className="app-label">
              Description
              <textarea
                value={svcDescription}
                onChange={(e) => setSvcDescription(e.target.value)}
                rows={4}
                placeholder="5 or more words"
                className="app-input min-h-[6rem]"
              />
              {svcDescription.trim().length > 0 &&
              descriptionWordCount(svcDescription) < 5 ? (
                <span className="text-xs text-neutral-500">
                  Please enter at least 5 words
                </span>
              ) : null}
            </label>
            <label className="app-label">
              Price Range
              <input
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                placeholder="Amount"
                className="app-input"
              />
            </label>
            <label className="app-label">
              Provider Name
              <input
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="Enter your name"
                className="app-input"
              />
            </label>
            <label className="app-label">
              Contact
              <input
                value={svcContact}
                onChange={(e) => setSvcContact(e.target.value)}
                className="app-input"
              />
            </label>
            <label className="app-label">
              Location
              <input
                value={svcLocation}
                onChange={(e) => setSvcLocation(e.target.value)}
                placeholder="Area"
                className="app-input"
              />
            </label>
            <label className="app-label">
              Service photos (up to {MAX_ITEM_IMAGES})
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={onSvcImagesChange}
                disabled={
                  svcImageUploading || svcImageUrls.length >= MAX_ITEM_IMAGES
                }
                className="app-input py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700 disabled:opacity-60"
              />
              <span className="text-xs text-neutral-500">
                Optional — portfolio or work samples
              </span>
              {svcImageUploading ? (
                <span className="mt-1 block text-xs text-neutral-500">
                  Uploading…
                </span>
              ) : null}
            </label>
            {svcImageUrls.length > 0 ? (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {svcImageUrls.map((url, idx) => (
                  <li
                    key={`${url}-${idx}`}
                    className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="mx-auto aspect-square max-h-36 w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => removeSvcImageAt(idx)}
                      className="absolute right-1 top-1 rounded-md bg-red-600 px-2 py-0.5 text-xs font-semibold text-white shadow hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}

        <button
          type="submit"
          disabled={saving}
          className="app-btn-primary mt-1 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {!saving ? "Submit" : "Posting..."}
        </button>
      </form>
    </main>
  );
}

export default function AddPage() {
  return (
    <Suspense
      fallback={
        <main className="app-shell">
          <p className="text-sm text-neutral-500">Loading…</p>
        </main>
      }
    >
      <AddPageInner />
    </Suspense>
  );
}
