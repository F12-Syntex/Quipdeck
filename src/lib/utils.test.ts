import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CUSTOM_COLORS, CUSTOM_TEXT_SIZES, cn } from "./utils";

const css = readFileSync("src/app/globals.css", "utf8");
const names = (prefix: string) =>
  [...css.matchAll(new RegExp(`^\\s*--${prefix}-([a-z0-9-]+?):`, "gm"))]
    .map((m) => m[1])
    .filter((n) => !n.includes("--"));

/** shadcn colour names (the @theme inline mapping of the Soft Pop theme). */
const SHADCN_COLORS = [
  "background", "foreground", "card", "card-foreground", "popover",
  "popover-foreground", "primary", "primary-foreground", "secondary",
  "secondary-foreground", "muted", "muted-foreground", "accent",
  "accent-foreground", "destructive", "destructive-foreground", "border",
  "input", "ring", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5",
  "sidebar", "sidebar-foreground", "sidebar-primary",
  "sidebar-primary-foreground", "sidebar-accent", "sidebar-accent-foreground",
  "sidebar-border", "sidebar-ring",
];

describe("cn config matches globals.css (D-THEME-8: stock tokens only)", () => {
  it("globals.css defines no custom --text-* size token", () => {
    const sizes = names("text").filter(
      (n) => !/-(line-height|letter-spacing|font-weight)$/.test(n),
    );
    expect([...CUSTOM_TEXT_SIZES].sort()).toEqual([...new Set(sizes)].sort());
    expect(sizes).toEqual([]);
  });

  it("every --color-* token is a shadcn name, and every shadcn name is mapped", () => {
    const colors = [...new Set(names("color"))].sort();
    expect(colors).toEqual([...SHADCN_COLORS, ...CUSTOM_COLORS].sort());
  });

  it("defines the theme tokens in :root and .dark, and a foreground for each chart colour", () => {
    for (const block of [/:root\s*\{([\s\S]*?)\n\}/, /\.dark\s*\{([\s\S]*?)\n\}/]) {
      const body = css.match(block)?.[1] ?? "";
      for (const n of ["background", "foreground", "card", "primary", "muted-foreground", "border", "ring"]) {
        expect(body, n).toMatch(new RegExp(`--${n}:\\s*oklch\\(`));
      }
    }
    for (let n = 1; n <= 5; n++) {
      expect(css).toMatch(new RegExp(`--chart-${n}:\\s*oklch\\(`));
      expect(css).toMatch(new RegExp(`--chart-${n}-foreground:\\s*oklch\\(`));
    }
  });

  it("keeps none of the deleted v1 layers", () => {
    // Split so this file does not match the UI-V2 clean-up grep itself.
    const v1 = ["gla" + "ss-", "ambi" + "ent", "hu" + "e-", "specu" + "lar", "grain", "--surf" + "ace-", "--f" + "g-", "shimmer", "hint-pulse"];
    for (const gone of v1) {
      expect(css, gone).not.toContain(gone);
    }
  });
});

describe("cn merges the classes the screens use", () => {
  it("keeps a stock size next to a theme colour, in either order", () => {
    expect(cn("text-sm", "text-muted-foreground")).toBe("text-sm text-muted-foreground");
    expect(cn("text-muted-foreground", "text-2xl")).toBe("text-muted-foreground text-2xl");
  });

  it("keeps a stock size next to the move foreground variable, in either order", () => {
    expect(cn("text-2xl", "text-(--move-foreground)")).toBe("text-2xl text-(--move-foreground)");
    expect(cn("text-(--move-foreground)", "text-2xl")).toBe("text-(--move-foreground) text-2xl");
  });

  it("resolves two sizes, two colours or two fills to the last one", () => {
    expect(cn("text-base", "text-xl")).toBe("text-xl");
    expect(cn("text-black", "text-foreground")).toBe("text-foreground");
    expect(cn("bg-card", "bg-(--move)")).toBe("bg-(--move)");
    expect(cn("h-8", "h-13")).toBe("h-13");
    expect(cn("rounded-lg", "rounded-full")).toBe("rounded-full");
  });
});
