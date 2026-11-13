"use client";

import { useAnnouncement } from "./announcer";

/** The polite live region (`[data-testid="live"]`). Visually hidden. */
export function LiveRegion() {
  const { text, n } = useAnnouncement();
  return (
    <div data-testid="live" aria-live="polite" className="sr-only">
      <span key={n}>{text}</span>
    </div>
  );
}
