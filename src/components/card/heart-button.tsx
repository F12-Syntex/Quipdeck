"use client";

import { HeartToggle } from "@/components/ui/heart-toggle";
import { toggleSaved, useIsSaved } from "@/lib/saves-store";
import { announce } from "./announcer";

export type HeartButtonProps = { cardId: string };

/** Toggles the save and announces the result (also used by the S key). */
export function toggleSaveAndAnnounce(cardId: string): boolean {
  const saved = toggleSaved(cardId);
  announce(saved ? "Saved" : "Removed from saved");
  return saved;
}

/**
 * Heart (D-SAVE-5): fixed name "Save", `aria-pressed`, 48 px circle.
 * Controlled by the saves store, so a save by the S key pops it too.
 */
export function HeartButton({ cardId }: HeartButtonProps) {
  const saved = useIsSaved(cardId);
  return (
    <HeartToggle
      data-testid="heart"
      label="Save"
      pressed={saved}
      onPressedChange={() => toggleSaveAndAnnounce(cardId)}
    />
  );
}
