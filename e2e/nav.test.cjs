/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/* FEATURE_INVENTORY section 3: navigation (N-1 .. N-7). */
const test = require("node:test");
const assert = require("node:assert/strict");
const h = require("./support/harness.cjs").create(test);

const NAV_LINKS = 'nav[aria-label="Primary"] a';

test("N-1 nav has exactly Feed and Saved, no digits or badges", async () => {
  for (const route of ["/", "/saved"]) {
    const { page } = await h.open({ route });
    const links = page.locator(NAV_LINKS);
    assert.equal(await links.count(), 2);
    assert.deepEqual(await links.allInnerTexts(), ["Feed", "Saved"]);
    const text = await page.locator('nav[aria-label="Primary"]').innerText();
    assert.doesNotMatch(text, /\d/);
  }
});

test("N-2 aria-current=page marks the link of the current route", async () => {
  const feed = await h.open({ route: "/" });
  assert.equal(await feed.page.getByRole("link", { name: "Feed" }).getAttribute("aria-current"), "page");
  assert.equal(await feed.page.getByRole("link", { name: "Saved" }).getAttribute("aria-current"), null);
  await feed.page.getByRole("link", { name: "Saved" }).click();
  await feed.page.waitForURL("**/saved");
  await feed.page
    .getByRole("link", { name: "Saved" })
    .and(feed.page.locator('[aria-current="page"]'))
    .waitFor();
  assert.equal(await feed.page.getByRole("link", { name: "Feed" }).getAttribute("aria-current"), null);
  const saved = await h.open({ route: "/saved" });
  assert.equal(await saved.page.getByRole("link", { name: "Saved" }).getAttribute("aria-current"), "page");
  assert.equal(await saved.page.getByRole("link", { name: "Feed" }).getAttribute("aria-current"), null);
});

test("N-3 phone placement: fixed, bottom centre, inside the safe area, links >= 88x44", async () => {
  const { page } = await h.open({ device: h.PHONE });
  const nav = page.locator('nav[aria-label="Primary"]');
  assert.equal(await nav.evaluate((e) => getComputedStyle(e).position), "fixed");
  const b = await h.box(nav);
  assert.ok(Math.abs(b.x + b.width / 2 - 195) <= 2, `centre x ${b.x + b.width / 2}`);
  const gap = 844 - (b.y + b.height);
  assert.ok(gap >= 8 && gap <= 44, `bottom gap ${gap}`);
  for (const link of await page.locator(NAV_LINKS).all()) {
    const lb = await h.box(link);
    assert.ok(lb.width >= 88 && lb.height >= 44, `link ${lb.width}x${lb.height}`);
  }
});

test("N-4 desktop placement: fixed, top centre", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  const nav = page.locator('nav[aria-label="Primary"]');
  assert.equal(await nav.evaluate((e) => getComputedStyle(e).position), "fixed");
  const b = await h.box(nav);
  assert.ok(Math.abs(b.x + b.width / 2 - 720) <= 2, `centre x ${b.x + b.width / 2}`);
  assert.ok(b.y <= 32, `top ${b.y}`);
});

test("N-5 nav never moves (scroll, flip), stays on top and clickable", async () => {
  for (const device of [h.PHONE, h.DESKTOP]) {
    const { page } = await h.open({ device });
    await h.startHealthy(page, 3);
    const start = await h.navBox(page);
    for (let i = 0; i < 3; i++) await h.next(page);
    await h.flipAndPlay(page);
    assert.deepEqual(await h.navBox(page), start);
    const onTop = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Primary"]');
      const r = nav.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return nav.contains(hit);
    });
    assert.ok(onTop, "nav is the top element at its centre");
    await page.getByRole("link", { name: "Saved" }).click();
    await page.waitForURL("**/saved");
    assert.deepEqual(await h.navBox(page), start);
  }
});

test("N-6 feed state survives a visit to Saved", async () => {
  const { page } = await h.open({ device: h.PHONE });
  await h.startHealthy(page, 2);
  await h.next(page);
  await h.flip(page);
  await h.next(page);
  const order = await h.domOrder(page);
  const active = await h.activeId(page);
  const before = await h.faces(page);
  await page.getByRole("link", { name: "Saved" }).click();
  await page.waitForURL("**/saved");
  await page.getByRole("link", { name: "Feed" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await page.waitForSelector(h.ACTIVE);
  await h.settled(page);
  assert.equal(await h.activeId(page), active);
  assert.deepEqual(await h.faces(page), before);
  assert.deepEqual(await h.domOrder(page), order);
});

test("N-7 keyboard: Tab reaches both links, Enter activates", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  const focusedLink = () =>
    page.evaluate(() => {
      const el = document.activeElement;
      return el && el.closest('nav[aria-label="Primary"]') && el.tagName === "A" ? el.textContent.trim() : null;
    });
  const seen = [];
  for (let i = 0; i < 40 && seen.length < 2; i++) {
    await page.keyboard.press("Tab");
    const name = await focusedLink();
    if (name && !seen.includes(name)) seen.push(name);
    if (name === "Saved") break;
  }
  assert.ok(seen.includes("Saved"), `Tab reached ${JSON.stringify(seen)}`);
  await page.keyboard.press("Enter");
  await page.waitForURL("**/saved");
  // On Saved, Tab until the Feed link, then Enter.
  let onFeed = false;
  for (let i = 0; i < 40 && !onFeed; i++) {
    await page.keyboard.press("Tab");
    onFeed = (await focusedLink()) === "Feed";
  }
  assert.ok(onFeed, "Tab reached Feed");
  await page.keyboard.press("Enter");
  await page.waitForURL((u) => u.pathname === "/");
});
