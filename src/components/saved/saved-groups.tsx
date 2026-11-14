"use client";

import { useId } from "react";
import { ChevronRight } from "lucide-react";
import type { MoveGroup, WitCard } from "@/content";
import { Badge, MOVE_BADGE } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { moveColorStyle } from "@/lib/move-color";

export type SavedGroupsProps = {
  groups: MoveGroup[];
  /** Desktop only: the card shown in the pane (`aria-current`). */
  selectedId: string | null;
  onOpen: (cardId: string) => void;
  registerRow: (cardId: string, el: HTMLButtonElement | null) => void;
};

/** Groups A to Z by move label (D-SAVED-1, D-SAVED-3). */
export function SavedGroups({
  groups,
  selectedId,
  onOpen,
  registerRow,
}: SavedGroupsProps) {
  return (
    <div className="flex flex-col">
      {groups.map((group) => (
        <SavedGroup
          key={group.move.id}
          group={group}
          selectedId={selectedId}
          onOpen={onOpen}
          registerRow={registerRow}
        />
      ))}
    </div>
  );
}

/*
 * One group (REDESIGN_V2 5.5): the move tag in the move's own colour as the
 * heading (no count: SL-3), then a card-coloured list with stock separators.
 * Each group sets --move, so the selected row's edge bar matches its tag.
 */
function SavedGroup({
  group,
  selectedId,
  onOpen,
  registerRow,
}: { group: MoveGroup } & Omit<SavedGroupsProps, "groups">) {
  const headingId = useId();
  return (
    <section
      data-testid="move-group"
      data-move-id={group.move.id}
      aria-labelledby={headingId}
      style={moveColorStyle(group.move.id)}
      className="mt-6"
    >
      <h2 id={headingId} className="mb-2.5 flex">
        <Badge className={MOVE_BADGE}>{group.move.label}</Badge>
      </h2>
      <ul className="overflow-hidden rounded-3xl border border-border bg-card">
        {group.cards.map((card, i) => (
          <li key={card.id}>
            {i > 0 ? <Separator /> : null}
            <SavedRow
              card={card}
              selected={card.id === selectedId}
              onOpen={onOpen}
              registerRow={registerRow}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The whole row is one button: cue and response line, nothing else (D-SAVED-4, D-SAVE-8). */
function SavedRow({
  card,
  selected,
  onOpen,
  registerRow,
}: {
  card: WitCard;
  selected: boolean;
  onOpen: (cardId: string) => void;
  registerRow: (cardId: string, el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      type="button"
      data-testid="saved-row"
      data-card-id={card.id}
      aria-current={selected ? "true" : undefined}
      ref={(el) => {
        registerRow(card.id, el);
        return () => registerRow(card.id, null);
      }}
      onClick={() => onOpen(card.id)}
      className="relative flex min-h-[72px] w-full items-center gap-3 px-4 py-3.5 text-left transition-colors outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset aria-[current=true]:bg-muted aria-[current=true]:before:absolute aria-[current=true]:before:inset-y-0 aria-[current=true]:before:left-0 aria-[current=true]:before:w-1 aria-[current=true]:before:bg-(--move)"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="w-full truncate text-lg leading-6 font-semibold text-foreground">
          {card.cue}
        </span>
        <span className="line-clamp-2 text-base leading-6 text-muted-foreground">
          {card.response.line}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-5 shrink-0 text-muted-foreground"
      />
    </button>
  );
}
