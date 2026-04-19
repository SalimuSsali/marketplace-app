const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

/** Align pre-expiry window with `PRE_EXPIRY_WINDOW_MS` in `lib/expiry.js`. */
const MS_DAY = 24 * 60 * 60 * 1000;
const PRE_EXPIRY_MS = 3 * MS_DAY;
const PUSH_TITLE = "Next";
const MSG_EXPIRES_SOON = "Your item will expire soon";
const MSG_EXPIRED = "Item expired and removed";

function expiresAtToDate(data) {
  const v = data?.expiresAt;
  if (v == null) return null;
  if (typeof v.toDate === "function") return v.toDate();
  if (typeof v === "number" && Number.isFinite(v)) return new Date(v);
  return null;
}

async function getUserFcmToken(userId) {
  if (!userId) return null;
  const snap = await db.collection("users").doc(String(userId)).get();
  if (!snap.exists) return null;
  const t = snap.data()?.fcmToken;
  return typeof t === "string" && t.trim() ? t.trim() : null;
}

async function sendFcmToUser(userId, body, data = {}) {
  const token = await getUserFcmToken(userId);
  if (!token) return false;
  const dataStrings = {};
  for (const [k, v] of Object.entries(data)) {
    dataStrings[k] = v == null ? "" : String(v);
  }
  try {
    await messaging.send({
      token,
      notification: { title: PUSH_TITLE, body },
      data: dataStrings,
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default" } } },
    });
    return true;
  } catch (err) {
    console.warn("FCM send failed", userId, err?.code ?? err);
    if (
      err?.code === "messaging/invalid-registration-token" ||
      err?.code === "messaging/registration-token-not-registered"
    ) {
      await db
        .collection("users")
        .doc(String(userId))
        .update({
          fcmToken: admin.firestore.FieldValue.delete(),
          fcmTokenUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        .catch(() => {});
    }
    return false;
  }
}

/**
 * Daily: warn ≤3 days before expiry (once per UTC day per item), then delete expired + final push.
 */
exports.processItemLifecycle = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: "UTC",
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 540,
  },
  async () => {
    const snap = await db.collection("items").get();
    const nowMs = Date.now();
    const todayKey = new Date().toISOString().slice(0, 10);

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const exp = expiresAtToDate(data);
      if (!exp) continue;

      const userId = data.userId ? String(data.userId) : "";

      if (exp.getTime() <= nowMs) {
        await sendFcmToUser(userId, MSG_EXPIRED, {
          type: "item_expired",
          itemId: docSnap.id,
        });
        await docSnap.ref.delete().catch((e) => console.warn("delete item", docSnap.id, e));
        continue;
      }

      const msLeft = exp.getTime() - nowMs;
      if (msLeft > PRE_EXPIRY_MS) continue;
      if (String(data.expireSoonLastNotifyDay ?? "") === todayKey) continue;

      await sendFcmToUser(userId, MSG_EXPIRES_SOON, {
        type: "item_expiring_soon",
        itemId: docSnap.id,
      });
      await docSnap.ref
        .update({ expireSoonLastNotifyDay: todayKey })
        .catch((e) => console.warn("expireSoon flag", docSnap.id, e));
    }
  },
);
