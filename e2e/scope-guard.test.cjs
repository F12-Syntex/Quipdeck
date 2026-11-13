/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/* FEATURE_INVENTORY section 16: explicitly absent (X-1 .. X-7). */
const test = require("node:test");
const assert = require("node:assert/strict");
const h = require("./support/harness.cjs").create(test);

const FORBIDDEN_WORDS = /sign ?in|log ?in|sign ?up|account|password|quiz|streak|leaderboard|rank|submit|progress|seen|viewed/i;

test("X-1 no search, discover or filters on the feed", async () => {
  for (const device of [h.PHONE, h.DESKTOP]) {
    const { page } = await h.open({ device });
    assert.equal(await page.locator("input, select, textarea").count(), 0);
    assert.equal(await page.getByRole("searchbox").count(), 0);
    assert.equal(await page.getByRole("search").count(), 0);
    assert.equal(await page.getByRole("link", { name: /discover|explore|filter/i }).count(), 0);
    assert.equal(await page.getByRole("button", { name: /discover|explore|filter|search/i }).count(), 0);
  }
});

test("X-2 no counts, position, streaks, progress or seen marks", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  await h.next(page);
  const feedText = await page.locator('[data-testid="feed"]').innerText();
  assert.doesNotMatch(feedText, /\d+\s*(\/|of)\s*\d+/i);
  assert.doesNotMatch(feedText, FORBIDDEN_WORDS);
  assert.equal(await page.locator('[role="progressbar"], progress, meter').count(), 0);
  assert.doesNotMatch(await page.locator('nav[aria-label="Primary"]').innerText(), /\d/);
  const saved = await h.open({ route: "/saved", saved: ["c01", "c03", "c05"], device: h.DESKTOP });
  await saved.page.waitForSelector('[data-testid="saved-row"]:visible');
  for (const t of await saved.page.locator('[data-testid="move-group"]:visible h2').allInnerTexts()) {
    assert.doesNotMatch(t, /\d/);
  }
  assert.doesNotMatch(await saved.page.locator("main, body").first().innerText(), /\b\d+ saved\b|\bsaved \(\d+\)/i);
});

test("X-3 no accounts, sign-in, quizzes, ranking or submissions", async () => {
  for (const route of ["/", "/saved"]) {
    const { page } = await h.open({ route, saved: ["c01"], device: h.DESKTOP });
    await h.frame(page);
    assert.equal(await page.locator('input[type="password"]').count(), 0, route);
    assert.equal(await page.locator("form").count(), 0, `${route}: no form`);
    const labels = await page.locator("a, button").evaluateAll((els) =>
      els.map((e) => (e.getAttribute("aria-label") || e.textContent || "").trim()),
    );
    for (const l of labels) assert.doesNotMatch(l, FORBIDDEN_WORDS, `${route}: control "${l}"`);
  }
});

test("X-4 no toasts: saving and muting show none", async () => {
  const { page } = await h.open({ device: h.PHONE });
  await h.startHealthy(page, 0);
  await h.flipAndPlay(page);
  await page.locator(`${h.ACTIVE} [data-testid="heart"]`).click();
  await page.locator(`${h.ACTIVE} [data-testid="mute"]`).click();
  await page.waitForFunction(
    () => document.querySelector('[data-testid="live"]')?.textContent.trim().length > 0,
  );
  await h.frame(page);
  assert.equal(await page.locator("[data-sonner-toast]").count(), 0);
  // Next's own route announcer is a 1 px hidden alert; anything else would be a visible toast.
  assert.equal(
    await page.locator('[role="status"]:visible, [role="alert"]:visible:not(#__next-route-announcer__)').count(),
    0,
  );
});

test("X-5 the clip fallback has no retry button", async () => {
  const { page } = await h.open({ device: h.PHONE });
  await h.goToCard(page, h.BROKEN);
  await h.flip(page);
  await h.waitClip(page, "error");
  const fb = page.locator(`${h.ACTIVE} [data-testid="clip-fallback"]`);
  await fb.waitFor({ state: "visible" });
  assert.equal(await fb.locator('button, a, [role="button"], input').count(), 0);
});

test("X-6 no light theme and no theme toggle", async () => {
  for (const route of ["/", "/saved"]) {
    const { page } = await h.open({ route, colorScheme: "light" });
    assert.equal(await page.getByRole("button", { name: /theme|dark|light|appearance/i }).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains("dark")), true);
  }
});

test("X-7 no heart on list rows", async () => {
  for (const device of [h.PHONE, h.DESKTOP]) {
    const { page } = await h.open({ route: "/saved", saved: ["c01", "c02", "c03"], device });
    await page.waitForSelector('[data-testid="saved-row"]:visible');
    assert.equal(await page.locator('[data-testid="saved-row"] [data-testid="heart"]').count(), 0);
    assert.equal(await page.locator('[data-testid="saved-row"]').evaluateAll((rows) => rows.filter((r) => r.querySelector("svg.lucide-heart")).length), 0);
  }
});
