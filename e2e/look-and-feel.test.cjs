/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/*
 * FEATURE_INVENTORY section 14: look and feel (D-THEME-8, the Soft Pop
 * theme). PW-checkable parts only: LF-1, LF-2, LF-3. LF-4 is a gate review,
 * LF-5 is MAN (needs a device with real safe-area insets), LF-6 is CMD (grep
 * for non-dvh viewport units).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const h = require("./support/harness.cjs").create(test);

/** Relative luminance (0..1) of the page background, resolved by a canvas. */
const backgroundLuminance = (page) =>
  page.evaluate(() => {
    const read = (el) => {
      const c = document.createElement("canvas");
      c.width = c.height = 1;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.clearRect(0, 0, 1, 1);
      g.fillStyle = getComputedStyle(el).backgroundColor;
      g.fillRect(0, 0, 1, 1);
      const [r, gr, b, a] = g.getImageData(0, 0, 1, 1).data;
      return { r, g: gr, b, a };
    };
    let px = read(document.body);
    if (px.a === 0) px = read(document.documentElement);
    const lin = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return { ...px, lum: 0.2126 * lin(px.r) + 0.7152 * lin(px.g) + 0.0722 * lin(px.b) };
  });

test("LF-1 dark only: html.dark, color-scheme dark, no toggle, dark in a light-preferring browser", async () => {
  for (const route of ["/", "/saved"]) {
    const { page } = await h.open({ route, colorScheme: "light", saved: ["c01"] });
    const info = await page.evaluate(() => ({
      dark: document.documentElement.classList.contains("dark"),
      scheme: getComputedStyle(document.documentElement).colorScheme,
    }));
    assert.equal(info.dark, true, route);
    assert.match(info.scheme, /dark/, route);
    assert.equal(await page.getByRole("button", { name: /theme|dark mode|light mode|appearance/i }).count(), 0);
    assert.equal(await page.getByRole("switch").count(), 0);
    const bg = await backgroundLuminance(page);
    assert.ok(bg.lum < 0.05, `${route} background luminance ${bg.lum} (${bg.r},${bg.g},${bg.b})`);
  }
});

/** Resolve a CSS colour expression to rgb() through a probe element. */
const resolveColor = (page, expr, scope) =>
  page.evaluate(
    ({ expr, scope }) => {
      const host = scope ? document.querySelector(scope) : document.body;
      const probe = document.createElement("div");
      probe.style.backgroundColor = expr;
      host.appendChild(probe);
      const out = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return out;
    },
    { expr, scope },
  );

test("LF-2 flat surfaces: no backdrop-filter anywhere; the nav and card faces are opaque", async () => {
  for (const route of ["/", "/saved"]) {
    const { page } = await h.open({ device: h.PHONE, route, saved: ["c01", "c03"] });
    if (route === "/") {
      await h.flip(page);
      await page.waitForFunction(
        (s) => getComputedStyle(document.querySelector(`${s} [data-testid="card-back"]`)).transform === "none",
        h.ACTIVE,
      );
    } else {
      await page.waitForSelector('[data-testid="saved-row"]');
    }
    const bad = await page.evaluate(() =>
      [...document.querySelectorAll("*")]
        .map((el) => {
          const cs = getComputedStyle(el);
          const bf = cs.backdropFilter || cs.webkitBackdropFilter || "none";
          return bf === "none" ? null : `${el.tagName}.${String(el.className).slice(0, 40)}: ${bf}`;
        })
        .filter(Boolean),
    );
    assert.deepEqual(bad, [], route);
    const alpha = (sel) =>
      page.evaluate((sel) => {
        const m = getComputedStyle(document.querySelector(sel)).backgroundColor.match(/[\d.]+/g).map(Number);
        return m.length === 4 ? m[3] : 1;
      }, sel);
    assert.equal(await alpha('nav[aria-label="Primary"]'), 1, `${route}: nav is opaque`);
    if (route === "/") {
      assert.equal(await alpha(`${h.ACTIVE} [data-testid="card-front"]`), 1, "front is opaque");
      assert.equal(await alpha(`${h.ACTIVE} [data-testid="card-back"]`), 1, "back is opaque");
    }
  }
});

test("LF-3 move colour: each card front is the theme chart colour of its move (A to Z index mod 5)", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  const sorted = [...h.MOVES].sort((a, b) => a.label.localeCompare(b.label));
  const slot = (moveId) => (sorted.findIndex((m) => m.id === moveId) % 5) + 1;
  const fronts = await page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('[data-testid="feed"] [data-testid="card"]')].map((c) => [
        c.getAttribute("data-card-id"),
        {
          front: getComputedStyle(c.querySelector('[data-testid="card-front"]')).backgroundColor,
          response: getComputedStyle(c.querySelector('[data-testid="response"] [data-testid="line"]')).backgroundColor,
          tag: getComputedStyle(c.querySelector('[data-testid="card-back"] [data-testid="move"]')).backgroundColor,
        },
      ]),
    ),
  );
  const chart = {};
  for (let n = 1; n <= 5; n++) chart[n] = await resolveColor(page, `var(--chart-${n})`);
  assert.equal(new Set(Object.values(chart)).size, 5, "five distinct chart colours");
  const seen = new Set();
  for (const c of h.CARDS) {
    const want = chart[slot(c.move)];
    assert.equal(fronts[c.id].front, want, `${c.id} front`);
    assert.equal(fronts[c.id].response, want, `${c.id} response bubble`);
    assert.equal(fronts[c.id].tag, want, `${c.id} move tag`);
    seen.add(want);
  }
  assert.ok(seen.size >= 4, `the seed cards use ${seen.size} of the five colours`);
  // Saved: each group's tag is its move's colour.
  const saved = await h.open({ device: h.PHONE, route: "/saved", saved: h.CARDS.map((c) => c.id) });
  await saved.page.waitForSelector('[data-testid="move-group"]');
  const tags = await saved.page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="move-group"]')].map((g) => [
      g.getAttribute("data-move-id"),
      getComputedStyle(g.querySelector("h2 > *")).backgroundColor,
    ]),
  );
  assert.ok(tags.length >= 4, "groups rendered");
  for (const [moveId, bg] of tags) assert.equal(bg, chart[slot(moveId)], `group ${moveId}`);
});
