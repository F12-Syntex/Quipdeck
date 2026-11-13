/**
 * Motion tokens for framer-motion. CSS twins live in globals.css
 * (`--dur-*`, `--ease-*`). Reduced-motion values are read with
 * `useReducedMotion()` (D-FLIP-3), never by user agent.
 */

/** Card flip (D-FLIP-1): 0 -> 180 deg, settles in about 600 ms, no visible overshoot. */
export const flipSpring = {
  type: "spring",
  stiffness: 120,
  damping: 20,
  mass: 1,
  restDelta: 0.5,
  restSpeed: 1,
} as const;

/** Reduced-motion replacement for the flip: a 150 ms opacity crossfade. */
export const flipCrossfade = { duration: 0.15, ease: "linear" } as const;

/** Specular sweep across the card during the flip, once. Removed under reduced motion. */
export const specularSweep = { duration: 0.6, ease: [0.65, 0, 0.35, 1] } as const;

/**
 * Heart fill: 1 -> 1.18 -> 1 over 300 ms, on save only. Under reduced motion
 * the heart just changes state. A tween, not a spring: framer-motion springs
 * take two keyframes only (P3-2 replaced the P2 `heartSpring`).
 */
export const heartScale = [1, 1.18, 1] as const;
export const heartPop: { duration: number; times: number[]; ease: [number, number, number, number] } = {
  duration: 0.3,
  times: [0, 0.4, 1],
  ease: [0.22, 1, 0.36, 1],
};

/**
 * Nav active capsule sliding between items (from 21st.dev 8343): critically
 * damped, settles in about 300 ms, no overshoot. Instant under reduced motion.
 */
export const capsuleSpring = {
  type: "spring",
  stiffness: 420,
  damping: 42,
  mass: 1,
} as const;

/** Generic UI transitions (sheet rise, fades). */
export const easeSoft = [0.22, 1, 0.36, 1] as const;
export const easeGlide = [0.65, 0, 0.35, 1] as const;
export const duration = {
  fast: 0.15,
  base: 0.24,
  sheet: 0.28,
  crossfade: 0.15,
  ready: 0.32,
  /** Move-hue crossfade of the ambient glow (CSS-driven; for reference). */
  hue: 1.4,
  /** Hue crossfade under reduced motion (colour only, no movement). */
  hueReduced: 0.4,
} as const;

/** Scroll behaviour for keyboard paging (D-FLIP-3: instant under reduced motion). */
export function scrollBehavior(reduced: boolean | null): ScrollBehavior {
  return reduced ? "auto" : "smooth";
}
