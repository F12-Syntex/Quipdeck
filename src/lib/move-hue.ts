import type { CSSProperties } from "react";

/**
 * Move hue (D-THEME-3). Each move id maps to one slot on a curated OKLCH hue
 * ring. Lightness and chroma are fixed by the tokens in `globals.css`; this
 * module only picks the hue angle, so a new move from the content pipeline
 * gets a hue with no UI change.
 *
 * The ring skips the muddy yellow-green band (roughly 75 to 135 degrees),
 * which reads as dirty at the low lightness the ambient layer uses.
 * Collisions are expected and accepted: the hue is ambience, never identity
 * (the move label carries identity).
 */
export const MOVE_HUE_RING: readonly number[] = Object.freeze([
  15, // ember
  40, // copper
  65, // amber
  140, // sage
  165, // jade
  190, // lagoon
  215, // sky
  240, // cobalt
  265, // iris
  290, // violet
  315, // orchid
  345, // rose
]);

/** The hue shown before any card is active (iris). */
export const DEFAULT_MOVE_HUE = 265;

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
