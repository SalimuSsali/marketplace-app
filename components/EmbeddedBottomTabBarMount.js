"use client";

import { useEffect, useState } from "react";
import { BottomTabBar } from "./BottomTabBar";

/**
 * Same idea as GlobalBottomTabBarMount: tab bar mounts after hydration so
 * pathname-dependent UI and emoji glyphs cannot mismatch SSR HTML.
 */
export function EmbeddedBottomTabBarMount() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) {
    return (
      <div
        className="shrink-0 border-t border-gray-200 bg-white py-1.5"
        style={{ minHeight: "3.25rem" }}
        aria-hidden
      />
    );
  }
  return <BottomTabBar variant="embedded" />;
}
