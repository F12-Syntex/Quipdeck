import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { moves } from "../content/moves";
import {
  DEFAULT_MOVE_HUE,
  MOVE_HUE_RING,
  MOVE_HUES,
  MOVE_HUE_VAR,
  moveHue,
  moveHueStyle,
  publishMoveHue,
} from "./move-hue";

describe("moveHue", () => {
  it("is deterministic", () => {
    for (const move of moves) {
      const first = moveHue(move.id);
      for (let i = 0; i < 5; i++) expect(moveHue(move.id)).toBe(first);
    }
  });

  it("returns a ring hue for every move in moves.ts", () => {
    expect(moves.length).toBeGreaterThan(0);
    for (const move of moves) {
      const hue = moveHue(move.id);
      expect(Number.isFinite(hue)).toBe(true);
      expect(MOVE_HUE_RING).toContain(hue);
    }
  });

  it("returns a ring hue for unknown, empty and prototype-named ids", () => {
    for (const id of ["not-a-move", "", "ünïcødé ✓", "x".repeat(500), "constructor", "__proto__", "toString"]) {
      expect(MOVE_HUE_RING).toContain(moveHue(id));
    }
  });

  it("pins exactly the moves in moves.ts", () => {
    expect(Object.keys(MOVE_HUES).sort()).toEqual(moves.map((m) => m.id).sort());
  });

  it("gives every move in moves.ts its own hue (one ring slot each)", () => {
    expect(moves.length).toBeLessThanOrEqual(MOVE_HUE_RING.length);
    const hues = moves.map((m) => moveHue(m.id));
    expect(new Set(hues).size).toBe(moves.length);
    for (const move of moves) expect(moveHue(move.id)).toBe(MOVE_HUES[move.id]);
  });

  // Gate 2: 30 degrees reads as distinct in orange, green and blue-violet;
  // red-pink and teal-cyan need wider gaps (15/345 and 190/215 were twins).
  it("keeps every pair of move hues clearly apart", () => {
    const gap = (a: number, b: number) => {
      const d = Math.abs(a - b) % 360;
      return Math.min(d, 360 - d);
    };
    const redPink = (h: number) => h >= 330 || h <= 30;
    const tealCyan = (h: number) => h >= 170 && h <= 230;
    const hues = moves.map((m) => moveHue(m.id));
    for (let i = 0; i < hues.length; i++) {
      for (let j = i + 1; j < hues.length; j++) {
        const [a, b] = [hues[i], hues[j]];
        const wide = (redPink(a) && redPink(b)) || (tealCyan(a) && tealCyan(b));
        expect(gap(a, b), `${a} vs ${b}`).toBeGreaterThanOrEqual(wide ? 35 : 30);
      }
    }
  });

  it("ring hues are valid angles and the default is on the ring", () => {
    for (const hue of MOVE_HUE_RING) {
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
    expect(MOVE_HUE_RING).toContain(DEFAULT_MOVE_HUE);
    expect(new Set(MOVE_HUE_RING).size).toBe(MOVE_HUE_RING.length);
  });

  it("default matches the @property initial value in globals.css", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    const m = css.match(/@property\s+--move-hue\s*\{[^}]*initial-value:\s*([\d.]+)/);
    expect(Number(m?.[1])).toBe(DEFAULT_MOVE_HUE);
  });
});

describe("moveHueStyle", () => {
  it("scopes the hue through the custom property", () => {
    const id = moves[0].id;
    expect(moveHueStyle(id)).toEqual({ [MOVE_HUE_VAR]: String(moveHue(id)) });
  });
});

describe("publishMoveHue", () => {
  function fakeTarget() {
    const props = new Map<string, string>();
    return {
      props,
      style: {
        setProperty: (name: string, value: string | null) => {
          props.set(name, String(value));
        },
        removeProperty: (name: string) => {
          const old = props.get(name) ?? "";
          props.delete(name);
          return old;
        },
      },
    };
  }

  it("sets and clears the root property", () => {
    const target = fakeTarget();
    const id = moves[1].id;
    publishMoveHue(id, target);
    expect(target.props.get(MOVE_HUE_VAR)).toBe(String(moveHue(id)));
    publishMoveHue(null, target);
    expect(target.props.has(MOVE_HUE_VAR)).toBe(false);
  });
});
