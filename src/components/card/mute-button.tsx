"use client";

import { useMuted, visit } from "@/lib/visit-store";

/** P1-1 stub. P1-3 builds the real mute button (D-CLIP-7). */
export function MuteButton() {
  const muted = useMuted();
  return (
    <button
      type="button"
      data-testid="mute"
      data-muted={muted ? "true" : "false"}
      onClick={() => visit.setMuted(!muted)}
      className="min-h-11 min-w-11 border border-neutral-700"
    >
      {muted ? "Unmute" : "Mute"}
    </button>
  );
}
