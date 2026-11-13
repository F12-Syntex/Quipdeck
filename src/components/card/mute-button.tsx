"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useMuted, visit } from "@/lib/visit-store";
import { announce } from "./announcer";

/** Toggles the visit's mute and announces it (also used by the M key). */
export function toggleMuteAndAnnounce(): void {
  const nextMuted = !visit.getMuted();
  visit.setMuted(nextMuted);
  announce(nextMuted ? "Sound off" : "Sound on");
}

/**
 * Mute (D-CLIP-7). The store is the single source of truth; the clip reacts
 * to it. Name says what pressing does: "Unmute" while muted, "Mute" otherwise.
 */
export function MuteButton() {
  const muted = useMuted();
  return (
    <button
      type="button"
      data-testid="mute"
      data-muted={muted ? "true" : "false"}
      aria-label={muted ? "Unmute" : "Mute"}
      onClick={toggleMuteAndAnnounce}
      className="inline-flex size-11 shrink-0 items-center justify-center border border-neutral-700"
    >
      {muted ? (
        <VolumeX aria-hidden="true" className="size-5" />
      ) : (
        <Volume2 aria-hidden="true" className="size-5" />
      )}
    </button>
  );
}
