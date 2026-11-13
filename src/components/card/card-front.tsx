"use client";

import type { ReactNode } from "react";
import { motion, type MotionStyle } from "framer-motion";
import { getMove, type WitCard as WitCardData } from "@/content";
import { cn } from "@/lib/utils";

export type CardFrontProps = {
  card: WitCardData;
  /** Called by the "reveal" hint button. */
  onReveal: () => void;
  /** Set by `WitCard` while the back is showing: hidden and `inert`. */
  concealed?: boolean;
  /** Face paint and shape, from `WitCard`. */
  className?: string;
  /** Flip visuals (rotation, visibility, opacity), from `WitCard`. */
  style?: MotionStyle;
  /** Decoration drawn over the face during the flip (the specular sweep). */
  children?: ReactNode;
};

/**
 * Front (LAYOUT_PLAN section 4): cue (largest text), move label under it,
 * reveal hint at the bottom. No heart, mute or clip. The hint's wording
 * follows the pointer through CSS only, so server and client agree.
 * The cue and label sit at the optical centre (slightly above the middle).
 * The hint pulses only on the active card's showing front (one moving
 * thing at a time; no hidden animations on the other cards), and only for
 * two cycles each time the card becomes active, then rests at full
 * opacity (D-FEED-13). The animation is `none` while inactive, so it
 * restarts on the next activation. No pulse under reduced motion.
 */
export function CardFront({
  card,
  onReveal,
  concealed = false,
  className,
  style,
  children,
}: CardFrontProps) {
  return (
    <motion.div
      data-testid="card-front"
      inert={concealed}
      style={style}
      className={cn(
        "col-start-1 row-start-1 flex h-full min-h-0 w-full min-w-0 flex-col px-6 pt-8 pb-4 lg:px-14 lg:pt-14 lg:pb-11",
        concealed && "invisible",
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col justify-center pb-[12%] lg:pb-[4%]">
        <h2
          data-testid="cue"
          className="line-clamp-4 max-w-[18ch] text-cue text-balance text-fg-primary lg:text-cue-stage"
        >
          {card.cue}
        </h2>
        <p
          data-testid="move"
          className="mt-3 text-body text-fg-secondary lg:mt-5"
        >
          {getMove(card.move)?.label ?? card.move}
        </p>
      </div>
      <button
        type="button"
        data-testid="reveal"
        onClick={onReveal}
        className="min-h-11 animate-hint-pulse [animation-iteration-count:2] self-center rounded-pill px-4 text-caption text-fg-tertiary motion-reduce:animate-none in-data-[active=false]:animate-none in-data-[face=back]:animate-none lg:-ml-1 lg:self-start lg:px-1"
      >
        <span className="pointer-fine:hidden">Tap to reveal</span>
        <span className="hidden pointer-fine:inline">Click to reveal</span>
      </button>
      {children}
    </motion.div>
  );
}
