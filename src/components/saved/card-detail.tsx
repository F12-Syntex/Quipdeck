"use client";

import { cards } from "@/content";
import { CardBack } from "@/components/card/card-back";

export type CardDetailProps = {
  cardId: string;
  /** "sheet" below the desktop breakpoint, "pane" at it (D-SAVED-7). */
  mode: "sheet" | "pane";
};

/** P1-1 stub. P1-5 builds the sheet and the pane. */
export function CardDetail({ cardId, mode }: CardDetailProps) {
  const card = cards.find((c) => c.id === cardId);
  if (!card) return null;
  return (
    <section data-testid="card-detail" data-card-id={card.id} data-mode={mode}>
      <h2>{card.cue}</h2>
      <CardBack card={card} clipActive />
    </section>
  );
}
