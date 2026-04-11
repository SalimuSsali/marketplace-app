"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";

/**
 * Firebase auth user plus `ready` (false until first auth state is known).
 * Use `ready` to avoid treating the initial null user as “signed out” before the listener runs.
 */
export function useFirebaseAuthSession() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!auth) {
      setUser(null);
      setReady(true);
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  return { user, ready };
}
