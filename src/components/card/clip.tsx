"use client";

import type { WitCard as WitCardData } from "@/content";

export type ClipProps = {
  clip: WitCardData["clip"];
  /** Accessible title for the player frame (the card cue). */
  title: string;
  /** A player may exist only while this is true (D-CLIP-6). */
  active: boolean;
};

/** P1-1 stub. P1-4 builds the clip engine view. */
export function Clip({ clip, title, active }: ClipProps) {
  return (
    <div
      data-testid="clip"
      data-clip-state="idle"
      data-no-flip=""
      data-youtube-id={clip.youtubeId}
      data-active={active ? "true" : "false"}
      data-title={title}
      className="aspect-video w-full border border-neutral-700"
    />
  );
}
