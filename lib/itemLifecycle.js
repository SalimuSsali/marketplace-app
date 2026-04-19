import {
  Timestamp,
  deleteField,
  doc,
  updateDoc,
} from "firebase/firestore";
import { MS_DAY, isExpired } from "./expiry";

/**
 * Single source of truth for marketplace **items** lifecycle in Firestore:
 * - `userId` — seller Firebase Auth uid (required for new docs; used as seller id for chat)
 * - `createdAt` — server clock at post time (`Timestamp`)
 * - `expiresAt` — listing end time (`Timestamp`); renew + Cloud Function logic read only this
 * - `status` — `"active"` while visible; keep active on renew
 *
 * Do not duplicate TTL math elsewhere; import from this module.
 */

/** New listings: active until this offset from creation. */
const ITEM_INITIAL_ACTIVE_MS = 14 * MS_DAY;

/** Renew extends visibility by this amount from the time of renewal. */
const ITEM_RENEW_MS = 7 * MS_DAY;

export const ITEM_STATUS_ACTIVE = "active";

/**
 * Fields for a newly created item (`createdAt` / `expiresAt` as Firestore Timestamps).
 * Merge with listing payload; caller must set `userId`.
 */
export function newItemLifecycleFields() {
  const now = Date.now();
  return {
    createdAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(now + ITEM_INITIAL_ACTIVE_MS),
    status: ITEM_STATUS_ACTIVE,
  };
}

/** Patch applied on renew (clears server notify dedupe). */
export function renewItemFirestorePatch() {
  const now = Date.now();
  return {
    expiresAt: Timestamp.fromMillis(now + ITEM_RENEW_MS),
    status: ITEM_STATUS_ACTIVE,
    expireSoonLastNotifyDay: deleteField(),
  };
}

/** Client optimistic `expiresAt` after a successful renew. */
export function nextItemExpiresAfterRenewClient() {
  return Timestamp.fromMillis(Date.now() + ITEM_RENEW_MS);
}

/**
 * Renew a listing: +7 days, `status: active`, clears `expireSoonLastNotifyDay`.
 * @param {import("firebase/firestore").Firestore} db
 * @param {string} itemId
 */
export async function renewItem(db, itemId) {
  if (!db || !itemId) {
    throw new Error("renewItem: db and itemId are required");
  }
  await updateDoc(doc(db, "items", itemId), renewItemFirestorePatch());
}

/**
 * Firebase Auth uid of the listing owner (`items.userId`), or null if missing/legacy.
 */
export function getItemSellerUserId(item) {
  const raw = item?.userId;
  if (raw == null) return null;
  const s = String(raw).trim();
  return s.length > 0 ? s : null;
}

/** Hide expired rows without deleting (deletion is Cloud Function only). */
export function filterActiveItems(rows, now = new Date()) {
  return (rows || []).filter((r) => !isExpired(r.expiresAt, now));
}
