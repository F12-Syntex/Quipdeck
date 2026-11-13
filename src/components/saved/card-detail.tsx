"use client";

import { useId } from "react";
import { XIcon } from "lucide-react";
import { cards } from "@/content";
import { CardBack } from "@/components/card/card-back";
import { SheetClose, SheetTitle } from "@/components/ui/sheet";

export type CardDetailProps = {
  cardId: string;
  /** "sheet" below the desktop breakpoint, "pane" at it (D-SAVED-7). */
  mode: "sheet" | "pane";
};

/**
 * One saved card, not a flip card (D-SAVED-6): the cue as title, then the
 * same `CardBack` content as the feed. The card is resolved from all cards,
 * not from the saved list, so unsaving keeps it open (D-SAVE-6).
 *
 * In "sheet" mode it must be rendered inside the Saved sheet (a Base UI
 * Dialog): the close button comes first in DOM order and the cue is the
 * dialog title, which gives the dialog its accessible name (OV-5).
 */
export function CardDetail({ cardId, mode }: CardDetailProps) {
  const titleId = useId();
  const card = cards.find((c) => c.id === cardId);
  if (!card) return null;

  if (mode === "sheet") {
    return (
      <section
        data-testid="card-detail"
        data-card-id={card.id}
        data-mode="sheet"
        className="flex w-full flex-col gap-3"
      >
        {/* Close is first in the DOM, drawn on the right (row-reverse). */}
        <div className="flex flex-row-reverse items-start justify-between gap-3">
          <SheetClose className="flex size-11 shrink-0 items-center justify-center border border-neutral-700">
            <XIcon aria-hidden="true" className="size-5" />
            <span className="sr-only">Close</span>
          </SheetClose>
          <SheetTitle className="min-w-0 flex-1 pt-2 text-lg font-normal leading-snug">
            {card.cue}
          </SheetTitle>
        </div>
        <CardBack card={card} clipActive />
      </section>
    );
  }

  return (
    <section
      data-testid="card-detail"
      data-card-id={card.id}
      data-mode="pane"
      aria-labelledby={titleId}
      className="mx-auto flex w-full max-w-[560px] flex-col gap-3 p-4"
    >
      <h2 id={titleId} className="text-lg leading-snug">
        {card.cue}
      </h2>
      <CardBack card={card} clipActive />
    </section>
  );
}
