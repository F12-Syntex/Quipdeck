"use client";

import { useId } from "react";
import type { MoveGroup, WitCard } from "@/content";
import { Badge } from "@/components/ui/badge";
import { moveHueStyle } from "@/lib/move-hue";

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
    <div className="mt-4 flex flex-col gap-7">
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
 * One rounded group (`rounded-group`) on unblurred glass, hairline
 * dividers. The label is the move tag in the move's own hue, the same pill
 * as the card back, so a group reads as that move at a glance; the rows
 * stay neutral, except the selected row, tinted with the move hue (D-SAVED-4). The group does not clip: the end rows carry
 * the radius themselves, so an inset focus ring keeps its corners.
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
      style={moveHueStyle(group.move.id)}
      className="hue-scope"
    >
      <h2 id={headingId} className="mb-2.5 flex">
        <Badge variant="move">{group.move.label}</Badge>
      </h2>
      <ul className="rounded-group glass-control">
        {group.cards.map((card) => (
          <li key={card.id} className="border-b border-hairline last:border-b-0">
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
      className="flex min-h-16 w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors duration-(--dur-fast) ease-soft -outline-offset-2 hover:bg-control-hover active:bg-control-pressed aria-[current=true]:hue-bubble [li:first-child>&]:rounded-t-group [li:last-child>&]:rounded-b-group"
    >
      <span className="w-full truncate text-body font-medium text-fg-primary">
        {card.cue}
      </span>
      <span className="line-clamp-2 text-body text-fg-secondary">
        {card.response.line}
      </span>
    </button>
  );
}
