"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export type FeedChromeProps = {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** The hints fade out once a feed key has been used (Gate 1 carry-over). */
  hintsFaded?: boolean;
};

const KEY = "rounded-md px-1.5 py-0.5 font-mono";

/**
 * Desktop pointer affordances (D-FEED-10, REDESIGN_V2 5.10): previous / next
 * as 48 px outline circles stacked 16 px to the right of the card, vertically
 * centred, and one line of key hints 24 px above the bottom edge, each key in
 * stock kbd styling. Rendered only for a fine pointer at >= 1024 px.
 */
export function FeedChrome({
  canPrev,
  canNext,
  onPrev,
  onNext,
  hintsFaded = false,
}: FeedChromeProps) {
  return (
    <>
      <div className="fixed top-1/2 left-[calc(50%+min(1120px,100vw_-_200px)/2+16px)] flex -translate-y-1/2 flex-col gap-2">
        <Button
          variant="outline"
          size="circle-lg"
          data-testid="feed-prev"
          aria-label="Previous card"
          disabled={!canPrev}
          onClick={onPrev}
        >
          <ChevronUp aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="circle-lg"
          data-testid="feed-next"
          aria-label="Next card"
          disabled={!canNext}
          onClick={onNext}
        >
          <ChevronDown aria-hidden="true" />
        </Button>
      </div>
      <p
        data-testid="key-hints"
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-6 text-center text-xs whitespace-nowrap text-muted-foreground select-none transition-opacity duration-(--dur-base) ease-soft",
          hintsFaded ? "opacity-0" : "opacity-100",
        )}
      >
        <Kbd className={KEY}>Space</Kbd> flip · <Kbd className={KEY}>Up</Kbd> /{" "}
        <Kbd className={KEY}>Down</Kbd> move · <Kbd className={KEY}>S</Kbd> save
        · <Kbd className={KEY}>M</Kbd> mute
      </p>
    </>
  );
}
