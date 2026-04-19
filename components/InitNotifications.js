"use client";

import { useEffect } from "react";
import { saveUserToken } from "@/lib/saveUserToken";
import { useFirebaseAuthUser } from "@/hooks/useFirebaseAuthUser";

/**
 * Registers push when a Firebase user is present. Pass `user` from a parent, or omit it to use
 * the client auth session from `useFirebaseAuthUser`.
 */
export default function InitNotifications({ user: userProp }) {
  const authUser = useFirebaseAuthUser();
  const user = userProp ?? authUser;

  useEffect(() => {
    if (user?.uid) {
      void saveUserToken(user.uid);
    }
  }, [user?.uid]);

  return null;
}
