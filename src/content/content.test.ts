import { describe, expect, it } from "vitest";
import {
  cards,
  getMove,
  groupByMove,
  moves,
  movesSortedAZ,
  searchCards,
  shuffle,
} from "./index";

describe("content", () => {
  it("has unique card ids and move ids", () => {
    expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length);
    expect(new Set(moves.map((m) => m.id)).size).toBe(moves.length);
  });

  it("every card move exists", () => {
    for (const c of cards) expect(getMove(c.move)).toBeDefined();
  });

  it("covers >=4 moves and some move has >=2 cards", () => {
    const counts = new Map<string, number>();
    for (const c of cards) counts.set(c.move, (counts.get(c.move) ?? 0) + 1);
    expect(counts.size).toBeGreaterThanOrEqual(4);
    expect(Math.max(...counts.values())).toBeGreaterThanOrEqual(2);
  });

  it("has exactly one broken clip and valid windows", () => {
    expect(cards.filter((c) => c.clip.youtubeId === "BROKEN_CLIP")).toHaveLength(1);
    for (const c of cards) expect(c.clip.end).toBeGreaterThan(c.clip.start);
  });

  it("movesSortedAZ is sorted", () => {
    const labels = movesSortedAZ.map((m) => m.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
  });
});

describe("searchCards", () => {
  const c = cards[0];
  const fields: Record<string, string> = {
    cue: c.cue,
    move: getMove(c.move)!.label,
    "trigger line": c.trigger.line,
    "trigger speaker": c.trigger.speaker,
    "response line": c.response.line,
    "response speaker": c.response.speaker,
    breakdown: c.breakdown,
  };
  for (const [name, value] of Object.entries(fields)) {
    it(`matches on ${name} case-insensitively`, () => {
      expect(searchCards(value.toUpperCase())).toContain(c);
    });
  }
  it("empty query returns all; nonsense returns none", () => {
    expect(searchCards("")).toHaveLength(cards.length);
    expect(searchCards("zzzqqqxxx")).toHaveLength(0);
  });
});

describe("groupByMove", () => {
  it("sorts groups A-Z and only includes moves with cards", () => {
    const groups = groupByMove(cards);
    const labels = groups.map((g) => g.move.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
    for (const g of groups) expect(g.cards.length).toBeGreaterThan(0);
    expect(groups.reduce((n, g) => n + g.cards.length, 0)).toBe(cards.length);
    expect(groupByMove([cards[0]])).toHaveLength(1);
  });
});

describe("shuffle", () => {
  it("is deterministic per seed and a permutation", () => {
    const a = shuffle(cards, 42);
    expect(shuffle(cards, 42)).toEqual(a);
    expect(a.map((x) => x.id).sort()).toEqual(cards.map((x) => x.id).sort());
    expect(shuffle(cards, 7)).not.toEqual(a);
  });
  it("does not mutate input", () => {
    const before = [...cards];
    shuffle(cards, 1);
    expect(cards).toEqual(before);
  });
});
