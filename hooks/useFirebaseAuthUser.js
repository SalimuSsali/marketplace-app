"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";

/** Current Firebase user, or null when signed out / auth unavailable. */
export function useFirebaseAuthUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!auth) {
      setUser(null);
      return;
    }
    return onAuthStateChanged(auth, setUser);
  }, []);

  return user;
}
