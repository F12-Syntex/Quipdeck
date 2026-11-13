"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { VideoOff } from "lucide-react";
import type { WitCard as WitCardData } from "@/content";
import {
  createClipController,
  type ClipController,
  type ClipControllerState,
} from "@/lib/clip-controller";
import { useMuted, visit } from "@/lib/visit-store";
import { loadYouTubeApi } from "@/lib/youtube";

export type ClipProps = {
  clip: WitCardData["clip"];
  /** Accessible title for the player frame (the card cue). */
  title: string;
  /** A player may exist only while this is true (D-CLIP-6). */
  active: boolean;
};

export type ClipState = "idle" | ClipControllerState;

/**
 * Wait this long after `active` turns true before creating a player, so a
 * fast scroll through flipped cards creates none (D-CLIP-6).
 */
export const CLIP_SETTLE_MS = 150;

/**
 * Clip box (D-CLIP-1..9). Grey-box styling only (P1).
 * The box keeps one footprint in every state (16:9, at least 200 px tall).
 * The player lives in `mountRef`, which React never renders children into;
 * the skeleton sits behind it and the fallback replaces it on error.
 */
export function Clip({ clip, title, active }: ClipProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<ClipController | null>(null);
  const [phase, setPhase] = useState<ClipState>("idle");
  const muted = useMuted();

  const { youtubeId, start, end } = clip;

  // Create the player while active; tear it down in cleanup (scroll away,
  // flip back, Activity hiding the route, overlay closed, unmount).
  useLayoutEffect(() => {
    if (!active) return;
    let cancelled = false;
    let controller: ClipController | null = null;

    const settle = setTimeout(() => {
      if (cancelled) return;
      setPhase("loading");
      loadYouTubeApi().then(
        (YT) => {
          const mount = mountRef.current;
          if (cancelled || !mount) return;
          controller = createClipController({
            YT,
            mount,
            clip: { youtubeId, start, end },
            getMuted: visit.getMuted,
            onState: (next) => {
              if (!cancelled) setPhase(next);
            },
            onMuted: (value) => visit.setMuted(value),
            title: `Clip: ${title}`,
          });
          controllerRef.current = controller;
        },
        () => {
          if (!cancelled) setPhase("error");
        },
      );
    }, CLIP_SETTLE_MS);

    return () => {
      cancelled = true;
      clearTimeout(settle);
      if (controller) {
        controller.destroy();
        if (controllerRef.current === controller) controllerRef.current = null;
      }
      setPhase("idle");
    };
  }, [active, youtubeId, start, end, title]);

  // Forward the visit's mute preference to the live player (D-CLIP-7).
  useEffect(() => {
    controllerRef.current?.setMuted(muted);
  }, [muted]);

  const state: ClipState = active ? phase : "idle";

  return (
    <div
      data-testid="clip"
      data-clip-state={state}
      data-no-flip=""
      className="relative isolate aspect-video min-h-[200px] w-full overflow-hidden border border-neutral-700"
    >
      {state === "loading" ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-neutral-900"
        />
      ) : null}
      <div
        ref={mountRef}
        className={
          state === "error"
            ? "hidden"
            : "absolute inset-0 [&>iframe]:block [&>iframe]:h-full [&>iframe]:w-full"
        }
      />
      {state === "error" ? (
        <div
          data-testid="clip-fallback"
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-4 text-center"
        >
          <VideoOff aria-hidden="true" className="size-6" />
          <p>Clip unavailable</p>
          <p className="text-sm">The exchange is all here.</p>
        </div>
      ) : null}
    </div>
  );
}
