"use client";

import { useRef, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import type { WitCard as WitCardData } from "@/content";
import { useIsFlipped, visit } from "@/lib/visit-store";
import { CardBack } from "./card-back";
import { CardFront } from "./card-front";

export type WitCardProps = {
  card: WitCardData;
  /** True for the feed's active card. */
  active: boolean;
};

/** Clicks on these never flip the card (D-FEED-6). */
const NO_FLIP = "button, a, input, textarea, select, label, iframe, [data-no-flip]";

/**
 * One feed card. Owns the flip (instant swap in Phase 1). Both faces stay
 * mounted in one grid cell; the hidden face is `invisible` and `inert`.
 * A non-active card is `inert` as a whole (D-FEED-8).
 */
export function WitCard({ card, active }: WitCardProps) {
  const flipped = useIsFlipped(card.id);
  const rootRef = useRef<HTMLElement>(null);

  /** Flip from a face button, then focus the matching button on the new face. */
  const flipAndFocus = (selector: string) => {
    flushSync(() => visit.toggleFlip(card.id));
    rootRef.current?.querySelector<HTMLElement>(selector)?.focus();
  };

  const onClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target;
    if (target instanceof Element && target.closest(NO_FLIP)) return;
    // A text selection in progress does not flip (FL-12).
    if (window.getSelection()?.toString()) return;
    visit.toggleFlip(card.id);
  };

  return (
    <article
      ref={rootRef}
      role="group"
      aria-roledescription="card"
      aria-label={card.cue}
      tabIndex={-1}
      inert={!active}
      data-testid="card"
      data-card-id={card.id}
      data-face={flipped ? "back" : "front"}
      data-active={active ? "true" : "false"}
      onClick={onClick}
      className="grid h-full w-full grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] border border-neutral-700"
    >
      <CardFront
        card={card}
        concealed={flipped}
        onReveal={() => flipAndFocus('[data-testid="flip-back"]')}
      />
      <CardBack
        card={card}
        concealed={!flipped}
        clipActive={active && flipped}
        onFlipBack={() => flipAndFocus('[data-testid="reveal"]')}
      />
    </article>
  );
}
