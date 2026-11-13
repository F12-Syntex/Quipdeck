import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * D-THEME-7: every class merge goes through the project `cn` in
 * `src/lib/utils.ts`, which knows the custom text-size and colour tokens.
 * The bare `cn` package (or any `cn/...` subpath) merges `text-heading` and
 * `text-fg-primary` as one group and silently drops sizes. Only utils.ts
 * may import it.
 */
const SRC = join(__dirname, "..");
const ALLOWED = new Set(["lib/utils.ts"]);
const BARE_CN = /(?:from\s*|import\s*\(\s*|require\s*\(\s*|import\s+)["']cn(?:\/[^"']*)?["']/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:[cm]?[jt]sx?)$/.test(entry.name) ? [path] : [];
  });
}

describe("cn imports (D-THEME-7)", () => {
  const files = sourceFiles(SRC);

  it("scans the source tree", () => {
    expect(files.some((f) => f.endsWith(join("components", "ui", "button.tsx")))).toBe(true);
  });

  it("the pattern catches bare and subpath imports", () => {
    // Built from a variable so this file does not match its own pattern.
    const pkg = "cn";
    expect(BARE_CN.test(`import { cn } from "${pkg}"`)).toBe(true);
    expect(BARE_CN.test(`import { createCn } from '${pkg}/config'`)).toBe(true);
    expect(BARE_CN.test(`import { cn } from "@/lib/utils"`)).toBe(false);
    expect(BARE_CN.test(`import { cn } from "./cn-helpers"`)).toBe(false);
  });

  it("no file but src/lib/utils.ts imports the cn package", () => {
    const offenders = files
      .map((f) => relative(SRC, f).split(sep).join("/"))
      .filter((rel) => !ALLOWED.has(rel))
      .filter((rel) => BARE_CN.test(readFileSync(join(SRC, rel), "utf8")));
    expect(offenders).toEqual([]);
  });
});
