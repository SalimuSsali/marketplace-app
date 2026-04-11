"use client";

import { usePathname } from "next/navigation";

/** Bottom padding for fixed tab bar; home (`/`) uses in-mockup tabs so no extra pad. */
export function MainColumnPad({ children }) {
  const pathname = usePathname() || "";
  const needsPad = pathname !== "/";
  return (
    <div className={needsPad ? "pb-[6.25rem]" : undefined}>{children}</div>
  );
}
