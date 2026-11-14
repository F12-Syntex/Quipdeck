import type { CSSProperties } from "react";
import { movesSortedAZ, type Move } from "../content";

/**
 * Move colour (D-THEME-8, REDESIGN_V2 5.0). A move is painted with one of
 * the theme's five chart colours: `n = (index in movesSortedAZ) % 5 + 1`,
 * so neighbouring groups in the A to Z Saved list never share a colour.
 * Data-driven: nothing is hardcoded per move. A move that is not in the
 * list (a new move from the content pipeline) falls back to chart-1.
 * Colour is never the only signal: the move label is always shown with it.
 */
export const MOVE_COLOR_COUNT = 5;

/** Chart slot (1 to 5) for a move id. */
export function moveColorIndex(
  moveId: string,
  sorted: readonly Pick<Move, "id">[] = movesSortedAZ,
): number {
  const i = sorted.findIndex((m) => m.id === moveId);
  return i < 0 ? 1 : (i % MOVE_COLOR_COUNT) + 1;
}

/**
 * Inline style that sets the move colour on one element and its children:
 * `--move` (the fill, `bg-(--move)`) and `--move-foreground` (text on it,
 * `text-(--move-foreground)`; black in dark mode).
 */
export function moveColorStyle(
  moveId: string,
  sorted: readonly Pick<Move, "id">[] = movesSortedAZ,
): CSSProperties {
  const n = moveColorIndex(moveId, sorted);
  return {
    "--move": `var(--chart-${n})`,
    "--move-foreground": `var(--chart-${n}-foreground)`,
  } as CSSProperties;
}
