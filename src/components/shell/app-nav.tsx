"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Layers } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Feed", Icon: Layers },
  { href: "/saved", label: "Saved", Icon: Bookmark },
] as const;

/**
 * Primary navigation (LAYOUT_PLAN section 2). Fixed, bottom centre on phone,
 * top centre from 1024 px. Two links, no counts, never hides.
 */
export function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed left-1/2 z-50 flex h-[52px] w-[200px] -translate-x-1/2 items-stretch rounded-full border border-neutral-600 bg-neutral-900 p-1 bottom-[calc(env(safe-area-inset-bottom)+8px)] lg:bottom-auto lg:top-5"
    >
      {ITEMS.map(({ href, label, Icon }) => {
        const current = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`flex min-h-11 min-w-[88px] flex-1 items-center justify-center gap-1.5 rounded-full text-sm ${
              current ? "bg-neutral-700 text-neutral-50" : "text-neutral-400"
            }`}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
