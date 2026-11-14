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
import { Skeleton } from "@/components/ui/skeleton";

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
 * Clip box (D-CLIP-1..9, REDESIGN_V2 5.3 and 5.4). A black frame that fills
 * its parent; the parent sets the size, the radius and, in the feed, the
 * full-bleed placement. While loading, a stock Skeleton fills the frame
 * (still under reduced motion); once the player can be tapped it fades in
 * (`ready-fade`, 200 ms opacity only). On error the frame turns into a
 * notice (`bg-muted`, the parent collapses the 16:9 slot on phone).
 * Nothing of ours is drawn over a live player (D-CLIP-9).
 * `data-base-ui-swipe-ignore` keeps a drag that starts on the clip from
 * dismissing the Saved drawer (D-SAVED-8); it is inert elsewhere.
 * The player lives in `mountRef`, which React never renders children into.
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
      className="relative isolate size-full overflow-hidden rounded-[inherit] bg-black data-[clip-state=error]:bg-muted"
    >
      {state === "loading" ? (
        <Skeleton
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-none"
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
          className="absolute inset-0 flex items-center gap-3 px-4 @min-[720px]:justify-center"
        >
          <VideoOff
            aria-hidden="true"
            className="size-5 shrink-0 text-muted-foreground"
          />
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground">Clip unavailable</p>
            <p className="text-sm text-muted-foreground">
              The exchange is all here.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
