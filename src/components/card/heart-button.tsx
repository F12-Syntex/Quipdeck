"use client";

import { toggleSaved, useIsSaved } from "@/lib/saves-store";

export type HeartButtonProps = { cardId: string };

/** P1-1 stub. P1-3 builds the real heart (D-SAVE-5). */
export function HeartButton({ cardId }: HeartButtonProps) {
  const saved = useIsSaved(cardId);
  return (
    <button
      type="button"
      data-testid="heart"
      aria-pressed={saved}
      onClick={() => toggleSaved(cardId)}
      className="min-h-11 min-w-11 border border-neutral-700"
    >
      Save
    </button>
  );
}
