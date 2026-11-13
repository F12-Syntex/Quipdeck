import { getMove, type WitCard as WitCardData } from "@/content";
import { Clip } from "./clip";
import { HeartButton } from "./heart-button";
import { MuteButton } from "./mute-button";

export type CardBackProps = {
  card: WitCardData;
  /** Passed to `Clip` as `active`. */
  clipActive: boolean;
  /** Feed only: renders the "Back to cue" button. Sheet and pane omit it. */
  onFlipBack?: () => void;
};

/** P1-1 stub. P1-3 builds the real back. No flip logic lives here. */
export function CardBack({ card, clipActive, onFlipBack }: CardBackProps) {
  return (
    <div data-testid="card-back">
      {onFlipBack ? (
        <button type="button" data-testid="flip-back" onClick={onFlipBack}>
          Back to cue
        </button>
      ) : null}
      <p data-testid="move">{getMove(card.move)?.label ?? card.move}</p>
      <div data-testid="exchange">
        <p data-testid="trigger">
          <span data-testid="speaker">{card.trigger.speaker}</span>{" "}
          <span data-testid="line">{card.trigger.line}</span>
        </p>
        <p data-testid="response">
          <span data-testid="speaker">{card.response.speaker}</span>{" "}
          <span data-testid="line">{card.response.line}</span>
        </p>
      </div>
      <p data-testid="breakdown">{card.breakdown}</p>
      <Clip clip={card.clip} title={card.cue} active={clipActive} />
      {card.source ? <p data-testid="source">{card.source}</p> : null}
      <div>
        <MuteButton />
        <HeartButton cardId={card.id} />
      </div>
    </div>
  );
}
