"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionStyle,
} from "framer-motion";
import type { WitCard as WitCardData } from "@/content";
import { flipCrossfade, flipSpring, specularSweep } from "@/components/ui/motion";
import { moveHueStyle, publishMoveHue } from "@/lib/move-hue";
import { useIsFlipped, visit } from "@/lib/visit-store";
import { CardBack } from "./card-back";
import { CardFront } from "./card-front";

export type WitCardProps = {
  card: WitCardData;
  /** True for the feed's active card. */
  active: boolean;
};

/** Clicks on these never flip the card (D-FEED-6). */
const NO_FLIP = "button, a, input, textarea, select, label, iframe, [data-no-flip]";

/** Painted glass on both rotating faces (D-FLIP-2): no backdrop-filter. */
const FACE = "glass-paint glass-rim relative rounded-card lg:rounded-stage";

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
 * 150 ms opacity crossfade (D-FLIP-3). A faint specular band crosses the
 * card once per flip, and exists only while the card turns.
 *
 * `data-face` and `inert` follow the store at once; only the visuals
 * animate. The clip may start only once the back has settled (D-CLIP-6).
 * A non-active card is `inert` as a whole (D-FEED-8). The active card
 * publishes its move hue to the root (ambient glow), and holds the ambient
 * drift still while its back (and clip) shows: one moving thing at a time.
 */
export function WitCard({ card, active }: WitCardProps) {
  const flipped = useIsFlipped(card.id);
  const reduced = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLElement>(null);

  const pendingFocusRef = useRef<PendingFocus | null>(null);

  const r = useMotionValue(flipped ? 180 : 0);
  const perspective = useMotionValue(1000);
  const sweep = useMotionValue(0);

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
  const frontVisibility = useTransform(r, (v) => (faceVisible("front", v, false) ? "visible" : "hidden"));
  const backVisibility = useTransform(r, (v) => (faceVisible("back", v, false) ? "visible" : "hidden"));
  const frontFadeVisibility = useTransform(r, (v) => (faceVisible("front", v, true) ? "visible" : "hidden"));
  const backFadeVisibility = useTransform(r, (v) => (faceVisible("back", v, true) ? "visible" : "hidden"));
  const frontOpacity = useTransform(r, [0, 180], [1, 0]);
  const backOpacity = useTransform(r, [0, 180], [0, 1]);
  // The sweep band enters at the left edge and leaves at the right.
  const sweepPosition = useTransform(sweep, [0, 1], ["100% 0%", "0% 0%"]);
  const sweepOpacity = useTransform(sweep, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);

  const frontStyle: MotionStyle = reduced
    ? { transform: "none", opacity: frontOpacity, visibility: frontFadeVisibility }
    : { transform: frontTransform, opacity: 1, visibility: frontVisibility };
  const backStyle: MotionStyle = reduced
    ? { transform: "none", opacity: backOpacity, visibility: backFadeVisibility }
    : { transform: backTransform, opacity: 1, visibility: backVisibility };

  // Run the flip whenever the stored face changes (or motion preference does).
  useEffect(() => {
    let cancelled = false;
    const target = flipped ? 180 : 0;
    const width = rootRef.current?.offsetWidth ?? 0;
    if (width > 0) perspective.set(Math.max(800, width * PERSPECTIVE_RATIO));
    const flip = animate(r, target, reduced ? flipCrossfade : flipSpring);
    const glint =
      !reduced && r.get() !== target
        ? animate(sweep, [0, 1], specularSweep)
        : null;
    flip.then(() => {
      if (cancelled) return;
      r.set(target);
      setTurning(false);
      focusWhenShown(rootRef.current, pendingFocusRef, flipped ? "back" : "front");
      // A request for the other face (a button flip reversed before the
      // swap) is stale now; a later Space flip must not steal focus.
      pendingFocusRef.current = null;
    });
    return () => {
      cancelled = true;
      flip.stop();
      glint?.stop();
      sweep.set(0);
    };
  }, [flipped, reduced, r, sweep, perspective]);

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

  // The active card lights the ambient layer in its move hue (D-THEME-3).
  // Left in place when the card stops being active or the feed hides.
  useEffect(() => {
    if (active) publishMoveHue(card.move);
  }, [active, card.move]);

  // One moving thing at a time: the drift holds still while the clip shows.
  useEffect(() => {
    if (!(active && flipped)) return;
    const root = document.documentElement;
    root.dataset.ambient = "still";
    return () => {
      if (root.dataset.ambient === "still") delete root.dataset.ambient;
    };
  }, [active, flipped]);

  const onClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target;
    if (target instanceof Element && target.closest(NO_FLIP)) return;
    // A text selection in progress does not flip (FL-12).
    if (window.getSelection()?.toString()) return;
    visit.toggleFlip(card.id);
  };

  const sweepLayer =
    turning && !reduced ? (
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] bg-(image:--specular-sweep) bg-size-[300%_100%] bg-no-repeat"
        style={{ backgroundPosition: sweepPosition, opacity: sweepOpacity }}
      />
    ) : null;

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
      style={moveHueStyle(card.move)}
      className="hue-scope grid h-full w-full grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] rounded-card lg:rounded-stage"
    >
      <CardFront
        card={card}
        concealed={flipped}
        className={FACE}
        style={frontStyle}
        onReveal={() => flipAndFocus("back", '[data-testid="flip-back"]')}
      >
        {sweepLayer}
      </CardFront>
      <CardBack
        card={card}
        concealed={!flipped}
        clipActive={active && flipped && !turning}
        className={FACE}
        style={backStyle}
        onFlipBack={() => flipAndFocus("front", '[data-testid="reveal"]')}
      >
        {sweepLayer}
      </CardBack>
    </article>
  );
}
