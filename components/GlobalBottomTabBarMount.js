"use client";

import { useEffect, useState } from "react";
import { GlobalBottomTabBar } from "./BottomTabBar";

/**
 * Renders the fixed tab bar only after mount so its markup (pathname + emoji)
 * never participates in SSR hydration (avoids server/client HTML mismatches).
 */
export function GlobalBottomTabBarMount() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;
  return <GlobalBottomTabBar />;
}
