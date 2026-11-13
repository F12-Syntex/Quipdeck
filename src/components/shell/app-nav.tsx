"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** P1-1 stub. P1-2 builds the real nav and mounts it in the layout. */
export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary">
      <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
        Feed
      </Link>
      <Link
        href="/saved"
        aria-current={pathname === "/saved" ? "page" : undefined}
      >
        Saved
      </Link>
    </nav>
  );
}
