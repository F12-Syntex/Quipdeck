/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/*
 * Contrast check (P2-2, D-THEME-5). `node scripts/contrast.cjs`
 * Reads the text and surface tokens from src/app/globals.css, composites the
 * translucent surfaces in sRGB over their worst case (the ambient glow peak
 * under painted glass, for every hue on the ring), and fails (exit 1) when a
 * documented text/surface pair is under 4.5:1 (3:1 for the large-text
 * tokens, listed in LARGE). Pairs DESIGN_SYSTEM.md forbids (fg-tertiary on a
 * card-face control or bubble) are printed as "barred" and not enforced.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(ROOT, "src", "app", "globals.css"), "utf8");
const ring = (() => {
  const src = fs.readFileSync(path.join(ROOT, "src", "lib", "move-hue.ts"), "utf8");
  const m = src.match(/MOVE_HUE_RING[^=]*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/);
  return [...m[1].replace(/\/\/.*$/gm, "").matchAll(/\d+/g)].map((x) => Number(x[0]));
})();

// ---- token lookup -------------------------------------------------------
const root = css.match(/:root\s*\{([\s\S]*?)\n\}/)[1];
function token(name) {
  const m = root.match(new RegExp("--" + name + ":\\s*([^;]+);"));
  if (!m) throw new Error("token not found: --" + name);
  return m[1].replace(/\/\*.*?\*\//g, "").trim();
}

// ---- colour maths -------------------------------------------------------
function parseOklch(v, hue) {
  const m = v.replace(/var\(--move-hue\)/g, String(hue)).match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/);
  if (!m) throw new Error("not oklch: " + v);
  return { l: +m[1], c: +m[2], h: +m[3], a: m[4] === undefined ? 1 : +m[4] };
}
function toSrgb({ l, c, h }) {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr), b = c * Math.sin(hr);
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
const color = (v, hue = 265) => {
  const o = parseOklch(v, hue);
  return { rgb: toSrgb(o), a: o.a };
};
// Composite top over an opaque bottom (sRGB space, as browsers do).
const over = (top, bottom) => top.rgb.map((t, i) => t * top.a + bottom[i] * (1 - top.a));
const lum = (rgb) => {
  const f = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const hex = (rgb) => "#" + rgb.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");

// ---- surfaces (lightest composite per hue) --------------------------------
const FG = {
  "fg-primary": token("fg-primary"),
  "fg-secondary": token("fg-secondary"),
  "fg-tertiary": token("fg-tertiary"),
};
const white = (a) => ({ rgb: [1, 1, 1], a });
function surfaces(hue) {
  const baseTop = color(token("surface-base-top")).rgb;
  const glowPeak = over(color(token("hue-glow"), hue), baseTop);
  const paint = (() => {
    let s = over(color(token("glass-shade")), glowPeak);
    s = over(color(token("glass-fill-top")), s);
    return over(color(token("glass-specular")), s);
  })();
  const control = color(token("control-fill"));
  return {
    // surface: [rgb, tertiary allowed?]
    "page (surface-base-top)": [baseTop, true],
    "surface-raised": [color(token("surface-raised")).rgb, true],
    "glass-chrome over glow peak": [over(color(token("chrome-fill")), glowPeak), true],
    "glass-paint over glow peak (card face)": [paint, true],
    "glass-control on card face": [over(control, paint), false],
    "glass-control on page (Input)": [over(control, glowPeak), true],
    "glass-bubble on card face": [over(white(0.07), paint), false],
    "hue-bubble on card face": [over(color("oklch(0.58 0.1 var(--move-hue) / 0.24)", hue), paint), false],
  };
}

// ---- run ------------------------------------------------------------------
const LARGE = new Set([]); // large-text tokens (3:1); every text token here uses fg-primary at 4.5
const rows = new Map(); // key -> {min, hex, hue, floor, barred}
const failures = [];
let lowest = { ratio: Infinity, label: "" };

for (const hue of ring) {
  for (const [sName, [rgb, tertiaryOk]] of Object.entries(surfaces(hue))) {
    for (const [fName, fVal] of Object.entries(FG)) {
      const barred = fName === "fg-tertiary" && !tertiaryOk;
      const r = ratio(color(fVal).rgb, rgb);
      const floor = LARGE.has(fName) ? 3 : 4.5;
      const key = `${fName} on ${sName}`;
      const cur = rows.get(key);
      if (!cur || r < cur.min) rows.set(key, { min: r, hex: hex(rgb), hue, floor, barred });
    }
  }
}
// hue-tag text on its own fill, and inverse on primary.
for (const hue of ring) {
  const paint = surfaces(hue)["glass-paint over glow peak (card face)"][0];
  const fill = over(color("oklch(0.62 0.11 var(--move-hue) / 0.16)", hue), paint);
  const r = ratio(color("oklch(0.9 0.05 var(--move-hue))", hue).rgb, fill);
  const key = "hue-tag text on its own fill";
  const cur = rows.get(key);
  if (!cur || r < cur.min) rows.set(key, { min: r, hex: hex(fill), hue, floor: 4.5, barred: false });
}
rows.set("fg-inverse on fg-primary", {
  min: ratio(color(token("fg-inverse")).rgb, color(token("fg-primary")).rgb),
  hex: hex(color(token("fg-primary")).rgb), hue: "-", floor: 4.5, barred: false,
});
// Focus ring (non-text, 3:1) on the lightest card face and on the base.
for (const hue of ring) {
  for (const [name, rgbOf] of [
    ["page", (h) => surfaces(h)["page (surface-base-top)"][0]],
    ["card face", (h) => surfaces(h)["glass-paint over glow peak (card face)"][0]],
  ]) {
    const r = ratio(color(token("focus-ring"), hue).rgb, rgbOf(hue));
    const key = `focus-ring on ${name} (non-text)`;
    const cur = rows.get(key);
    if (!cur || r < cur.min) rows.set(key, { min: r, hex: hex(rgbOf(hue)), hue, floor: 3, barred: false });
  }
}

for (const [key, v] of rows) {
  const pass = v.min >= v.floor;
  const tag = v.barred ? "barred" : pass ? "ok" : "FAIL";
  console.log(`${tag.padEnd(6)} ${v.min.toFixed(2).padStart(6)}  (floor ${v.floor}, hue ${v.hue}, ${v.hex})  ${key}`);
  if (!v.barred) {
    if (v.min < lowest.ratio) lowest = { ratio: v.min, label: key };
    if (!pass) failures.push(`${key}: ${v.min.toFixed(2)}:1 < ${v.floor}:1`);
  }
}
console.log(`\nlowest enforced ratio: ${lowest.ratio.toFixed(2)}:1  ${lowest.label}`);
if (failures.length) {
  console.error("\nFAILED pairs:\n  " + failures.join("\n  "));
  process.exit(1);
}
console.log("contrast ok");
