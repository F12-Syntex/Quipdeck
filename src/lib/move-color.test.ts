import { describe, expect, it } from "vitest";
import { movesSortedAZ } from "../content";
import { MOVE_COLOR_COUNT, moveColorIndex, moveColorStyle } from "./move-color";

const style = (id: string, list?: { id: string }[]) =>
  moveColorStyle(id, list) as Record<string, string>;

describe("moveColorIndex", () => {
  it("is the A to Z index mod 5, plus 1", () => {
    movesSortedAZ.forEach((m, i) => {
      expect(moveColorIndex(m.id)).toBe((i % MOVE_COLOR_COUNT) + 1);
    });
  });

  it("gives neighbouring moves in A to Z order different colours", () => {
    for (let i = 1; i < movesSortedAZ.length; i++) {
      expect(moveColorIndex(movesSortedAZ[i].id)).not.toBe(
        moveColorIndex(movesSortedAZ[i - 1].id),
      );
    }
  });

  it("uses all five chart colours for the starter moves", () => {
    const used = new Set(movesSortedAZ.map((m) => moveColorIndex(m.id)));
    expect([...used].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("follows the list it is given", () => {
    const list = ["a", "b", "c", "d", "e", "f", "g"].map((id) => ({ id }));
    expect(list.map((m) => moveColorIndex(m.id, list))).toEqual([1, 2, 3, 4, 5, 1, 2]);
  });

  it("falls back to chart-1 for an unknown move, prototype names included", () => {
    expect(moveColorIndex("not-a-move")).toBe(1);
    expect(moveColorIndex("constructor")).toBe(1);
    expect(moveColorIndex("__proto__")).toBe(1);
  });
});

describe("moveColorStyle", () => {
  it("sets --move and --move-foreground to the matching chart tokens", () => {
    const list = [{ id: "x" }, { id: "y" }, { id: "z" }];
    expect(style("z", list)).toEqual({
      "--move": "var(--chart-3)",
      "--move-foreground": "var(--chart-3-foreground)",
    });
  });

  it("falls back to --chart-1 for an unknown move", () => {
    expect(style("unknown")["--move"]).toBe("var(--chart-1)");
    expect(style("unknown")["--move-foreground"]).toBe("var(--chart-1-foreground)");
  });
});
