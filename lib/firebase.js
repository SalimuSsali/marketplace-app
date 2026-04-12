import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { devError, misconfigWarnOnce } from "./devLog";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function hasRequiredWebConfig(cfg) {
  return Boolean(
    cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId,
  );
}

function getOrInitFirestore(app) {
  try {
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

function initFirebase() {
  const missing = [];
  if (!firebaseConfig.apiKey) missing.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!firebaseConfig.authDomain) missing.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!firebaseConfig.projectId) missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (!firebaseConfig.appId) missing.push("NEXT_PUBLIC_FIREBASE_APP_ID");

  if (!hasRequiredWebConfig(firebaseConfig)) {
    misconfigWarnOnce(
      "firebase-env",
      `[marketplace-app] Missing Firebase env: ${missing.join(", ") || "one or more keys"}. Add values from Firebase Console → Project settings → Your apps → Web app into .env.local (see .env.example), then restart.`,
    );
    return { app: null, db: null, auth: null };
  }

  try {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

    let db = null;
    try {
      db = getOrInitFirestore(app);
    } catch (e) {
      devError("[firebase] Firestore init failed", e);
      misconfigWarnOnce(
        "firestore-init",
        "[marketplace-app] Firestore could not be initialized. Check Firebase config and network.",
      );
    }

    let auth = null;
    try {
      auth = getAuth(app);
    } catch (e) {
      devError("[firebase] Auth init failed", e);
      misconfigWarnOnce(
        "firebase-auth-init",
        "[marketplace-app] Firebase Auth could not be initialized.",
      );
    }

    return { app, db, auth };
  } catch (e) {
    devError("[firebase] initializeApp failed", e);
    misconfigWarnOnce(
      "firebase-app",
      "[marketplace-app] Firebase app failed to initialize. Verify NEXT_PUBLIC_* keys match a single web app in Firebase Console.",
    );
    return { app: null, db: null, auth: null };
  }
}

const { app, db, auth } = initFirebase();

export { app, db, auth };
