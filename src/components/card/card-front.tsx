import { getMove, type WitCard as WitCardData } from "@/content";
import { cn } from "@/lib/utils";

export type CardFrontProps = {
  card: WitCardData;
  /** Called by the "reveal" hint button. */
  onReveal: () => void;
  /** Set by `WitCard` while the back is showing: hidden and `inert`. */
  concealed?: boolean;
};

/**
 * Front (LAYOUT_PLAN section 4): cue (largest text), move label under it,
 * reveal hint at the bottom. No heart, mute or clip. The hint's wording
 * follows the pointer through CSS only, so server and client agree.
 */
export function CardFront({ card, onReveal, concealed = false }: CardFrontProps) {
  return (
    <div
      data-testid="card-front"
      inert={concealed}
      className={cn(
        "col-start-1 row-start-1 flex h-full min-h-0 w-full min-w-0 flex-col px-6 pt-6 pb-3 lg:px-14 lg:pt-14 lg:pb-10",
        concealed && "invisible",
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col justify-center pb-[12%]">
        <h2
          data-testid="cue"
          className="line-clamp-4 text-3xl leading-tight text-balance lg:max-w-[18ch] lg:text-5xl"
        >
          {card.cue}
        </h2>
        <p data-testid="move" className="mt-3 text-sm lg:mt-5 lg:text-base">
          {getMove(card.move)?.label ?? card.move}
        </p>
      </div>
      <button
        type="button"
        data-testid="reveal"
        onClick={onReveal}
        className="min-h-11 self-center px-4 text-sm lg:self-start lg:px-0"
      >
        <span className="pointer-fine:hidden">Tap to reveal</span>
        <span className="hidden pointer-fine:inline">Click to reveal</span>
      </button>
    </div>
  );
}
