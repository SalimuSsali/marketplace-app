import { initializeApp, getApps, getApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import {
  hasRequiredWebConfig,
  readFirebaseWebConfigFromEnvironment,
} from "./firebaseBootstrap";
import { devError, misconfigWarnOnce } from "./devLog";

const FIREBASE_BOOTSTRAP = "firebase-bootstrap";

let firebaseConfig = readFirebaseWebConfigFromEnvironment();
let configured = hasRequiredWebConfig(firebaseConfig);

if (!configured) {
  misconfigWarnOnce(
    "firebase-web-config",
    "[firebase] Missing NEXT_PUBLIC_FIREBASE_* env vars. Auth/DB disabled until bootstrap.",
  );
}

/** Live bindings: may be filled after async `/api/firebase-web-config` on the client. */
export let app = null;
export let auth = null;
export let db = null;

let bootstrapped = false;

function applyFirebaseConfig(cfg) {
  if (!hasRequiredWebConfig(cfg)) return false;
  firebaseConfig = cfg;
  configured = true;
  try {
    app = getApps().length ? getApp() : initializeApp(cfg);
    try {
      if (typeof window === "undefined") {
        auth = getAuth(app);
      } else {
        auth = initializeAuth(app, {
          persistence: [indexedDBLocalPersistence, browserLocalPersistence],
        });
      }
    } catch {
      auth = getAuth(app);
    }
    db = getFirestore(app);
    bootstrapped = true;
    return true;
  } catch (e) {
    devError("[firebase] init failed", e);
    app = null;
    auth = null;
    db = null;
    bootstrapped = false;
    return false;
  }
}

if (configured) {
  applyFirebaseConfig(firebaseConfig);
}

if (typeof window !== "undefined" && !bootstrapped) {
  queueMicrotask(() => {
    if (bootstrapped) return;
    const retryCfg = readFirebaseWebConfigFromEnvironment();
    if (hasRequiredWebConfig(retryCfg)) {
      applyFirebaseConfig(retryCfg);
      if (bootstrapped) {
        window.dispatchEvent(new Event(FIREBASE_BOOTSTRAP));
      }
      return;
    }
    fetch("/api/firebase-web-config", { cache: "no-store" })
      .then((r) => r.json())
      .then((cfg) => {
        if (bootstrapped) return;
        if (applyFirebaseConfig(cfg)) {
          window.dispatchEvent(new Event(FIREBASE_BOOTSTRAP));
        }
      })
      .catch(() => {});
  });
}

export const FIREBASE_BOOTSTRAP_EVENT = FIREBASE_BOOTSTRAP;
