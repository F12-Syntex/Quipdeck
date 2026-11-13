"use client";

import { useId } from "react";
import type { MoveGroup, WitCard } from "@/content";

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
    <div className="mt-4 flex flex-col gap-6">
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
    >
      <h2 id={headingId} className="mb-2 text-sm">
        {group.move.label}
      </h2>
      <ul className="border border-neutral-700">
        {group.cards.map((card) => (
          <li key={card.id} className="border-b border-neutral-800 last:border-b-0">
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
      className="flex min-h-16 w-full flex-col items-start gap-1 px-4 py-3 text-left aria-[current=true]:outline-2 aria-[current=true]:-outline-offset-2 aria-[current=true]:outline-neutral-500"
    >
      <span className="w-full truncate">{card.cue}</span>
      <span className="line-clamp-2 text-sm">{card.response.line}</span>
    </button>
  );
}
