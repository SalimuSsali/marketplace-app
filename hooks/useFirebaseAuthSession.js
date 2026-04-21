"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, FIREBASE_BOOTSTRAP_EVENT } from "../lib/firebase";

/**
 * Firebase auth user plus `ready` (false until first auth state is known).
 * Use `ready` to avoid treating the initial null user as “signed out” before the listener runs.
 */
export function useFirebaseAuthSession() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsub = () => {};
    function attach() {
      unsub();
      unsub = () => {};
      if (!auth) {
        setUser(null);
        setReady(true);
        return;
      }
      unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setReady(true);
      });
    }
    attach();
    const onBoot = () => attach();
    if (typeof window !== "undefined") {
      window.addEventListener(FIREBASE_BOOTSTRAP_EVENT, onBoot);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(FIREBASE_BOOTSTRAP_EVENT, onBoot);
      }
      unsub();
    };
  }, []);

  return { user, ready };
}
