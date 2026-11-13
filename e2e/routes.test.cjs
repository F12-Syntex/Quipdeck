/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/* FEATURE_INVENTORY section 2: routes (R-1 .. R-7). R-5 is MAN (see report). */
const test = require("node:test");
const assert = require("node:assert/strict");
const h = require("./support/harness.cjs").create(test);

test("R-1 GET / is 200 and shows the feed", async () => {
  const { page, response } = await h.open();
  assert.equal(response.status(), 200);
  assert.ok(await page.locator('[data-testid="feed"]').isVisible());
});

test("R-2 /saved shows the Saved h1; the static HTML holds h1 and skeleton (no JavaScript)", async () => {
  const { page, response } = await h.open({ route: "/saved", device: h.PHONE });
  assert.equal(response.status(), 200);
  await page.getByRole("heading", { level: 1, name: "Saved" }).waitFor({ state: "visible" });
  const bare = await h.open({ route: "/saved", device: h.PHONE, javaScriptEnabled: false, wait: false });
  assert.equal(bare.response.status(), 200);
  assert.ok(await bare.page.locator("h1", { hasText: "Saved" }).isVisible(), "h1 in the HTML");
  assert.ok(await bare.page.locator('[data-testid="saved-skeleton"]').first().isVisible(), "skeleton in the HTML");
});

test("R-3 /saved?card=<id> opens that card; an unknown id opens nothing and logs no error", async () => {
  for (const device of [h.PHONE, h.DESKTOP]) {
    const known = await h.open({ route: "/saved?card=c01", saved: ["c01", "c02"], device });
    await known.page
      .locator('[data-testid="card-detail"][data-card-id="c01"]')
      .waitFor({ state: "visible" });
    const unknown = await h.open({ route: "/saved?card=nope", saved: ["c01", "c02"], device });
    await unknown.page.locator('[data-testid="saved-row"]:visible').first().waitFor();
    assert.equal(await unknown.page.locator('[data-testid="card-detail"]:visible').count(), 0);
    assert.deepEqual(unknown.logs, []);
  }
});

test("R-4 not found: 404, one line, a link to the feed, nav present", async () => {
  const { page, response } = await h.open({ route: "/nope", wait: false });
  assert.equal(response.status(), 404);
  assert.ok(await page.locator('nav[aria-label="Primary"]').isVisible());
  await page.getByRole("link", { name: "Go to the feed" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await page.waitForSelector(h.FEED_READY);
});

test("R-6 /showcase: 200, noindex, not in the nav (nav has two links)", async () => {
  const { page, response } = await h.open({ route: "/showcase", wait: false });
  assert.equal(response.status(), 200);
  const robots = await page.locator('meta[name="robots"]').getAttribute("content");
  assert.match(robots, /noindex/);
  assert.equal(await page.locator('nav[aria-label="Primary"] a').count(), 2);
});

// Console health on both routes (folded in from the P1-6 smoke test).
for (const route of ["/", "/saved"]) {
  test(`R-1/R-2 ${route}: no console errors, no hydration warnings`, async () => {
    const { page, logs } = await h.open({ route, saved: ["c01", "c03"], device: h.PHONE });
    if (route === "/saved") await page.waitForSelector('[data-testid="saved-row"]');
    else await h.settled(page);
    await h.frame(page);
    assert.deepEqual(logs, []);
  });
}

test("R-7 metadata: title, description, viewport-fit, dark theme colour", async () => {
  const { page } = await h.open();
  assert.equal(await page.title(), "Quipdeck");
  const desc = await page.locator('meta[name="description"]').getAttribute("content");
  assert.ok(desc && desc.length > 20, "description present");
  assert.match(desc, /clips?/i);
  assert.match(desc, /unscripted/i);
  assert.doesNotMatch(desc, /jokes/i);
  assert.match(await page.locator('meta[name="viewport"]').getAttribute("content"), /viewport-fit=cover/);
  const theme = await page.locator('meta[name="theme-color"]').first().getAttribute("content");
  assert.match(theme, /^#[0-3][0-9a-f]{5}$/i, "dark theme colour " + theme);
});
