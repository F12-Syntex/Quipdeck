"use client";

import { motion, type MotionStyle } from "framer-motion";
import { RotateCw } from "lucide-react";
import { getMove, type WitCard as WitCardData } from "@/content";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CardFrontProps = {
  card: WitCardData;
  /** Called by the "reveal" button. */
  onReveal: () => void;
  /** Set by `WitCard` while the back is showing: hidden and `inert`. */
  concealed?: boolean;
  /** Face paint and shape, from `WitCard`. */
  className?: string;
  /** Flip visuals (rotation, visibility, opacity), from `WitCard`. */
  style?: MotionStyle;
};

/**
 * Front (REDESIGN_V2 5.1 and 5.10): a solid move-colour poster. Eyebrow row
 * at the top, the cue (largest text) centred in the free height, and a black
 * footer panel with the move label and the reveal button. The cue is
 * 13.5cqw (50 px on a 374 px card): the widest seed word, "inconvenience",
 * measures 280 px at 45 px in DM Sans, so it still fits. No heart, mute or
 * clip. The face is a size container: the cue scales with the card's width
 * and, on short cards, its height, so it never leaves its zone. From 720 px
 * of card width the cue and the footer sit side by side.
 * The reveal wording follows the pointer through CSS only, so server and
 * client agree. The whole face stays tappable (WitCard).
 */
export function CardFront({
  card,
  onReveal,
  concealed = false,
  className,
  style,
}: CardFrontProps) {
  return (
    <motion.div
      data-testid="card-front"
      inert={concealed}
      style={style}
      className={cn(
        "col-start-1 row-start-1 h-full min-h-0 w-full min-w-0 [container-type:size]",
        concealed && "invisible",
        className,
      )}
    >
      <div className="flex h-full flex-col p-6 [@media(max-height:700px)]:p-5 @min-[720px]:p-10">
        <div className="flex h-7 shrink-0 items-center justify-between gap-4">
          <p className="text-sm font-semibold tracking-[0.08em] uppercase">
            The cue
          </p>
          {card.source ? (
            <p className="min-w-0 truncate text-sm font-medium">
              {card.source}
            </p>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col @min-[720px]:flex-row @min-[720px]:items-end @min-[720px]:gap-10">
          <div className="flex min-h-0 min-w-0 flex-1 items-center @min-[720px]:self-stretch">
            <h2
              data-testid="cue"
              className="line-clamp-6 text-[clamp(2.25rem,min(13.5cqw,9cqh),4.5rem)] leading-[1.04] font-bold tracking-[-0.03em] text-balance break-words hyphens-auto @min-[720px]:max-w-[14ch] @min-[720px]:text-7xl @min-[720px]:leading-none"
            >
              {card.cue}
            </h2>
          </div>

          <div className="mt-4 shrink-0 rounded-3xl bg-background p-4 text-foreground [@media(max-height:700px)]:mt-3 @min-[720px]:mt-0 @min-[720px]:w-[340px]">
            <p className="text-sm font-medium text-muted-foreground">
              The move
            </p>
            <p
              data-testid="move"
              className="text-2xl font-bold tracking-[-0.01em] [@media(max-height:700px)]:text-xl"
            >
              {getMove(card.move)?.label ?? card.move}
            </p>
            <Button
              data-testid="reveal"
              onClick={onReveal}
              className="mt-3 h-13 w-full gap-2 rounded-full bg-(--move) text-base font-semibold text-(--move-foreground) hover:bg-(--move)/90 [@media(max-height:700px)]:h-12 [&_svg:not([class*='size-'])]:size-5"
            >
              <span className="pointer-fine:hidden">Tap to reveal</span>
              <span className="hidden pointer-fine:inline">
                Click to reveal
              </span>
              <RotateCw aria-hidden="true" data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
