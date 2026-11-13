"use client";

import { Heart } from "lucide-react";
import { toggleSaved, useIsSaved } from "@/lib/saves-store";
import { announce } from "./announcer";

export type HeartButtonProps = { cardId: string };

/** Toggles the save and announces the result (also used by the S key). */
export function toggleSaveAndAnnounce(cardId: string): boolean {
  const saved = toggleSaved(cardId);
  announce(saved ? "Saved" : "Removed from saved");
  return saved;
}

/** Heart (D-SAVE-5): fixed name "Save", `aria-pressed`, 44 px target. */
export function HeartButton({ cardId }: HeartButtonProps) {
  const saved = useIsSaved(cardId);
  return (
    <button
      type="button"
      data-testid="heart"
      aria-label="Save"
      aria-pressed={saved}
      onClick={() => toggleSaveAndAnnounce(cardId)}
      className="inline-flex size-11 shrink-0 items-center justify-center border border-neutral-700"
    >
      <Heart
        aria-hidden="true"
        className="size-5"
        fill={saved ? "currentColor" : "none"}
      />
    </button>
  );
}
