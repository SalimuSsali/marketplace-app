import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { devError } from "./devLog";
import { app, db } from "./firebase";

const VAPID = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();

/**
 * Registers FCM and stores the device token on `users/{uid}` (`fcmToken`).
 * No-op when messaging is unsupported, VAPID is missing, or app/db is unavailable.
 */
export async function registerFcmTokenForUser(uid) {
  if (typeof window === "undefined" || !uid || !app || !db) return;
  if (!VAPID) return;

  try {
    const supported = await import("firebase/messaging").then((m) =>
      m.isSupported(),
    );
    if (!supported) return;

    const { getMessaging, getToken } = await import("firebase/messaging");
    const messaging = getMessaging(app);
    await navigator.serviceWorker.ready.catch(() => {});
    let registration = await navigator.serviceWorker
      .getRegistration()
      .catch(() => null);
    if (!registration?.active?.scriptURL?.includes("firebase-messaging-sw")) {
      registration = await navigator.serviceWorker
        .register("/firebase-messaging-sw.js", { scope: "/" })
        .catch(() => null);
    }
    if (!registration) return;

    const token = await getToken(messaging, {
      vapidKey: VAPID,
      serviceWorkerRegistration: registration,
    });
    if (!token) return;

    await setDoc(
      doc(db, "users", uid),
      {
        userId: uid,
        fcmToken: token,
        fcmTokenUpdatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    devError("registerFcmTokenForUser", err);
  }
}
