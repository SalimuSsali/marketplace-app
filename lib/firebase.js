import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Dev-only hint when env is incomplete; production should still fail gracefully via null db checks in pages.
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const missing = [];
  if (!firebaseConfig.apiKey) missing.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!firebaseConfig.authDomain) missing.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!firebaseConfig.projectId) missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (missing.length) {
    console.warn(
      `[marketplace-app] Missing ${missing.join(", ")}. Use Firebase Console → Project settings → Your apps → copy the web app config into .env.local, then restart dev.`,
    );
  }
}

function getOrInitFirestore() {
  try {
    // Forced long-polling avoids WebChannel timeouts on some Windows / proxy / VPN networks.
    // Mutually exclusive with experimentalAutoDetectLongPolling in the SDK.
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch (e) {
    if (e && e.code === "failed-precondition") {
      return getFirestore(app);
    }
    throw e;
  }
}

export const db = getOrInitFirestore();
export const auth = getAuth(app);
