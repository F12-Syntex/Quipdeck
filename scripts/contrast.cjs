/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/*
 * Contrast check (D-THEME-5, D-THEME-8). `node scripts/contrast.cjs`
 * Reads every colour from src/app/globals.css at runtime: the Soft Pop
 * theme blocks (:root light, .dark) and the Quipdeck additions after them
 * (the move foregrounds). No token value is duplicated here; an unparsable
 * value throws. Optional: `--css <path>` or CONTRAST_CSS=<path>.
 *
 * It checks the pairs the screens actually paint (REDESIGN_V2 sections 2
 * and 5), in both modes:
 *   - text pairs need 4.5:1 (WCAG AA body text). Dark is the shipped theme;
 *     light is enforced too, so the light screenshots are honest.
 *   - non-text pairs (focus ring, outline-control border) need 3:1 in dark.
 *     The stock 50% focus halo is printed as "info" (it is the only ring a
 *     bg-primary control shows; see DESIGN_SYSTEM.md section 2).
 *     Light non-text pairs are printed as "info": light is not shipped and
 *     Soft Pop's light ring is a pale lavender.
 *   - pairs no screen paints (secondary / accent as a control fill, which
 *     REDESIGN_V2 forbids, and a destructive fill) are printed as "barred"
 *     and not enforced.
 * Translucent fills (`bg-input/30` on outline buttons and the search
 * field) are composited in sRGB over the surface they sit on.
 * Exit 1 when an enforced pair fails.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const argIdx = process.argv.indexOf("--css");
const cssPath = argIdx > -1 ? process.argv[argIdx + 1] : process.env.CONTRAST_CSS;
if (argIdx > -1 && !cssPath) throw new Error("--css needs a path");
const css = fs
  .readFileSync(cssPath ? path.resolve(cssPath) : path.join(ROOT, "src", "app", "globals.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

// ---- top-level blocks -----------------------------------------------------
/** Bodies of every top-level rule whose selector is exactly `selector`. */
function topLevelBlocks(selector) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") {
      if (depth === 0) {
        const head = css.slice(start, i).trim();
        if (head === selector) {
          let d = 0;
          for (let j = i; j < css.length; j++) {
            if (css[j] === "{") d++;
            else if (css[j] === "}" && --d === 0) {
              out.push(css.slice(i + 1, j));
              break;
            }
          }
        }
      }
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) start = i + 1;
    } else if (ch === ";" && depth === 0) {
      start = i + 1;
    }
  }
  if (!out.length) throw new Error("no top-level block: " + selector);
  return out;
}
function declarations(body) {
  const map = new Map();
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) map.set(m[1], m[2].replace(/\s+/g, " ").trim());
  return map;
}
const light = new Map();
for (const b of topLevelBlocks(":root")) for (const [k, v] of declarations(b)) light.set(k, v);
const dark = new Map(light);
for (const b of topLevelBlocks(".dark")) for (const [k, v] of declarations(b)) dark.set(k, v);
const MODES = { dark, light };

function token(mode, name) {
  const v = MODES[mode].get("--" + name);
  if (v === undefined) throw new Error(`token --${name} missing in ${mode}`);
  return v.replace(/var\(\s*--([\w-]+)\s*\)/g, (_, n) => token(mode, n));
}

// ---- colour maths ---------------------------------------------------------
function parseOklch(v) {
  const m = v.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/);
  if (!m) throw new Error("not oklch: " + v);
  return { l: +m[1], c: +m[2], h: +m[3] };
}
function toSrgb({ l, c, h }) {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return lin.map((x) => {
    const v = Math.min(1, Math.max(0, x));
    return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  });
}
const rgb = (mode, name) => toSrgb(parseOklch(token(mode, name)));
/** `name` at `alpha` over an opaque `under` (sRGB, as browsers composite). */
const over = (top, alpha, under) => top.map((t, i) => t * alpha + under[i] * (1 - alpha));
const lum = (c) => {
  const f = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const hex = (c) => "#" + c.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");

// ---- pairs ----------------------------------------------------------------
/** [label, fg(mode) -> rgb, bg(mode) -> rgb, kind] ; kind: text | ui | barred:<mode|all> */
const T = (name) => (mode) => rgb(mode, name);
const outlineOn = (surface) => (mode) => over(rgb(mode, "input"), 0.3, rgb(mode, surface));
const PAIRS = [
  ["foreground on background (page text)", T("foreground"), T("background"), "text"],
  ["foreground on card (card back, list rows, nav)", T("foreground"), T("card"), "text"],
  ["popover-foreground on popover (sheet)", T("popover-foreground"), T("popover"), "text"],
  ["foreground on muted (trigger bubble, fallback notice)", T("foreground"), T("muted"), "text"],
  ["muted-foreground on background", T("muted-foreground"), T("background"), "text"],
  ["muted-foreground on card", T("muted-foreground"), T("card"), "text"],
  ["muted-foreground on muted (selected row, kbd, notice)", T("muted-foreground"), T("muted"), "text"],
  ["primary-foreground on primary (nav, saved heart, default button)", T("primary-foreground"), T("primary"), "text"],
  ["foreground on outline control over card (mute, heart)", T("foreground"), outlineOn("card"), "text"],
  ["foreground on outline control over background (prev / next, search)", T("foreground"), outlineOn("background"), "text"],
  ["muted-foreground on outline field over background (search placeholder)", T("muted-foreground"), outlineOn("background"), "text"],
  ...[1, 2, 3, 4, 5].map((n) => [
    `chart-${n}-foreground on chart-${n} (move fill: front, response bubble, tag)`,
    T(`chart-${n}-foreground`),
    T(`chart-${n}`),
    "text",
  ]),
  ["ring on background (focus, non-text)", T("ring"), T("background"), "ui"],
  ["ring on card (focus, non-text)", T("ring"), T("card"), "ui"],
  ["ring on muted (focus on a selected row, non-text)", T("ring"), T("muted"), "ui"],
  ["input on background (outline control border, non-text)", T("input"), T("background"), "ui"],
  // The stock shadcn halo (ring-ring/50) alone, as on bg-primary controls
  // whose border-ring matches their fill. Printed for the record (info).
  ["ring/50 halo over card (stock focus on a primary control)", (m) => over(rgb(m, "ring"), 0.5, rgb(m, "card")), T("card"), "info"],
  ["ring/50 halo over background (stock focus on a primary control)", (m) => over(rgb(m, "ring"), 0.5, rgb(m, "background")), T("background"), "info"],
  ["input on card (outline control border, non-text)", T("input"), T("card"), "ui"],
  // Soft Pop's secondary (teal) and accent (yellow) are never a control fill
  // (REDESIGN_V2 5.0); light secondary-foreground is white on teal.
  ["secondary-foreground on secondary (barred: no secondary controls)", T("secondary-foreground"), T("secondary"), "barred"],
  ["accent-foreground on accent (barred: no accent fills)", T("accent-foreground"), T("accent"), "barred"],
  // No screen paints a destructive fill (errors only; none in this build).
  ["destructive-foreground on destructive (barred: no destructive fills)", T("destructive-foreground"), T("destructive"), "barred"],
];

const failures = [];
let lowest = { r: Infinity, label: "" };
for (const mode of ["dark", "light"]) {
  console.log(`\n== ${mode}${mode === "dark" ? " (shipped)" : " (screenshots)"}`);
  for (const [label, fg, bg, kind] of PAIRS) {
    const f = fg(mode);
    const b = bg(mode);
    const r = ratio(f, b);
    const floor = kind === "ui" || kind === "info" ? 3 : 4.5;
    const enforced = kind === "text" || (kind === "ui" && mode === "dark");
    const pass = r >= floor;
    const tag = kind === "barred" ? "barred" : !enforced ? "info" : pass ? "ok" : "FAIL";
    console.log(`${tag.padEnd(6)} ${r.toFixed(2).padStart(6)}  (floor ${floor}, ${hex(f)} on ${hex(b)})  ${label}`);
    if (enforced) {
      if (r < lowest.r) lowest = { r, label: `${mode}: ${label}` };
      if (!pass) failures.push(`${mode}: ${label}: ${r.toFixed(2)}:1 < ${floor}:1`);
    }
  }
}
// The five move colours must stay distinct from each other (one per slot).
for (const mode of ["dark", "light"]) {
  const seen = new Set([1, 2, 3, 4, 5].map((n) => hex(rgb(mode, `chart-${n}`))));
  if (seen.size !== 5) failures.push(`${mode}: the five chart colours are not distinct`);
}
console.log(`\nlowest enforced ratio: ${lowest.r.toFixed(2)}:1  ${lowest.label}`);
if (failures.length) {
  console.error("\nFAILED pairs:\n  " + failures.join("\n  "));
  process.exit(1);
}
console.log("contrast ok");
