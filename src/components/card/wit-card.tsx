"use client";

import type { WitCard as WitCardData } from "@/content";
import { useIsFlipped, visit } from "@/lib/visit-store";
import { CardBack } from "./card-back";
import { CardFront } from "./card-front";

export type WitCardProps = {
  card: WitCardData;
  /** True for the feed's active card. */
  active: boolean;
};

/** P1-1 stub. P1-3 builds the real card; it owns the flip. */
export function WitCard({ card, active }: WitCardProps) {
  const flipped = useIsFlipped(card.id);
  const flip = () => visit.toggleFlip(card.id);
  return (
    <article
      role="group"
      aria-label={card.cue}
      data-testid="card"
      data-card-id={card.id}
      data-face={flipped ? "back" : "front"}
      data-active={active ? "true" : "false"}
      className="h-full w-full border border-neutral-700"
    >
      {flipped ? (
        <CardBack card={card} clipActive={active} onFlipBack={flip} />
      ) : (
        <CardFront card={card} onReveal={flip} />
      )}
    </article>
  );
}
