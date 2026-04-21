"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, FIREBASE_BOOTSTRAP_EVENT } from "../lib/firebase";

/** Current Firebase user, or null when signed out / auth unavailable. */
export function useFirebaseAuthUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let unsub = () => {};
    function attach() {
      unsub();
      unsub = () => {};
      if (!auth) {
        setUser(null);
        return;
      }
      unsub = onAuthStateChanged(auth, setUser);
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

  return user;
}
