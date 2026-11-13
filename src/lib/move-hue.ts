import type { CSSProperties } from "react";

/**
 * Move hue (D-THEME-3). Each move id maps to one hue angle on a curated
 * OKLCH ring. Lightness and chroma are fixed by the tokens in `globals.css`;
 * this module only picks the hue angle.
 *
 * Ten slots for the ten moves in `src/content/moves.ts`, each pinned to its
 * own slot (Gate 2 carry-over), so no two moves share a hue. Spacing is
 * uneven on purpose: 30 degrees reads as distinct in the orange, green and
 * blue-violet ranges, but the red-pink and teal-cyan ranges need 35 to 40
 * (Gate 2 called 15/345 and 190/215 near-twins). The ring skips the
 * yellow-green band (roughly 85 to 135 degrees), which turns muddy at the
 * low lightness the ambient layer uses.
 *
 * A move that is not pinned (a new move from the content pipeline) still
 * gets a ring hue from a stable hash, with no UI change; it may share a hue
 * until the design system owner pins it.
 */
export const MOVE_HUE_RING: readonly number[] = Object.freeze([
  20, // ember
  50, // copper
  80, // amber
  140, // sage
  170, // jade
  205, // lagoon
  245, // cobalt
  275, // iris
  305, // violet
  340, // rose
]);

/** One slot per move in `moves.ts`. Every value is on `MOVE_HUE_RING`, used once. */
export const MOVE_HUES: Readonly<Record<string, number>> = Object.freeze({
  "naming-the-obvious": 20,
  misdirection: 50,
  "self-deprecation": 80,
  "playing-along": 140,
  escalation: 170,
  understatement: 205,
  "mock-seriousness": 245,
  "literal-interpretation": 275,
  callback: 305,
  reversal: 340,
});

/** The hue shown before any card is active (iris). Matches `@property --move-hue`. */
export const DEFAULT_MOVE_HUE = 275;

/** The one root custom property screens publish (registered in globals.css). */
export const MOVE_HUE_VAR = "--move-hue";

/** FNV-1a, 32 bit. Pure and stable across runtimes. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Hue angle (degrees, one of `MOVE_HUE_RING`) for any move id, known or not. */
export function moveHue(moveId: string): number {
  // Own keys only: "constructor" or "__proto__" must not reach the prototype.
  if (Object.hasOwn(MOVE_HUES, moveId)) return MOVE_HUES[moveId];
  return MOVE_HUE_RING[fnv1a(moveId) % MOVE_HUE_RING.length];
}

/**
 * Inline style that scopes the hue to one element and its children, for
 * per-item tints (move tag, response bubble) where several moves are on
 * screen at once. Example: `<span style={moveHueStyle(card.move)} />`.
 */
export function moveHueStyle(moveId: string): CSSProperties {
  return { [MOVE_HUE_VAR]: String(moveHue(moveId)) } as CSSProperties;
}

type StyleTarget = { style: Pick<CSSStyleDeclaration, "setProperty" | "removeProperty"> };

/**
 * Publish the active card's hue on the root, which drives the ambient glow
 * and the card shadow (the crossfade is CSS). `null` returns to the default.
 * Call from an effect on the client only; the target is injectable for tests.
 */
export function publishMoveHue(
  moveId: string | null,
  target: StyleTarget = document.documentElement,
): void {
  if (moveId === null) {
    target.style.removeProperty(MOVE_HUE_VAR);
    return;
  }
  target.style.setProperty(MOVE_HUE_VAR, String(moveHue(moveId)));
}
