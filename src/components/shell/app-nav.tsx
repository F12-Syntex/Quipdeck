"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Layers } from "lucide-react";
import { NavPill, NavPillItem } from "@/components/ui/nav-pill";

const ITEMS = [
  { href: "/", label: "Feed", Icon: Layers },
  { href: "/saved", label: "Saved", Icon: Bookmark },
] as const;

/**
 * Primary navigation (LAYOUT_PLAN section 2, REDESIGN_V2 5.9). Fixed, bottom
 * centre on phone, top centre from 1024 px. Two links, no counts, never
 * hides. 60 px tall: the feed and Saved keep 8 px clear of it.
 *
 * Presentation lives in NavPill. This file owns placement and the current
 * route. Each item always receives an explicit `active` boolean so the
 * capsule follows the route.
 */
export function AppNav() {
  const pathname = usePathname();
  return (
    <NavPill
      aria-label="Primary"
      className="fixed left-1/2 z-50 w-max -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+8px)] lg:bottom-auto lg:top-5"
    >
      {ITEMS.map(({ href, label, Icon }) => {
        const current = pathname === href;
        return (
          <NavPillItem
            key={href}
            render={<Link href={href} />}
            active={current}
            aria-current={current ? "page" : undefined}
          >
            <Icon aria-hidden="true" />
            {label}
          </NavPillItem>
        );
      })}
    </NavPill>
  );
}
