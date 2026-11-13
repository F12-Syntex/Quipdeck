import { getMove, type WitCard as WitCardData } from "@/content";

export type CardFrontProps = {
  card: WitCardData;
  /** Called by the "reveal" hint button. */
  onReveal: () => void;
};

/** P1-1 stub. P1-3 builds the real front. */
export function CardFront({ card, onReveal }: CardFrontProps) {
  return (
    <div data-testid="card-front">
      <h2 data-testid="cue">{card.cue}</h2>
      <p data-testid="move">{getMove(card.move)?.label ?? card.move}</p>
      <button type="button" data-testid="reveal" onClick={onReveal}>
        Tap to reveal
      </button>
    </div>
  );
}
