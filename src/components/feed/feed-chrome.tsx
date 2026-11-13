"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FeedChromeProps = {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** The hints fade out once a feed key has been used (Gate 1 carry-over). */
  hintsFaded?: boolean;
};

/**
 * Desktop pointer affordances (D-FEED-10): previous / next as blurred chrome
 * circles stacked 16 px to the right of the card, vertically centred, and one
 * quiet line of key hints 28 px above the bottom edge. Rendered only for a
 * fine pointer at >= 1024 px.
 */
export function FeedChrome({ canPrev, canNext, onPrev, onNext, hintsFaded = false }: FeedChromeProps) {
  return (
    <>
      <div className="fixed top-1/2 left-[calc(50%+min(1040px,100vw_-_192px)/2+16px)] flex -translate-y-1/2 flex-col gap-2">
        <Button
          variant="chrome"
          size="circle-lg"
          data-testid="feed-prev"
          aria-label="Previous card"
          disabled={!canPrev}
          onClick={onPrev}
        >
          <ChevronUp aria-hidden="true" />
        </Button>
        <Button
          variant="chrome"
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
          "pointer-events-none fixed inset-x-0 bottom-7 text-center text-caption text-fg-tertiary select-none transition-opacity duration-(--dur-base) ease-soft",
          // Faint at rest (5:1 or better over the glow peak); gone after use.
          hintsFaded ? "opacity-0" : "opacity-70",
        )}
      >
        Space flip · Up / Down move · S save · M mute
      </p>
    </>
  );
}
