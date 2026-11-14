"use client";

import { useId } from "react";
import { XIcon } from "lucide-react";
import { cards } from "@/content";
import { CardBack } from "@/components/card/card-back";
import { Button } from "@/components/ui/button";
import {
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";

export type CardDetailProps = {
  cardId: string;
  /** "sheet" below the desktop breakpoint, "pane" at it (D-SAVED-7). */
  mode: "sheet" | "pane";
  /** The clip may play (default true). The sheet holds it until it has risen. */
  clipActive?: boolean;
};

/*
 * The title lines up with the card content's left edge: `CardBack` insets
 * its content by 20 px (`px-5`, 16 px in its compact tier at 700 px tall or
 * less), so the title row carries the same inset (Gate 1 carry-over).
 */
const TITLE_INSET = "px-5 [@media(max-height:700px)]:px-4";

/**
 * One saved card, not a flip card (D-SAVED-6, REDESIGN_V2 5.8): the cue as
 * title, then the same `CardBack` content as the feed in its "detail"
 * layout (inset, rounded clip at the top). The card is resolved from all
 * cards, not from the saved list, so unsaving keeps it open (D-SAVE-6).
 *
 * In "sheet" mode it must be rendered inside the Saved drawer (D-SAVED-8):
 * the close button comes first in DOM order and the cue is the drawer title,
 * which gives the dialog its accessible name (OV-5). The header stays put;
 * the card scrolls in `DrawerContent`, which holds off the swipe until it
 * is at the top.
 */
export function CardDetail({
  cardId,
  mode,
  clipActive = true,
}: CardDetailProps) {
  const titleId = useId();
  const card = cards.find((c) => c.id === cardId);

  if (!card) return null;

  if (mode === "sheet") {
    return (
      <section
        data-testid="card-detail"
        data-card-id={card.id}
        data-mode="sheet"
        className="flex min-h-0 w-full flex-1 flex-col"
      >
        {/* Close is first in the DOM, drawn on the right (row-reverse). */}
        <div
          className={`flex shrink-0 flex-row-reverse items-start gap-3 pt-3 pb-4 ${TITLE_INSET}`}
        >
          <DrawerClose
            render={
              <Button variant="outline" size="circle-lg" aria-label="Close" />
            }
          >
            <XIcon aria-hidden="true" />
          </DrawerClose>
          <DrawerTitle className="min-w-0 flex-1 pt-2.5 text-balance">
            {card.cue}
          </DrawerTitle>
        </div>
        <DrawerContent className="pb-3">
          <CardBack card={card} clipActive={clipActive} layout="detail" />
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
      className="mx-auto flex w-full max-w-[520px] flex-col gap-4 px-3 pt-6 pb-3"
    >
      <h2
        id={titleId}
        className={`text-3xl font-bold tracking-[-0.02em] text-balance text-foreground ${TITLE_INSET}`}
      >
        {card.cue}
      </h2>
      <CardBack card={card} clipActive={clipActive} layout="detail" />
    </section>
  );
}
