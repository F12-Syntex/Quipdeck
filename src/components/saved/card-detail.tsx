"use client";

import { useEffect, useId } from "react";
import { XIcon } from "lucide-react";
import { cards } from "@/content";
import { CardBack } from "@/components/card/card-back";
import { Button } from "@/components/ui/button";
import { DrawerClose, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { moveHueStyle, publishMoveHue } from "@/lib/move-hue";

export type CardDetailProps = {
  cardId: string;
  /** "sheet" below the desktop breakpoint, "pane" at it (D-SAVED-7). */
  mode: "sheet" | "pane";
  /** The clip may play (default true). The sheet holds it until it has risen. */
  clipActive?: boolean;
};

/*
 * The title lines up with the card content's left edge: `CardBack` insets
 * its content by 16 px (`px-4`, 12 px in its compact tier at 700 px tall or
 * less), so the title row carries the same inset (Gate 1 carry-over).
 * The hue is scoped to the card's own move, so its tag, response bubble
 * and focus ring match the feed (D-THEME-3).
 */
const TITLE_INSET = "px-4 [@media(max-height:700px)]:px-3";

/**
 * One saved card, not a flip card (D-SAVED-6): the cue as title, then the
 * same `CardBack` content as the feed. The card is resolved from all cards,
 * not from the saved list, so unsaving keeps it open (D-SAVE-6).
 *
 * In "sheet" mode it must be rendered inside the Saved drawer (D-SAVED-8):
 * the close button comes first in DOM order and the cue is the drawer title,
 * which gives the dialog its accessible name (OV-5). The header stays put;
 * the card scrolls in `DrawerContent`, which holds off the swipe until it
 * is at the top.
 */
export function CardDetail({ cardId, mode, clipActive = true }: CardDetailProps) {
  const titleId = useId();
  const card = cards.find((c) => c.id === cardId);
  const move = card?.move ?? null;

  // Hue hand-off (D-THEME-3): the open card lights the ambient layer in its
  // move hue, as the feed's active card does. It is left in place on close;
  // the feed re-publishes its active card when it shows again.
  useEffect(() => {
    if (move) publishMoveHue(move);
  }, [move]);

  // One moving thing at a time: the drift holds still while the clip shows.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.ambient = "still";
    return () => {
      if (root.dataset.ambient === "still") delete root.dataset.ambient;
    };
  }, []);

  if (!card) return null;

  if (mode === "sheet") {
    return (
      <section
        data-testid="card-detail"
        data-card-id={card.id}
        data-mode="sheet"
        style={moveHueStyle(card.move)}
        className="hue-scope flex min-h-0 w-full flex-1 flex-col"
      >
        {/* Close is first in the DOM, drawn on the right (row-reverse). */}
        <div
          className={`flex shrink-0 flex-row-reverse items-start gap-3 pb-1 ${TITLE_INSET}`}
        >
          <DrawerClose
            render={<Button variant="glass" size="circle" aria-label="Close" />}
          >
            <XIcon aria-hidden="true" />
          </DrawerClose>
          <DrawerTitle className="min-w-0 flex-1 pt-2.5">
            {card.cue}
          </DrawerTitle>
        </div>
        <DrawerContent className="pb-3">
          <CardBack card={card} clipActive={clipActive} />
        </DrawerContent>
      </section>
    );
  }

  return (
    <section
      data-testid="card-detail"
      data-card-id={card.id}
      data-mode="pane"
      aria-labelledby={titleId}
      style={moveHueStyle(card.move)}
      className="hue-scope mx-auto flex w-full max-w-[560px] flex-col gap-1 p-4"
    >
      <h2
        id={titleId}
        className={`pt-4 text-heading text-balance text-fg-primary ${TITLE_INSET}`}
      >
        {card.cue}
      </h2>
      <CardBack card={card} clipActive={clipActive} />
    </section>
  );
}
