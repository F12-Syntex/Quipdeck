"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

export type FeedChromeProps = {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

/**
 * Desktop pointer affordances (D-FEED-10): previous / next stacked 16 px to
 * the right of the card, vertically centred, and one line of key hints 28 px
 * above the bottom edge. Rendered only for a fine pointer at >= 1024 px.
 */
export function FeedChrome({ canPrev, canNext, onPrev, onNext }: FeedChromeProps) {
  return (
    <>
      <div className="fixed top-1/2 left-[calc(50%+min(1040px,100vw_-_192px)/2+16px)] flex -translate-y-1/2 flex-col gap-2">
        <button
          type="button"
          data-testid="feed-prev"
          aria-label="Previous card"
          disabled={!canPrev}
          onClick={onPrev}
          className="inline-flex size-11 items-center justify-center border border-neutral-700 disabled:opacity-40"
        >
          <ChevronUp aria-hidden="true" className="size-5" />
        </button>
        <button
          type="button"
          data-testid="feed-next"
          aria-label="Next card"
          disabled={!canNext}
          onClick={onNext}
          className="inline-flex size-11 items-center justify-center border border-neutral-700 disabled:opacity-40"
        >
          <ChevronDown aria-hidden="true" className="size-5" />
        </button>
      </div>
      <p
        data-testid="key-hints"
        className="fixed inset-x-0 bottom-7 text-center text-xs"
      >
        Space flip · Up / Down move · S save · M mute
      </p>
    </>
  );
}
