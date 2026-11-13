/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/*
 * FEATURE_INVENTORY section 14: look and feel. PW-checkable parts only:
 * LF-1, LF-2, LF-3. LF-4 is a gate review, LF-5 is MAN (needs a device with
 * real safe-area insets), LF-6 is CMD (grep for non-dvh viewport units).
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

test("LF-2 glass: backdrop-filter is none on the card faces and everything inside; set on the nav", async () => {
  const { page } = await h.open({ device: h.PHONE });
  await h.flip(page);
  await page.waitForFunction(
    (s) => getComputedStyle(document.querySelector(`${s} [data-testid="card-back"]`)).transform === "none",
    h.ACTIVE,
  );
  const bad = await page.evaluate(() => {
    const out = [];
    const bf = (el) => {
      const cs = getComputedStyle(el);
      return cs.backdropFilter || cs.webkitBackdropFilter || "none";
    };
    for (const face of document.querySelectorAll('[data-testid="card-front"], [data-testid="card-back"]')) {
      for (const el of [face, ...face.querySelectorAll("*")]) {
        if (bf(el) !== "none") out.push(`${face.getAttribute("data-testid")} > ${el.tagName}.${String(el.className).slice(0, 40)}: ${bf(el)}`);
      }
    }
    return out;
  });
  assert.deepEqual(bad, []);
  const nav = await page.locator('nav[aria-label="Primary"]').evaluate((e) => {
    const cs = getComputedStyle(e);
    return cs.backdropFilter || cs.webkitBackdropFilter || "none";
  });
  assert.notEqual(nav, "none", "the nav is glass");
});

test("LF-3 the ambient hue follows the active card's move", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  const order = await h.domOrder(page);
  const move = (id) => h.card(id).move;
  let i = 0;
  while (i < order.length - 1 && move(order[i]) === move(order[i + 1])) i++;
  assert.ok(i < order.length - 1, "two adjacent cards with different moves");
  const rootHue = () => page.evaluate(() => document.documentElement.style.getPropertyValue("--move-hue").trim());
  const cardHue = (id) =>
    page.evaluate((id) => {
      const back = document.querySelector(`[data-testid="card"][data-card-id="${id}"] [data-testid="card-back"]`);
      return back.style.getPropertyValue("--move-hue").trim();
    }, id);
  await h.goToCard(page, order[i]);
  await page.waitForFunction((want) => document.documentElement.style.getPropertyValue("--move-hue").trim() === want, await cardHue(order[i]));
  const first = await rootHue();
  assert.ok(first !== "", "the root publishes a hue");
  await h.goToCard(page, order[i + 1]);
  const want = await cardHue(order[i + 1]);
  assert.notEqual(want, await cardHue(order[i]));
  await page.waitForFunction((want) => document.documentElement.style.getPropertyValue("--move-hue").trim() === want, want);
  assert.notEqual(await rootHue(), first);
});
