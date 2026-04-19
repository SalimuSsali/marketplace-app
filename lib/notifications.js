import { addDoc, collection, getDocs, limit, query, where } from "firebase/firestore";
import { devError } from "./devLog";
import { db } from "./firebase";

const COLLECTION = "notifications";
const POST_CREATED_MESSAGE = "Your post was created successfully";
const REQUEST_RESPONDED_MESSAGE = "Someone responded to your request";
/** Copy for FCM + in-app; keep aligned with Cloud Functions push body. */
export const ITEM_EXPIRING_PUSH_MESSAGE = "Your item will expire soon";
const SHOP_EXPIRING_SOON_MESSAGE = "Your shop will expire soon";

export function normalizeNotificationEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

/** Fire-and-forget; failures are logged only (does not block UX). */
export async function notifyPostCreated(email) {
  const normalized = normalizeNotificationEmail(email);
  if (!db || !normalized) return;
  try {
    await addDoc(collection(db, COLLECTION), {
      message: POST_CREATED_MESSAGE,
      email: normalized,
      createdAt: new Date(),
    });
  } catch (err) {
    devError("notifyPostCreated", err);
  }
}

export async function notifyRequestResponded(email) {
  const normalized = normalizeNotificationEmail(email);
  if (!db || !normalized) return;
  try {
    await addDoc(collection(db, COLLECTION), {
      message: REQUEST_RESPONDED_MESSAGE,
      email: normalized,
      createdAt: new Date(),
    });
  } catch (err) {
    devError("notifyRequestResponded", err);
  }
}

export async function notifyShopExpiringSoon(email) {
  const normalized = normalizeNotificationEmail(email);
  if (!db || !normalized) return;
  try {
    await addDoc(collection(db, COLLECTION), {
      message: SHOP_EXPIRING_SOON_MESSAGE,
      email: normalized,
      createdAt: new Date(),
    });
  } catch (err) {
    devError("notifyShopExpiringSoon", err);
  }
}

/** One notification per tab session per id (client-only). */
export function notifyShopExpiringSoonOncePerSession(shopId, email) {
  if (typeof window === "undefined" || !shopId || !email) return;
  const key = `exp-notify-shop-${shopId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  void notifyShopExpiringSoon(email);
}

/**
 * Fetches notifications for an email, newest first, max `maxCount` (default 10).
 * Uses equality filter + client sort to avoid composite index requirement.
 */
export async function fetchNotificationsForEmail(email, maxCount = 10) {
  const normalized = normalizeNotificationEmail(email);
  if (!db || !normalized) return [];
  try {
    const q = query(
      collection(db, COLLECTION),
      where("email", "==", normalized),
      limit(50)
    );
    const snap = await getDocs(q);
    const rows = snap.docs.map((d) => {
      const data = d.data();
      const createdAt = data.createdAt?.toDate
        ? data.createdAt.toDate()
        : data.createdAt instanceof Date
          ? data.createdAt
          : new Date(0);
      return {
        id: d.id,
        message: String(data.message ?? ""),
        email: String(data.email ?? ""),
        createdAt,
      };
    });
    rows.sort((a, b) => b.createdAt - a.createdAt);
    return rows.slice(0, maxCount);
  } catch (err) {
    devError("fetchNotificationsForEmail", err);
    return [];
  }
}
