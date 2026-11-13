"use client";

import { useState } from "react";
import { Drawer, DrawerHandle, DrawerPopup } from "@/components/ui/drawer";
import { CardDetail } from "./card-detail";

export type DetailSheetProps = {
  /** The card to show, or `null` when the sheet is closed. */
  cardId: string | null;
  /** The single close routine (close button, Escape, backdrop, swipe). */
  onClose: () => void;
  /** Where focus lands after closing this card (its row, D-SAVED-7). */
  returnFocus: (cardId: string) => HTMLElement | null;
};

/**
 * Phone container for the detail (D-SAVED-7, D-SAVED-8): a modal bottom
 * sheet on the Base UI Drawer (focus trap, Escape, scroll lock, scrim,
 * native swipe-to-dismiss). Always mounted; `open` is derived from the URL
 * by the caller, so every close path runs the same `onClose`.
 *
 * Height: the drawer popup hangs a 3rem bleed below the screen. Its box is
 * capped at 92dvh in all (OV-13), so the visible sheet stays under that.
 *
 * One moving thing at a time: the clip may start only once the sheet has
 * finished rising (instant under reduced motion), as the feed's clip waits
 * for the flip to settle (D-CLIP-6).
 */
export function DetailSheet({ cardId, onClose, returnFocus }: DetailSheetProps) {
  // Keep the last card while the sheet plays its exit transition.
  const [shownId, setShownId] = useState(cardId);
  if (cardId !== null && cardId !== shownId) setShownId(cardId);
  // True once the open transition has finished; false again once closed.
  const [risen, setRisen] = useState(false);

  return (
    <Drawer
      open={cardId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      onOpenChangeComplete={setRisen}
    >
      <DrawerPopup
        finalFocus={() => (shownId ? returnFocus(shownId) : null) ?? true}
        className="max-h-[92dvh]"
      >
        <DrawerHandle data-testid="sheet-grabber" />
        {shownId ? <CardDetail cardId={shownId} mode="sheet" clipActive={risen} /> : null}
      </DrawerPopup>
    </Drawer>
  );
}
