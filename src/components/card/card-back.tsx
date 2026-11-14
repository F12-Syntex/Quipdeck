"use client";

import { motion, type MotionStyle } from "framer-motion";
import { getMove, type WitCard as WitCardData } from "@/content";
import { Badge, MOVE_BADGE } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { moveColorStyle } from "@/lib/move-color";
import { cn } from "@/lib/utils";
import { Clip } from "./clip";
import { HeartButton } from "./heart-button";
import { MuteButton } from "./mute-button";

export type CardBackProps = {
  card: WitCardData;
  /** Passed to "Clip" as "active". */
  clipActive: boolean;
  /** Feed only: renders the "Back to cue" button. Sheet and pane omit it. */
  onFlipBack?: () => void;
  /**
   * "feed" (default): the clip is full-bleed at the top of the card face.
   * "detail" (sheet and pane): the clip is inset and rounded.
   */
  layout?: "feed" | "detail";
  /** Set by "WitCard" while the front is showing: hidden and "inert". */
  concealed?: boolean;
  /** Face paint and shape, from "WitCard" (the Saved detail passes none). */
  className?: string;
  /** Flip visuals (rotation, visibility, opacity), from "WitCard". */
  style?: MotionStyle;
};

/*
 * Layout (REDESIGN_V2 5.2, 5.4, 5.8, 5.10). The root is a size container;
 * the inner layout follows the card's width, from one DOM:
 * - below 720 px, stacked: clip first (full-bleed in the feed, inset in the
 *   detail), then the tag row, the words zone (exchange and breakdown,
 *   centred in the free height, so no region of the card is empty) and the
 *   action row ("Back to cue" left, mute and heart right). Compact tier at
 *   a viewport height of 700 px or less.
 * - from 720 px, a 5fr | 7fr grid placed by row and column (the wrappers
 *   become "display: contents"): tag, exchange and "Back to cue" on the
 *   left; clip, breakdown, mute and heart on the right.
 * Clip fallback (stacked only): the 16:9 slot collapses into a 64 px notice
 * row inside the body padding, and the words step up a size to use the
 * height it releases. The clip element itself never moves in the tree, so
 * its state survives. The mute button is hidden in the error state.
 * The response bubble and the tag are painted in the card's move colour.
 */

/** Back (no flip logic). Reused by the feed, the sheet and the pane. */
export function CardBack({
  card,
  clipActive,
  onFlipBack,
  layout = "feed",
  concealed = false,
  className,
  style,
}: CardBackProps) {
  const detail = layout === "detail";
  return (
    <motion.div
      data-testid="card-back"
      inert={concealed}
      style={{ ...(moveColorStyle(card.move) as MotionStyle), ...style }}
      className={cn(
        "@container col-start-1 row-start-1 h-full min-h-0 w-full min-w-0",
        concealed && "invisible",
        className,
      )}
    >
      <div
        className={cn(
          "group/back flex h-full flex-col",
          "[&:has([data-clip-state=error])_[data-testid=mute]]:invisible",
          "@min-[720px]:grid @min-[720px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] @min-[720px]:grid-rows-[auto_1fr_auto_auto] @min-[720px]:gap-x-10 @min-[720px]:gap-y-5 @min-[720px]:p-8",
        )}
      >
        {/* Clip slot: 16:9, never under 200 px tall (F7); the clip fills it. */}
        <div
          className={cn(
            "aspect-video min-h-[200px] w-full shrink-0 overflow-hidden",
            detail && "mx-5 w-auto rounded-2xl [@media(max-height:700px)]:mx-4",
            "@max-[719px]:has-data-[clip-state=error]:mx-5 @max-[719px]:has-data-[clip-state=error]:mt-5 @max-[719px]:has-data-[clip-state=error]:aspect-auto @max-[719px]:has-data-[clip-state=error]:h-16 @max-[719px]:has-data-[clip-state=error]:min-h-0 @max-[719px]:has-data-[clip-state=error]:w-auto @max-[719px]:has-data-[clip-state=error]:rounded-2xl",
            detail && "@max-[719px]:has-data-[clip-state=error]:mt-0",
            "[@media(max-height:700px)]:@max-[719px]:has-data-[clip-state=error]:mx-4 [@media(max-height:700px)]:@max-[719px]:has-data-[clip-state=error]:mt-4",
            "@min-[720px]:col-start-2 @min-[720px]:row-span-2 @min-[720px]:row-start-1 @min-[720px]:mx-0 @min-[720px]:w-full @min-[720px]:rounded-2xl",
          )}
        >
          <Clip clip={card.clip} title={card.cue} active={clipActive} />
        </div>

        {/* Body: tag, words, actions. A grid of its own children from 720 px. */}
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col px-5 pt-5 pb-4",
            detail && "pt-4 pb-1",
            "[@media(max-height:700px)]:px-4 [@media(max-height:700px)]:pt-3 [@media(max-height:700px)]:pb-2",
            "@min-[720px]:contents",
          )}
        >
          <div className="flex h-8 shrink-0 items-center justify-between gap-3 @min-[720px]:col-start-1 @min-[720px]:row-start-1 @min-[720px]:self-start">
            <Badge
              data-testid="move"
              render={<p />}
              className={cn(MOVE_BADGE, "[@media(max-height:700px)]:h-7")}
            >
              {getMove(card.move)?.label ?? card.move}
            </Badge>
            {card.source ? (
              <p
                data-testid="source"
                className="min-w-0 truncate text-sm text-muted-foreground"
              >
                {card.source}
              </p>
            ) : null}
          </div>

          {/* Words zone: free height splits evenly above and below. */}
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col justify-center-safe gap-5 py-3",
              detail && "gap-4 py-2",
              "[@media(max-height:700px)]:gap-2.5 [@media(max-height:700px)]:py-0 [@media(max-height:700px)]:overflow-y-auto",
              "@min-[720px]:contents",
            )}
          >
            <ul
              data-testid="exchange"
              className={cn(
                "flex flex-col gap-3",
                "[@media(max-height:700px)]:gap-2",
                "@min-[720px]:col-start-1 @min-[720px]:row-span-2 @min-[720px]:row-start-2 @min-[720px]:self-center",
              )}
            >
              <li
                data-testid="trigger"
                className="flex max-w-[88%] flex-col items-start gap-1.5 self-start @min-[720px]:max-w-[92%]"
              >
                <span
                  data-testid="speaker"
                  className={
                    "text-sm leading-5 font-semibold text-muted-foreground [@media(max-height:700px)]:leading-[18px]"
                  }
                >
                  {card.trigger.speaker}
                </span>
                <p
                  data-testid="line"
                  className={cn(
                    "line-clamp-3 rounded-3xl rounded-bl-md bg-muted px-4 py-3.5 text-xl leading-7 text-foreground",
                    "[@media(max-height:700px)]:py-2.5 [@media(max-height:700px)]:text-base [@media(max-height:700px)]:leading-6",
                    "@max-[719px]:group-has-data-[clip-state=error]/back:text-2xl @max-[719px]:group-has-data-[clip-state=error]/back:leading-8",
                    "@min-[720px]:line-clamp-none @min-[720px]:text-xl @min-[720px]:leading-7 @min-[960px]:text-2xl @min-[960px]:leading-8",
                  )}
                >
                  {card.trigger.line}
                </p>
              </li>
              <li
                data-testid="response"
                className="flex max-w-[88%] flex-col items-end gap-1.5 self-end @min-[720px]:max-w-[92%]"
              >
                <span
                  data-testid="speaker"
                  className={
                    "text-sm leading-5 font-semibold text-muted-foreground [@media(max-height:700px)]:leading-[18px]"
                  }
                >
                  {card.response.speaker}
                </span>
                <p
                  data-testid="line"
                  className={cn(
                    "line-clamp-3 rounded-3xl rounded-br-md bg-(--move) px-4 py-3.5 text-xl leading-7 font-medium text-(--move-foreground)",
                    "[@media(max-height:700px)]:py-2.5 [@media(max-height:700px)]:text-base [@media(max-height:700px)]:leading-6",
                    "@max-[719px]:group-has-data-[clip-state=error]/back:text-2xl @max-[719px]:group-has-data-[clip-state=error]/back:leading-8",
                    "@min-[720px]:line-clamp-none @min-[720px]:text-xl @min-[720px]:leading-7 @min-[960px]:text-2xl @min-[960px]:leading-8",
                  )}
                >
                  {card.response.line}
                </p>
              </li>
            </ul>

            <div className="flex flex-col gap-1 @min-[720px]:col-start-2 @min-[720px]:row-start-3">
              <p
                className={
                  "text-sm font-semibold text-muted-foreground [@media(max-height:700px)]:hidden"
                }
              >
                Why it lands
              </p>
              <p
                data-testid="breakdown"
                className={cn(
                  "line-clamp-2 text-lg leading-[26px] text-foreground",
                  "[@media(max-height:700px)]:text-base [@media(max-height:700px)]:leading-6",
                  "@max-[719px]:group-has-data-[clip-state=error]/back:text-xl @max-[719px]:group-has-data-[clip-state=error]/back:leading-7",
                  "@min-[720px]:line-clamp-none @min-[720px]:text-xl @min-[720px]:leading-7",
                )}
              >
                {card.breakdown}
              </p>
            </div>
          </div>

          {/* Action row. */}
          <div className="flex h-12 shrink-0 items-center justify-between gap-2 @min-[720px]:contents">
            {onFlipBack ? (
              <Button
                variant="ghost"
                data-testid="flip-back"
                onClick={onFlipBack}
                className="h-12 rounded-full px-4 text-sm font-semibold text-muted-foreground @min-[720px]:col-start-1 @min-[720px]:row-start-4 @min-[720px]:-ml-4 @min-[720px]:justify-self-start"
              >
                Back to cue
              </Button>
            ) : (
              <span aria-hidden="true" />
            )}
            <div className="flex items-center gap-2 @min-[720px]:col-start-2 @min-[720px]:row-start-4 @min-[720px]:justify-self-end">
              <MuteButton />
              <HeartButton cardId={card.id} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
