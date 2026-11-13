/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/* FEATURE_INVENTORY section 4: feed (FD-1 .. FD-11). FD-9 is UT / review. */
const test = require("node:test");
const assert = require("node:assert/strict");
const h = require("./support/harness.cjs").create(test);

/** Wait until the active card is `id`-independent but the feed is settled. */
const gesture = async (page, from) => {
  const order = await h.domOrder(page);
  await page.waitForFunction(
    ({ s, from }) => document.querySelector(s)?.getAttribute("data-card-id") !== from,
    { s: h.ACTIVE, from },
    { timeout: 5000 },
  );
  await h.settled(page);
  return order.indexOf(await h.activeId(page));
};

test("FD-1 one card per viewport, scroll-snap mandatory, snapped after a gesture", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  const info = await page.evaluate(() => {
    const feed = document.querySelector('[data-testid="feed"]');
    return {
      snap: getComputedStyle(feed).scrollSnapType,
      heights: [...feed.querySelectorAll("[data-slide-id]")].map((s) => s.getBoundingClientRect().height),
      inner: window.innerHeight,
    };
  });
  assert.equal(info.snap, "y mandatory");
  assert.ok(info.heights.length >= 10);
  for (const ht of info.heights) assert.ok(Math.abs(ht - info.inner) <= 1, `slide ${ht} vs ${info.inner}`);
  const order = await h.domOrder(page);
  const from = await h.activeId(page);
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, 600);
  const to = await gesture(page, from);
  assert.equal(to - order.indexOf(from), 1);
  const rem = await h.scrollRem(page);
  assert.ok(rem <= 1 || rem >= 899, `scrollTop % innerHeight ${rem}`);
});

test("FD-2 one deliberate wheel gesture moves exactly one card (desktop)", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  const order = await h.domOrder(page);
  const from = await h.activeId(page);
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, 600);
  const to = await gesture(page, from);
  assert.equal(to - order.indexOf(from), 1);
  // No second move follows after the gesture has settled.
  await page.waitForTimeout(600);
  assert.equal(order.indexOf(await h.activeId(page)) - order.indexOf(from), 1);
});

test("FD-2 one touch swipe moves exactly one card (phone)", async () => {
  const { page, ctx } = await h.open({ device: h.PHONE });
  const order = await h.domOrder(page);
  const from = await h.activeId(page);
  // 600 px up on an 844 px viewport: more than half a slide.
  await h.touchDrag(page, ctx, { x: 195, y: 700, dy: -600, steps: 10 });
  const to = await gesture(page, from);
  assert.equal(to - order.indexOf(from), 1);
  await page.waitForTimeout(600);
  assert.equal(order.indexOf(await h.activeId(page)) - order.indexOf(from), 1);
});

test("FD-2 a 3000 px wheel burst moves exactly one card (D-FEED-11)", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  const order = await h.domOrder(page);
  const from = await h.activeId(page);
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, 3000);
  const to = await gesture(page, from);
  assert.equal(to - order.indexOf(from), 1);
  await page.waitForTimeout(600);
  assert.equal(order.indexOf(await h.activeId(page)) - order.indexOf(from), 1);
});

test("FD-2 a single 120 px wheel notch moves exactly one card (D-FEED-11)", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  const order = await h.domOrder(page);
  const from = await h.activeId(page);
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, 120);
  const to = await gesture(page, from);
  assert.equal(to - order.indexOf(from), 1);
  const rem = await h.scrollRem(page);
  assert.ok(rem <= 1 || rem >= 899, `scrollTop % innerHeight ${rem}`);
});

test("FD-3 shuffled: every card once; order differs between visits", async () => {
  const orders = [];
  for (let i = 0; i < 3; i++) {
    const { page } = await h.open({ device: h.DESKTOP });
    orders.push(await h.domOrder(page));
  }
  const ids = h.CARDS.map((c) => c.id).sort();
  assert.ok(ids.length >= 10);
  for (const o of orders) assert.deepEqual([...o].sort(), ids);
  const distinct = new Set(orders.map((o) => o.join(",")));
  assert.ok(distinct.size >= 2, "at least two of three loads differ");
});

test("FD-4 no hydration warning, no visible reorder, ready on first card paint", async () => {
  const { page, logs } = await h.open({
    device: h.PHONE,
    init: () => {
      window.__paint = null;
      new MutationObserver(() => {
        if (window.__paint) return;
        const feed = document.querySelector('[data-testid="feed"]');
        const cards = feed ? [...feed.querySelectorAll('[data-testid="card"]')] : [];
        if (cards.length > 0) {
          window.__paint = {
            ready: feed.getAttribute("data-ready"),
            order: cards.map((c) => c.getAttribute("data-card-id")),
          };
        }
      }).observe(document, { childList: true, subtree: true, attributes: true });
    },
  });
  await page.waitForTimeout(500);
  assert.ok(!logs.some((l) => /hydrat/i.test(l)), logs.join("\n"));
  const paint = await page.evaluate(() => window.__paint);
  assert.equal(paint.ready, "true");
  assert.deepEqual(paint.order, await h.domOrder(page));
});

test("FD-5 loading state: the static HTML has a skeleton and no cue text (no JavaScript)", async () => {
  const { page } = await h.open({ device: h.PHONE, javaScriptEnabled: false, wait: false });
  const skeleton = page.locator('[data-testid="feed-skeleton"]');
  assert.ok(await skeleton.isVisible());
  assert.equal((await skeleton.innerText()).trim(), "");
  const body = await page.locator("body").innerText();
  for (const c of h.CARDS) assert.ok(!body.includes(c.cue), "no cue text in the HTML: " + c.cue);
});

test("FD-6 order is stable within the visit (client navigation)", async () => {
  const { page } = await h.open({ device: h.PHONE });
  const order = await h.domOrder(page);
  await page.getByRole("link", { name: "Saved" }).click();
  await page.waitForURL("**/saved");
  await page.getByRole("link", { name: "Feed" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await page.waitForSelector(h.FEED_READY);
  assert.deepEqual(await h.domOrder(page), order);
});

test("FD-7 a reload is a new visit: flips reset, mute resets to muted", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  await h.startHealthy(page, 0);
  await h.flipAndPlay(page);
  const mute = page.locator(`${h.ACTIVE} [data-testid="mute"]`);
  await mute.click();
  await page.waitForFunction(
    (s) => document.querySelector(`${s} [data-testid="mute"]`).getAttribute("data-muted") === "false",
    h.ACTIVE,
  );
  await page.reload();
  await page.waitForSelector(h.FEED_READY);
  const faces = await h.faces(page);
  assert.ok(Object.values(faces).every((f) => f === "front"), JSON.stringify(faces));
  await h.flip(page);
  assert.equal(await page.locator(`${h.ACTIVE} [data-testid="mute"]`).getAttribute("data-muted"), "true");
});

test("FD-8 finite deck: the last card is the last snap point; no counter", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  const order = await h.domOrder(page);
  for (let i = 0; i < 20; i++) await page.keyboard.press("ArrowDown");
  await page.waitForFunction(
    ({ s, last }) => document.querySelector(s)?.getAttribute("data-card-id") === last,
    { s: h.ACTIVE, last: order[order.length - 1] },
    { timeout: 8000 },
  );
  await h.settled(page);
  assert.equal(await h.activeId(page), order[order.length - 1]);
  const maxScroll = await page.evaluate(() => {
    const f = document.querySelector('[data-testid="feed"]');
    return { top: f.scrollTop, max: f.scrollHeight - f.clientHeight };
  });
  assert.ok(Math.abs(maxScroll.top - maxScroll.max) <= 1, "scrolled to the end, nothing beyond the last card");
  const text = await page.locator('[data-testid="feed"]').innerText();
  assert.doesNotMatch(text, /\d+\s*\/\s*\d+/);
});

test("FD-10 no search input on the feed", async () => {
  for (const device of [h.PHONE, h.DESKTOP]) {
    const { page } = await h.open({ device });
    assert.equal(await page.getByRole("searchbox").count(), 0);
    assert.equal(await page.locator('input[type="search"]').count(), 0);
  }
});

test("FD-11 returning from Saved shows the same card snapped", async () => {
  const { page } = await h.open({ device: h.PHONE });
  await h.next(page);
  await h.next(page);
  const active = await h.activeId(page);
  await page.getByRole("link", { name: "Saved" }).click();
  await page.waitForURL("**/saved");
  await page.getByRole("link", { name: "Feed" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await h.settled(page);
  assert.equal(await h.activeId(page), active);
  const rem = await h.scrollRem(page);
  assert.ok(rem <= 1 || rem >= 843, `scrollTop % innerHeight was ${rem}`);
});
