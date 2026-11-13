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
 * Clip box (D-CLIP-1..9). Styled in P4-3: `rounded-clip` frame (20 px,
 * D-CLIP-13), hue wash behind the player, shimmer while loading, fade-in
 * when ready. The box keeps one footprint in every state (16:9, at least
 * 200 px tall). `data-base-ui-swipe-ignore` keeps a drag that starts on the
 * clip from dismissing the Saved drawer (D-SAVED-8); it is inert elsewhere.
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
  // The player is shown whenever it can be tapped: `paused` includes a
  // blocked autoplay (D-CLIP-12), where YouTube's own play button must be
  // visible and nothing of ours may cover it (D-CLIP-9).
  const live = state === "playing" || state === "paused";

  return (
    <div
      data-testid="clip"
      data-clip-state={state}
      data-no-flip=""
      data-base-ui-swipe-ignore=""
      className="relative isolate aspect-video min-h-[200px] w-full overflow-hidden rounded-clip border border-hairline bg-[oklch(0.14_0.02_var(--move-hue))]"
    >
      {/* Hue wash (idle, loading, error): sits behind the player and is never
          drawn over it. Uses only the move-hue glow tokens and the specular
          token at its frozen 0.12. No thumbnail is fetched (D-CLIP-3). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(110% 65% at 8% 0%, var(--glass-specular), transparent 62%), radial-gradient(90% 90% at 50% 55%, color-mix(in oklab, var(--hue-glow) 70%, transparent) 0%, transparent 78%), radial-gradient(70% 70% at 90% 100%, var(--hue-glow-soft), transparent 70%)",
        }}
      />
      {state === "loading" ? (
        <div
          aria-hidden="true"
          className="skeleton-shimmer animate-shimmer pointer-events-none absolute inset-0 -z-10 motion-reduce:animate-none"
        />
      ) : null}
      <div
        ref={mountRef}
        className={
          state === "error"
            ? "hidden"
            : "absolute inset-0 [&>iframe]:block [&>iframe]:h-full [&>iframe]:w-full " +
              (live ? "animate-ready-fade" : "opacity-0")
        }
      />
      {state === "error" ? (
        <div
          data-testid="clip-fallback"
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-4 text-center"
        >
          <VideoOff
            aria-hidden="true"
            className="mb-1 size-6 text-fg-tertiary"
          />
          <p className="text-body text-fg-secondary">Clip unavailable</p>
          <p className="text-body text-fg-tertiary">
            The exchange is all here.
          </p>
        </div>
      ) : null}
    </div>
  );
}
