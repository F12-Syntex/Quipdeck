"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  animate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionStyle,
} from "framer-motion";
import type { WitCard as WitCardData } from "@/content";
import { flipCrossfade, flipSpring } from "@/components/ui/motion";
import { moveColorStyle } from "@/lib/move-color";
import { useIsFlipped, visit } from "@/lib/visit-store";
import { CardBack } from "./card-back";
import { CardFront } from "./card-front";

export type WitCardProps = {
  card: WitCardData;
  /** True for the feed's active card. */
  active: boolean;
};

/** Clicks on these never flip the card (D-FEED-6). */
const NO_FLIP =
  "button, a, input, textarea, select, label, iframe, [data-no-flip]";

/**
 * Flat theme surfaces (D-THEME-8): the front is a solid move-colour poster,
 * the back a card-coloured panel. No backdrop-filter on a rotating face
 * (D-FLIP-2). Both clip their content to the 41.6 px corners.
 */
const FRONT_FACE =
  "relative overflow-hidden rounded-4xl bg-(--move) text-(--move-foreground)";
const BACK_FACE =
  "relative overflow-hidden rounded-4xl bg-card text-card-foreground ring-1 ring-border ring-inset";

/** Perspective distance as a multiple of the card width (same depth on phone and desktop). */
const PERSPECTIVE_RATIO = 2.2;

type Face = "front" | "back";

/** Which face can be seen at rotation `r` (0 = front, 180 = back). */
function faceVisible(face: Face, r: number, reduced: boolean): boolean {
  if (reduced) return face === "front" ? r < 180 : r > 0;
  return face === "front" ? r < 90 : r >= 90;
}

type PendingFocus = { face: Face; selector: string };

/**
 * Focus the button a face button asked for, once its face can be seen
 * (`visibleFace`). The new face is hidden until the swap, so focusing it
 * at once would fail silently.
 */
function focusWhenShown(
  root: HTMLElement | null,
  pendingRef: { current: PendingFocus | null },
  visibleFace: Face,
) {
  const pending = pendingRef.current;
  if (!pending || pending.face !== visibleFace) return;
  pendingRef.current = null;
  // Next frame: the face's visibility has been written by then.
  requestAnimationFrame(() => {
    root?.querySelector<HTMLElement>(pending.selector)?.focus();
  });
}

const rotation = (deg: number, perspective: number) =>
  `perspective(${Math.round(perspective)}px) rotateY(${deg.toFixed(2)}deg)`;

/**
 * One feed card. Owns the flip (D-FLIP-1): one motion value `r` runs 0 to
 * 180 on `flipSpring`; the front turns `rotateY(r)` while r < 90, the back
 * `rotateY(r - 180)` from 90, and each face is `visibility: hidden` outside
 * its half. Nothing is transformed at rest (the transform is literally
 * `none`), and no ancestor carries a 3D context, so the iframe, text and
 * hit-testing are ordinary at rest. Under reduced motion the rotation is a
 * 150 ms opacity crossfade (D-FLIP-3).
 *
 * `data-face` and `inert` follow the store at once; only the visuals
 * animate. The clip may start only once the back has settled (D-CLIP-6).
 * A non-active card is `inert` as a whole (D-FEED-8). The card sets its
 * move colour (`--move`, D-THEME-8) for both faces.
 */
export function WitCard({ card, active }: WitCardProps) {
  const flipped = useIsFlipped(card.id);
  const reduced = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLElement>(null);

  const pendingFocusRef = useRef<PendingFocus | null>(null);

  const r = useMotionValue(flipped ? 180 : 0);
  const perspective = useMotionValue(1000);

  // True from a flip request until its animation settles. Set while
  // rendering (previous-value pattern), cleared by the animation callback.
  const [turning, setTurning] = useState(false);
  const [prevFlipped, setPrevFlipped] = useState(flipped);
  if (flipped !== prevFlipped) {
    setPrevFlipped(flipped);
    setTurning(true);
  }

  // Face visuals, all derived from `r`.
  const frontTransform = useTransform([r, perspective], ([v, p]: number[]) =>
    v > 0 && v < 90 ? rotation(v, p) : "none",
  );
  const backTransform = useTransform([r, perspective], ([v, p]: number[]) =>
    v >= 90 && v < 180 ? rotation(v - 180, p) : "none",
  );
  const frontVisibility = useTransform(r, (v) =>
    faceVisible("front", v, false) ? "visible" : "hidden",
  );
  const backVisibility = useTransform(r, (v) =>
    faceVisible("back", v, false) ? "visible" : "hidden",
  );
  const frontFadeVisibility = useTransform(r, (v) =>
    faceVisible("front", v, true) ? "visible" : "hidden",
  );
  const backFadeVisibility = useTransform(r, (v) =>
    faceVisible("back", v, true) ? "visible" : "hidden",
  );
  const frontOpacity = useTransform(r, [0, 180], [1, 0]);
  const backOpacity = useTransform(r, [0, 180], [0, 1]);

  const frontStyle: MotionStyle = reduced
    ? {
        transform: "none",
        opacity: frontOpacity,
        visibility: frontFadeVisibility,
      }
    : { transform: frontTransform, opacity: 1, visibility: frontVisibility };
  const backStyle: MotionStyle = reduced
    ? {
        transform: "none",
        opacity: backOpacity,
        visibility: backFadeVisibility,
      }
    : { transform: backTransform, opacity: 1, visibility: backVisibility };

  // Run the flip whenever the stored face changes (or motion preference does).
  useEffect(() => {
    let cancelled = false;
    const target = flipped ? 180 : 0;
    const width = rootRef.current?.offsetWidth ?? 0;
    if (width > 0) perspective.set(Math.max(800, width * PERSPECTIVE_RATIO));
    const flip = animate(r, target, reduced ? flipCrossfade : flipSpring);
    flip.then(() => {
      if (cancelled) return;
      r.set(target);
      setTurning(false);
      focusWhenShown(
        rootRef.current,
        pendingFocusRef,
        flipped ? "back" : "front",
      );
      // A request for the other face (a button flip reversed before the
      // swap) is stale now; a later Space flip must not steal focus.
      pendingFocusRef.current = null;
    });
    return () => {
      cancelled = true;
      flip.stop();
    };
  }, [flipped, reduced, r, perspective]);

  // Focus hand-off: focus the new face's button as soon as it shows.
  useMotionValueEvent(r, "change", (v) => {
    const pending = pendingFocusRef.current;
    if (pending && faceVisible(pending.face, v, reduced)) {
      focusWhenShown(rootRef.current, pendingFocusRef, pending.face);
    }
  });

  /** Flip from a face button, then focus the matching button on the new face. */
  const flipAndFocus = (face: Face, selector: string) => {
    pendingFocusRef.current = { face, selector };
    visit.toggleFlip(card.id);
  };

  const onClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target;
    if (target instanceof Element && target.closest(NO_FLIP)) return;
    // A text selection in progress does not flip (FL-12).
    if (window.getSelection()?.toString()) return;
    visit.toggleFlip(card.id);
  };

  return (
    <article
      ref={rootRef}
      role="group"
      aria-roledescription="card"
      aria-label={card.cue}
      tabIndex={-1}
      inert={!active}
      data-testid="card"
      data-card-id={card.id}
      data-face={flipped ? "back" : "front"}
      data-active={active ? "true" : "false"}
      onClick={onClick}
      style={moveColorStyle(card.move)}
      className="grid h-full w-full grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] rounded-4xl"
    >
      <CardFront
        card={card}
        concealed={flipped}
        className={FRONT_FACE}
        style={frontStyle}
        onReveal={() => flipAndFocus("back", '[data-testid="flip-back"]')}
      />
      <CardBack
        card={card}
        concealed={!flipped}
        clipActive={active && flipped && !turning}
        className={BACK_FACE}
        style={backStyle}
        onFlipBack={() => flipAndFocus("front", '[data-testid="reveal"]')}
      />
    </article>
  );
}
