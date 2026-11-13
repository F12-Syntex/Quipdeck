"use client";

import { useRef, useState } from "react";
import { motion, type PanInfo } from "framer-motion";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CardDetail } from "./card-detail";

/** Drag distance or speed past which a drag on the grabber dismisses. */
const DISMISS_OFFSET = 96;
const DISMISS_VELOCITY = 500;

export type DetailSheetProps = {
  /** The card to show, or `null` when the sheet is closed. */
  cardId: string | null;
  /** The single close routine (close button, Escape, backdrop, drag). */
  onClose: () => void;
  /** Where focus lands after closing this card (its row, D-SAVED-7). */
  returnFocus: (cardId: string) => HTMLElement | null;
};

/**
 * Phone container for the detail (D-SAVED-7): a modal bottom sheet on the
 * Base UI Dialog (focus trap, Escape, scroll lock, backdrop). Always mounted;
 * `open` is derived from the URL by the caller. Swipe down on the grabber
 * strip dismisses; the drag lives on that strip only so it cannot fight the
 * content or the player.
 */
export function DetailSheet({ cardId, onClose, returnFocus }: DetailSheetProps) {
  // Keep the last card while the sheet plays its exit transition.
  const [shownId, setShownId] = useState(cardId);
  if (cardId !== null && cardId !== shownId) setShownId(cardId);

  const stripRef = useRef<HTMLDivElement>(null);

  const popup = () =>
    stripRef.current?.closest<HTMLElement>('[data-slot="sheet-content"]') ??
    null;

  const onPan = (_: PointerEvent, info: PanInfo) => {
    const el = popup();
    if (!el) return;
    el.style.transition = "none";
    el.style.transform = `translateY(${Math.max(0, info.offset.y)}px)`;
  };

  const onPanEnd = (_: PointerEvent, info: PanInfo) => {
    const el = popup();
    if (info.offset.y > DISMISS_OFFSET || info.velocity.y > DISMISS_VELOCITY) {
      onClose();
      return;
    }
    if (el) {
      el.style.transition = "";
      el.style.transform = "";
    }
  };

  return (
    <Sheet
      open={cardId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        finalFocus={() => (shownId ? returnFocus(shownId) : null) ?? true}
        className="mx-auto max-h-[92dvh] w-full max-w-[560px] gap-0 border border-neutral-700 pb-[calc(env(safe-area-inset-bottom)+12px)]"
      >
        <motion.div
          ref={stripRef}
          aria-hidden="true"
          data-testid="sheet-grabber"
          onPan={onPan}
          onPanEnd={onPanEnd}
          className="flex h-8 shrink-0 cursor-grab touch-none items-center justify-center"
        >
          <div className="h-1 w-10 bg-neutral-600" />
        </motion.div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
          {shownId ? <CardDetail cardId={shownId} mode="sheet" /> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
