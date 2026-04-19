import { deleteDoc, doc } from "firebase/firestore";
import { devError } from "./devLog";

/** One day in milliseconds */
export const MS_DAY = 24 * 60 * 60 * 1000;

/** Pre-expiry warning window (aligned with scheduled Cloud Function). */
export const PRE_EXPIRY_WINDOW_MS = 3 * MS_DAY;

export function toDate(value) {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value);
  }
  if (typeof value.toDate === "function") return value.toDate();
  return null;
}

export function isExpired(expiresAt, now = new Date()) {
  const d = toDate(expiresAt);
  if (!d) return false;
  return d.getTime() < now.getTime();
}

/**
 * True if not yet expired but expires within `withinMs` (default 3 days).
 */
export function isExpiringSoon(
  expiresAt,
  now = new Date(),
  withinMs = PRE_EXPIRY_WINDOW_MS
) {
  const d = toDate(expiresAt);
  if (!d) return false;
  const remaining = d.getTime() - now.getTime();
  return remaining > 0 && remaining <= withinMs;
}

/** Shop entity (not marketplace item): 30-day registration window. */
export function newShopExpiresAt() {
  return new Date(Date.now() + 30 * MS_DAY);
}

/**
 * Deletes expired **shop** documents from Firestore when loading lists.
 * Item documents are removed only by the daily Cloud Function.
 */
export async function deleteExpiredFromList(db, collectionName, rows) {
  if (!db || !rows?.length) return rows || [];
  const now = new Date();
  const alive = [];
  for (const row of rows) {
    if (isExpired(row.expiresAt, now)) {
      try {
        await deleteDoc(doc(db, collectionName, row.id));
      } catch (err) {
        devError("deleteExpiredFromList", collectionName, row.id, err);
      }
    } else {
      alive.push(row);
    }
  }
  return alive;
}
