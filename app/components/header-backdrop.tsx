"use client";

import { usePathname } from "next/navigation";

export function HeaderBackdrop() {
  const isHome = usePathname() === "/";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 border-b transition-colors duration-300 ease-out motion-reduce:transition-none ${
        isHome
          ? "border-border-subtle bg-surface-overlay lg:border-transparent lg:bg-transparent"
          : "border-border-subtle bg-surface-overlay"
      }`}
    />
  );
}
