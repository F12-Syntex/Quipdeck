import { describe, expect, it } from "vitest";
import { moves } from "../content/moves";
import {
  DEFAULT_MOVE_HUE,
  MOVE_HUE_RING,
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

  it("returns a ring hue for unknown and empty ids", () => {
    for (const id of ["not-a-move", "", "ünïcødé ✓", "x".repeat(500)]) {
      expect(MOVE_HUE_RING).toContain(moveHue(id));
    }
  });

  it("spreads the current moves over several hues", () => {
    const distinct = new Set(moves.map((m) => moveHue(m.id)));
    expect(distinct.size).toBeGreaterThanOrEqual(Math.min(6, moves.length));
  });

  it("ring hues are valid angles and the default is on the ring", () => {
    for (const hue of MOVE_HUE_RING) {
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
    expect(MOVE_HUE_RING).toContain(DEFAULT_MOVE_HUE);
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
