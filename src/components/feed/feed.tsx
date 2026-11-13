"use client";

import { cards, type WitCard as WitCardData } from "@/content";
import { WitCard } from "@/components/card/wit-card";
import { useActiveId, useVisitOrder } from "@/lib/visit-store";

const byId = new Map<string, WitCardData>(cards.map((c) => [c.id, c]));

/** P1-1 stub. P1-3 builds the real feed. */
export function Feed() {
  const order = useVisitOrder();
  const activeId = useActiveId();

  if (order === null) {
    return (
      <div data-testid="feed" className="h-full w-full">
        <div
          data-testid="feed-skeleton"
          className="h-full w-full border border-neutral-700"
        />
      </div>
    );
  }

  return (
    <div data-testid="feed" data-ready="true" className="h-full w-full">
      {order.map((id) => {
        const card = byId.get(id);
        return card ? (
          <WitCard key={id} card={card} active={id === activeId} />
        ) : null;
      })}
    </div>
  );
}
