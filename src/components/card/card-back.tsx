"use client";

import type { ReactNode } from "react";
import { motion, type MotionStyle } from "framer-motion";
import { getMove, type WitCard as WitCardData } from "@/content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { moveHueStyle } from "@/lib/move-hue";
import { cn } from "@/lib/utils";
import { Clip } from "./clip";
import { HeartButton } from "./heart-button";
import { MuteButton } from "./mute-button";

export type CardBackProps = {
  card: WitCardData;
  /** Passed to `Clip` as `active`. */
  clipActive: boolean;
  /** Feed only: renders the "Back to cue" button. Sheet and pane omit it. */
  onFlipBack?: () => void;
  /** Set by `WitCard` while the front is showing: hidden and `inert`. */
  concealed?: boolean;
  /** Face paint and shape, from `WitCard` (the Saved detail passes none). */
  className?: string;
  /** Flip visuals (rotation, visibility, opacity), from `WitCard`. */
  style?: MotionStyle;
  /** Decoration drawn over the face during the flip (the specular sweep). */
  children?: ReactNode;
};

/*
 * Layout (LAYOUT_PLAN sections 3 and 5, Gate 1 and Gate 2 carry-overs).
 * The root is a size container; the inner layout follows the card's width:
 * - below 720 px, stacked: the clip and action row are pinned to the
 *   bottom of the card (thumb zone; the heart and clip sit at the same
 *   place on every card), and the words (tag, exchange, breakdown) are one
 *   block with a fixed rhythm that sits on the media: the gap above the
 *   clip is the card's own gap (12 px, 8 px compact; LAYOUT_PLAN "gap under
 *   breakdown") and any free height goes above the words (Gate 2 note:
 *   tighten the loose gap above the clip; P4-8). The tag rides with the
 *   exchange instead of being pinned to the top (Gate 2 carry-over: no void
 *   between the tag and the first bubble; P4-6).
 * - from 720 px, two columns 5fr | 7fr: tag, exchange and breakdown as one
 *   group on the left, clip and actions on the right, both centred.
 * Height tiers follow the viewport height: compact at <= 700 px; below
 * 600 px the text block alone may scroll.
 * Every hue tint (tag, response bubble, focus ring) is the card's own move
 * hue, so a card next to the active one, or in the Saved detail, is right.
 */

/** Back (no flip logic). Reused by the feed, the sheet and the pane. */
export function CardBack({
  card,
  clipActive,
  onFlipBack,
  concealed = false,
  className,
  style,
  children,
}: CardBackProps) {
  return (
    <motion.div
      data-testid="card-back"
      inert={concealed}
      style={{ ...(moveHueStyle(card.move) as MotionStyle), ...style }}
      className={cn(
        "@container hue-scope col-start-1 row-start-1 h-full min-h-0 w-full min-w-0",
        concealed && "invisible",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex h-full flex-col justify-center-safe gap-3 px-4 pt-4 pb-3",
          "[@media(max-height:700px)]:gap-2 [@media(max-height:700px)]:px-3 [@media(max-height:700px)]:pt-3 [@media(max-height:700px)]:pb-2",
          "@min-[720px]:grid @min-[720px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] @min-[720px]:items-center @min-[720px]:gap-x-10 @min-[720px]:p-10",
          "@min-[720px]:[@media(max-height:700px)]:p-8",
        )}
      >
        {onFlipBack ? (
          <Button
            variant="glass"
            size="pill-sm"
            data-testid="flip-back"
            onClick={onFlipBack}
            className="pointer-events-none absolute top-3 left-3 z-10 opacity-0 focus-visible:pointer-events-auto focus-visible:opacity-100"
          >
            Back to cue
          </Button>
        ) : null}

        {/* Words: tag, exchange, breakdown. Stacked: resting on the media. */}
        <div
          className={cn(
            "flex min-h-0 flex-col gap-3 @max-[719px]:mt-auto",
            "[@media(max-height:700px)]:gap-2",
            "@min-[720px]:col-start-1 @min-[720px]:row-start-1 @min-[720px]:max-h-full @min-[720px]:gap-5",
          )}
        >
          <Badge
            variant="move"
            data-testid="move"
            render={<p />}
            className="self-start [@media(max-height:700px)]:h-6"
          >
            {getMove(card.move)?.label ?? card.move}
          </Badge>

          <div
            className={cn(
              "flex min-h-0 flex-col gap-2.5 overflow-hidden",
              "[@media(max-height:700px)]:gap-2 [@media(max-height:599px)]:overflow-y-auto",
              "@min-[720px]:gap-3",
            )}
          >
            <ul
              data-testid="exchange"
              className="flex flex-col gap-2 [@media(max-height:700px)]:gap-1.5"
            >
              <li
                data-testid="trigger"
                className="flex max-w-[85%] flex-col items-start gap-1 self-start"
              >
                <span
                  data-testid="speaker"
                  className="px-1 text-label leading-4 text-fg-secondary [@media(max-height:700px)]:leading-[14px]"
                >
                  {card.trigger.speaker}
                </span>
                <p
                  data-testid="line"
                  className="line-clamp-3 rounded-bubble glass-bubble px-3.5 py-2 text-line text-fg-primary [@media(max-height:700px)]:py-1.5 [@media(max-height:700px)]:text-line-compact"
                >
                  {card.trigger.line}
                </p>
              </li>
              <li
                data-testid="response"
                className="flex max-w-[85%] flex-col items-end gap-1 self-end"
              >
                <span
                  data-testid="speaker"
                  className="px-1 text-label leading-4 text-fg-secondary [@media(max-height:700px)]:leading-[14px]"
                >
                  {card.response.speaker}
                </span>
                <p
                  data-testid="line"
                  className="line-clamp-3 rounded-bubble hue-bubble px-3.5 py-2 text-line text-fg-primary [@media(max-height:700px)]:py-1.5 [@media(max-height:700px)]:text-line-compact"
                >
                  {card.response.line}
                </p>
              </li>
            </ul>

            <p
              data-testid="breakdown"
              className="line-clamp-2 px-1 text-body text-fg-secondary [@media(max-height:700px)]:leading-[18px]"
            >
              {card.breakdown}
            </p>
          </div>
        </div>

        {/* Media: clip and action row, as one block. */}
        <div
          className={cn(
            "flex min-w-0 shrink-0 flex-col gap-2",
            "[@media(max-height:700px)]:gap-1.5",
            "@min-[720px]:col-start-2 @min-[720px]:row-start-1",
            "[&:has([data-clip-state=error])_[data-testid=mute]]:invisible",
          )}
        >
          {/* Clip slot: 16:9, never under 200 px tall (F7); the clip fills it. */}
          <div className="aspect-video min-h-[200px] w-full *:h-full *:w-full">
            <Clip clip={card.clip} title={card.cue} active={clipActive} />
          </div>
          <div className="flex min-h-11 items-center gap-2">
            {card.source ? (
              <p
                data-testid="source"
                className="min-w-0 flex-1 truncate pl-1 text-caption text-fg-tertiary"
              >
                {card.source}
              </p>
            ) : (
              <span className="flex-1" />
            )}
            <MuteButton />
            <HeartButton cardId={card.id} />
          </div>
        </div>
      </div>
      {children}
    </motion.div>
  );
}
