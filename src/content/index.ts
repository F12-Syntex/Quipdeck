import { cards } from "./cards";
import { moves } from "./moves";
import type { Move, WitCard } from "./types";

export { cards, moves };
export type { Move, WitCard };

const moveById = new Map(moves.map((m) => [m.id, m]));

export function getMove(id: string): Move | undefined {
  return moveById.get(id);
}

const moveLabel = (id: string) => getMove(id)?.label ?? id;

export const movesSortedAZ: Move[] = [...moves].sort((a, b) =>
  a.label.localeCompare(b.label),
);

export function searchCards(query: string, list: WitCard[] = cards): WitCard[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((c) =>
    [
      c.cue,
      moveLabel(c.move),
      c.trigger.line,
      c.trigger.speaker,
      c.response.line,
      c.response.speaker,
      c.breakdown,
    ].some((s) => s.toLowerCase().includes(q)),
  );
}

export type MoveGroup = { move: Move; cards: WitCard[] };

export function groupByMove(list: WitCard[]): MoveGroup[] {
  const byMove = new Map<string, WitCard[]>();
  for (const c of list) {
    const arr = byMove.get(c.move);
    if (arr) arr.push(c);
    else byMove.set(c.move, [c]);
  }
  return [...byMove.entries()]
    .map(([id, cs]) => ({ move: getMove(id) ?? { id, label: id }, cards: cs }))
    .sort((a, b) => a.move.label.localeCompare(b.move.label));
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic seeded Fisher-Yates shuffle; returns a new array. */
export function shuffle<T>(list: readonly T[], seed: number): T[] {
  const out = [...list];
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
