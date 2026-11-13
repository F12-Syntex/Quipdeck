import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CUSTOM_COLORS, CUSTOM_TEXT_SIZES, cn } from "./utils";

const css = readFileSync("src/app/globals.css", "utf8");
const names = (prefix: string) =>
  [...css.matchAll(new RegExp(`^\\s*--${prefix}-([a-z-]+?):`, "gm"))]
    .map((m) => m[1])
    .filter((n) => !n.includes("--"));

describe("cn config matches globals.css", () => {
  it("lists every --text-* size token", () => {
    const sizes = names("text").filter(
      (n) => !/-(line-height|letter-spacing|font-weight)$/.test(n),
    );
    expect([...CUSTOM_TEXT_SIZES].sort()).toEqual([...new Set(sizes)].sort());
  });

  it("lists every Quipdeck --color-* token", () => {
    const colors = names("color");
    for (const c of CUSTOM_COLORS) expect(colors).toContain(c);
  });
});

describe("cn custom font sizes", () => {
  for (const size of CUSTOM_TEXT_SIZES) {
    it(`text-${size} keeps text-fg-* in either order`, () => {
      expect(cn(`text-${size}`, "text-fg-secondary")).toBe(
        `text-${size} text-fg-secondary`,
      );
      expect(cn("text-fg-secondary", `text-${size}`)).toBe(
        `text-fg-secondary text-${size}`,
      );
    });
  }

  it("resolves two sizes to the last one", () => {
    expect(cn("text-body", "text-heading")).toBe("text-heading");
    expect(cn("text-cue", "text-sm", "text-label")).toBe("text-label");
    expect(cn("text-lg", "text-cue-stage")).toBe("text-cue-stage");
  });

  it("resolves two colours to the last one", () => {
    expect(cn("text-fg-primary", "text-fg-secondary")).toBe("text-fg-secondary");
    expect(cn("text-fg-tertiary", "text-fg-inverse")).toBe("text-fg-inverse");
    expect(cn("text-red-500", "text-fg-primary")).toBe("text-fg-primary");
  });
});
