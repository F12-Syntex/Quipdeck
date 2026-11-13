import { getMove, type WitCard as WitCardData } from "@/content";
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
};

/*
 * Layout (LAYOUT_PLAN sections 3 and 5). The root is a size container; the
 * inner grid follows the card's own width:
 * - below 720 px, stacked: tag / text block (flexible, centred) / clip + actions
 * - from 720 px, two columns 5fr | 7fr: tag, exchange, breakdown on the left
 *   (the text block wrapper becomes `display: contents`), clip + actions on
 *   the right, vertically centred.
 * Height tiers follow the viewport height: compact at <= 700 px; below 600 px
 * the text block alone may scroll.
 */

/** Back (no flip logic). Reused by the feed, the sheet and the pane. */
export function CardBack({
  card,
  clipActive,
  onFlipBack,
  concealed = false,
}: CardBackProps) {
  return (
    <div
      data-testid="card-back"
      inert={concealed}
      className={cn(
        "@container col-start-1 row-start-1 h-full min-h-0 w-full min-w-0",
        concealed && "invisible",
      )}
    >
      <div className="relative grid h-full grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] gap-y-3 px-4 pt-4 pb-3 [@media(max-height:700px)]:gap-y-2 [@media(max-height:700px)]:px-3 [@media(max-height:700px)]:pt-3 [@media(max-height:700px)]:pb-2 @min-[720px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] @min-[720px]:gap-x-10 @min-[720px]:gap-y-4 @min-[720px]:p-10 @min-[720px]:[@media(max-height:700px)]:p-8">
        {onFlipBack ? (
          <button
            type="button"
            data-testid="flip-back"
            onClick={onFlipBack}
            className="pointer-events-none absolute top-2 left-2 z-10 min-h-11 border border-neutral-700 bg-neutral-950 px-3 text-sm opacity-0 focus-visible:pointer-events-auto focus-visible:opacity-100"
          >
            Back to cue
          </button>
        ) : null}

        <p
          data-testid="move"
          className="col-start-1 row-start-1 justify-self-start border border-neutral-700 px-2.5 py-1 text-xs leading-4 [@media(max-height:700px)]:py-[3px]"
        >
          {getMove(card.move)?.label ?? card.move}
        </p>

        <div className="col-start-1 row-start-2 flex min-h-0 flex-col justify-center gap-2.5 overflow-hidden [@media(max-height:599px)]:overflow-y-auto [@media(max-height:700px)]:gap-2 @min-[720px]:contents">
          <ul
            data-testid="exchange"
            className="flex flex-col gap-2 [@media(max-height:700px)]:gap-1.5 @min-[720px]:col-start-1 @min-[720px]:row-start-2 @min-[720px]:self-center"
          >
            <li
              data-testid="trigger"
              className="flex max-w-[85%] flex-col items-start self-start"
            >
              <span
                data-testid="speaker"
                className="text-xs leading-4 [@media(max-height:700px)]:leading-[14px]"
              >
                {card.trigger.speaker}
              </span>
              <p
                data-testid="line"
                className="line-clamp-3 border border-neutral-700 px-3 py-2 text-sm leading-5 [@media(max-height:700px)]:py-1.5 [@media(max-height:700px)]:leading-[18px]"
              >
                {card.trigger.line}
              </p>
            </li>
            <li
              data-testid="response"
              className="flex max-w-[85%] flex-col items-end self-end"
            >
              <span
                data-testid="speaker"
                className="text-xs leading-4 [@media(max-height:700px)]:leading-[14px]"
              >
                {card.response.speaker}
              </span>
              <p
                data-testid="line"
                className="line-clamp-3 border-2 border-neutral-500 px-3 py-2 text-sm leading-5 [@media(max-height:700px)]:py-1.5 [@media(max-height:700px)]:leading-[18px]"
              >
                {card.response.line}
              </p>
            </li>
          </ul>

          <p
            data-testid="breakdown"
            className="line-clamp-2 text-sm leading-5 [@media(max-height:700px)]:leading-[18px] @min-[720px]:col-start-1 @min-[720px]:row-start-3"
          >
            {card.breakdown}
          </p>
        </div>

        <div className="col-start-1 row-start-3 flex min-w-0 flex-col gap-2 [@media(max-height:700px)]:gap-1.5 @min-[720px]:col-start-2 @min-[720px]:row-span-3 @min-[720px]:row-start-1 @min-[720px]:self-center [&:has([data-clip-state=error])_[data-testid=mute]]:invisible">
          {/* Clip slot: 16:9, never under 200 px tall (F7); the clip fills it. */}
          <div className="aspect-video min-h-[200px] w-full *:h-full *:w-full">
            <Clip clip={card.clip} title={card.cue} active={clipActive} />
          </div>
          <div className="flex min-h-11 items-center gap-2">
            {card.source ? (
              <p
                data-testid="source"
                className="min-w-0 flex-1 truncate text-xs leading-4"
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
    </div>
  );
}
