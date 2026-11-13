/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/*
 * P1-6 integration smoke (D-TEST-1). Covers the FEATURE_INVENTORY ids that
 * need more than one lane. Every test name starts with its id so the spec
 * reporter gives pass/fail per id. The YouTube IFrame API is the stub from
 * e2e/support/yt-stub.js (D-TEST-2) except in the one "REAL" test.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const { startServer } = require("./support/server.cjs");

const STUB = path.join(__dirname, "support", "yt-stub.js");
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const SMALL = { viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true };
const DESKTOP = { viewport: { width: 1440, height: 900 } };

// ---- content (parsed from the seed so the test stays data-driven) ----
const cardsSrc = fs.readFileSync(path.join(__dirname, "..", "src", "content", "cards.ts"), "utf8");
const constMap = {};
for (const m of cardsSrc.matchAll(/^const (\w+) = "([^"]+)"/gm)) constMap[m[1]] = m[2];
const CARDS = [];
for (const m of cardsSrc.matchAll(
  /id: "(c\d+)",[\s\S]*?cue: "([^"]+)",[\s\S]*?clip: \{ youtubeId: (\w+|"[^"]+"), start: (\d+), end: (\d+) \}/g,
)) {
  const raw = m[3].replace(/"/g, "");
  CARDS.push({ id: m[1], cue: m[2], youtubeId: constMap[raw] || raw, start: Number(m[4]), end: Number(m[5]) });
}
assert.ok(CARDS.length >= 10, "parsed seed cards");
const BROKEN = "c14";

let server;
let browser;
test.before(async () => {
  server = await startServer();
  browser = await chromium.launch();
});
test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.stop();
});

// ---- harness ----
const opened = [];
test.afterEach(async () => {
  while (opened.length) await opened.pop().close().catch(() => {});
});

/**
 * Open a page. opts: device (context options), saved (ids), stub (default
 * true), stubConfig, reducedMotion, route ("/" default).
 */
async function open(opts = {}) {
  const ctx = await browser.newContext({
    ...(opts.device || DESKTOP),
    reducedMotion: opts.reducedMotion || "no-preference",
  });
  opened.push(ctx);
  const page = await ctx.newPage();
  const logs = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") logs.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => logs.push(`pageerror: ${err.message}`));
  const requests = [];
  page.on("request", (req) => requests.push(req.url()));
  await page.route("**/embed/**", (r) =>
    r.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>blank</title>" }),
  );
  if (opts.stub !== false) {
    await page.route("**/iframe_api", (r) =>
      r.fulfill({ path: STUB, contentType: "text/javascript" }),
    );
  }
  const config = opts.stubConfig || {};
  const saved = opts.saved;
  await page.addInitScript(
    ({ config, saved }) => {
      window.__ytStubConfig = config;
      if (saved && !sessionStorage.getItem("__seeded")) {
        localStorage.setItem("quipdeck:saved:v1", JSON.stringify(saved));
        sessionStorage.setItem("__seeded", "1");
      }
      // Sample the maximum number of iframes / live players ever seen (CL-6).
      window.__max = { iframes: 0, live: 0 };
      setInterval(() => {
        const n = document.querySelectorAll("iframe").length;
        const l = window.__yt && window.__yt.live ? window.__yt.live() : 0;
        if (n > window.__max.iframes) window.__max.iframes = n;
        if (l > window.__max.live) window.__max.live = l;
      }, 20);
    },
    { config, saved },
  );
  await page.goto(server.url + (opts.route || "/"));
  if ((opts.route || "/") === "/") {
    await page.waitForSelector('[data-testid="feed"][data-ready="true"]');
    await page.waitForSelector('[data-testid="card"][data-active="true"]');
  }
  return { page, ctx, logs, requests };
}

const ACTIVE = '[data-testid="card"][data-active="true"]';
const activeId = (page) =>
  page.evaluate((s) => document.querySelector(s)?.getAttribute("data-card-id") ?? null, ACTIVE);
const domOrder = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="feed"] [data-testid="card"]')].map((c) =>
      c.getAttribute("data-card-id"),
    ),
  );
const faces = (page) =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('[data-testid="feed"] [data-testid="card"]')].map((c) => [
        c.getAttribute("data-card-id"),
        c.getAttribute("data-face"),
      ]),
    ),
  );
const scrollRem = (page) =>
  page.evaluate(() => {
    const f = document.querySelector('[data-testid="feed"]');
    return f.scrollTop % window.innerHeight;
  });

/** Wait until the feed has snapped to the active card and stopped moving. */
async function settled(page) {
  await page.waitForFunction(() => {
    const f = document.querySelector('[data-testid="feed"]');
    const c = document.querySelector('[data-testid="card"][data-active="true"]');
    const s = c && c.closest("[data-slide-id]");
    if (!f || !s) return false;
    const now = f.scrollTop;
    const prev = window.__lastScroll;
    window.__lastScroll = now;
    return Math.abs(now - s.offsetTop) <= 1 && prev === now;
  }, null, { polling: 100, timeout: 8000 });
}

/** Move by one card with the keyboard and wait for the new card. */
async function step(page, key) {
  const before = await activeId(page);
  await page.keyboard.press(key);
  await page.waitForFunction(
    ({ s, before }) => document.querySelector(s)?.getAttribute("data-card-id") !== before,
    { s: ACTIVE, before },
    { timeout: 5000 },
  );
  await settled(page);
  return activeId(page);
}
const next = (page) => step(page, "ArrowDown");
const prev = (page) => step(page, "ArrowUp");

async function goToCard(page, id) {
  for (let i = 0; i < 20; i++) {
    if ((await activeId(page)) === id) return;
    await next(page);
  }
  throw new Error("could not reach " + id);
}

/**
 * The deck is shuffled and one card (BROKEN) cannot play. Move to a start
 * card such that it and the next `span` cards are all healthy.
 */
async function startHealthy(page, span = 0) {
  const order = await domOrder(page);
  const bad = order.indexOf(BROKEN);
  let target = 0;
  while (target + span >= order.length || (bad >= target && bad <= target + span)) target++;
  let cur = order.indexOf(await activeId(page));
  while (cur < target) {
    await next(page);
    cur++;
  }
  while (cur > target) {
    await prev(page);
    cur--;
  }
}

async function waitClip(page, state, timeout = 6000) {
  await page.waitForSelector(`${ACTIVE} [data-testid="clip"][data-clip-state="${state}"]`, { timeout });
}
const iframes = (page) => page.evaluate(() => document.querySelectorAll("iframe").length);
const face = (page) => page.evaluate((s) => document.querySelector(s).getAttribute("data-face"), ACTIVE);

/** Flip the active card with the keyboard and wait for the back. */
async function flip(page) {
  await page.keyboard.press("Space");
  await page.waitForFunction(
    (s) => document.querySelector(s)?.getAttribute("data-face") === "back",
    ACTIVE,
  );
}
async function flipAndPlay(page) {
  await flip(page);
  await waitClip(page, "playing");
}

const box = async (loc) => {
  const b = await loc.boundingBox();
  assert.ok(b, "element has a box");
  return b;
};
const navBox = (page) => box(page.locator('nav[aria-label="Primary"]'));

async function openSavedRow(page, id) {
  await page.locator(`[data-testid="saved-row"][data-card-id="${id}"]:visible`).click();
  await page.waitForSelector('[data-testid="card-detail"]');
}

// =====================================================================
// Console health on both routes
// =====================================================================
for (const route of ["/", "/saved"]) {
  test(`CONSOLE ${route}: no console errors, no hydration warnings`, async () => {
    const { page, logs } = await open({ route, saved: ["c01", "c03"], device: PHONE });
    if (route === "/saved") await page.waitForSelector('[data-testid="saved-row"]');
    await page.waitForTimeout(500);
    assert.deepEqual(logs, []);
    assert.ok(!logs.some((l) => /hydrat/i.test(l)));
  });
}

// =====================================================================
// Navigation
// =====================================================================
test("N-5 nav never moves (scroll, flip), stays on top and clickable", async () => {
  for (const device of [PHONE, DESKTOP]) {
    const { page } = await open({ device });
    await startHealthy(page, 3);
    const start = await navBox(page);
    for (let i = 0; i < 3; i++) await next(page);
    await flipAndPlay(page);
    const after = await navBox(page);
    assert.deepEqual(after, start);
    const onTop = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Primary"]');
      const r = nav.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return nav.contains(hit);
    });
    assert.ok(onTop, "nav is the top element at its centre");
    await page.getByRole("link", { name: "Saved" }).click();
    await page.waitForURL("**/saved");
    assert.deepEqual(await navBox(page), start);
  }
});

test("N-6 feed state survives a visit to Saved", async () => {
  const { page } = await open({ device: PHONE });
  await startHealthy(page, 2);
  await next(page);
  await flip(page);
  await next(page);
  const order = await domOrder(page);
  const active = await activeId(page);
  const before = await faces(page);
  await page.getByRole("link", { name: "Saved" }).click();
  await page.waitForURL("**/saved");
  await page.getByRole("link", { name: "Feed" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await page.waitForSelector(`${ACTIVE}`);
  await settled(page);
  assert.equal(await activeId(page), active);
  assert.deepEqual(await faces(page), before);
  assert.deepEqual(await domOrder(page), order);
});

test("FD-11 returning from Saved shows the same card snapped", async () => {
  const { page } = await open({ device: PHONE });
  await next(page);
  await next(page);
  const active = await activeId(page);
  await page.getByRole("link", { name: "Saved" }).click();
  await page.waitForURL("**/saved");
  await page.getByRole("link", { name: "Feed" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await settled(page);
  assert.equal(await activeId(page), active);
  const rem = await scrollRem(page);
  assert.ok(rem <= 1 || rem >= 843, `scrollTop % innerHeight was ${rem}`);
});

// =====================================================================
// Feed scrolling (lead-authorised fix (a): one gesture, one card)
// =====================================================================
test("FD-2 one deliberate wheel gesture moves exactly one card (desktop)", async () => {
  const { page } = await open({ device: DESKTOP });
  const order = await domOrder(page);
  const from = order.indexOf(await activeId(page));
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(1200);
  await settled(page);
  const to = order.indexOf(await activeId(page));
  assert.equal(to - from, 1);
  const rem = await scrollRem(page);
  assert.ok(rem <= 1 || rem >= 899);
});

test("FD-2 one touch swipe moves exactly one card (phone)", async () => {
  const { page, ctx } = await open({ device: PHONE });
  const order = await domOrder(page);
  const from = order.indexOf(await activeId(page));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 195, y: 700 }] });
  for (let i = 1; i <= 10; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 195, y: 700 - i * 60 }],
    });
    await page.waitForTimeout(8);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(1200);
  await settled(page);
  const to = order.indexOf(await activeId(page));
  assert.equal(to - from, 1);
});

// D-FEED-11: a wheel handler on fine pointers pages exactly one card per
// gesture, so a burst that Chromium would carry across cards stops at one.
test("FD-2x a 3000 px wheel burst moves exactly one card", async () => {
  const { page } = await open({ device: DESKTOP });
  const order = await domOrder(page);
  const from = order.indexOf(await activeId(page));
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(1200);
  await settled(page);
  const to = order.indexOf(await activeId(page));
  assert.equal(to - from, 1, `moved ${to - from} cards`);
});

test("FD-2x a single 120 px wheel notch moves exactly one card", async () => {
  const { page } = await open({ device: DESKTOP });
  const order = await domOrder(page);
  const from = order.indexOf(await activeId(page));
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(1200);
  await settled(page);
  const to = order.indexOf(await activeId(page));
  assert.equal(to - from, 1);
  const rem = await scrollRem(page);
  assert.ok(rem <= 1 || rem >= 899, `scrollTop % innerHeight was ${rem}`);
});

// =====================================================================
// Card back, clip and flip
// =====================================================================
test("FL-5 clicking the clip does not flip", async () => {
  const { page } = await open();
  await startHealthy(page, 0);
  await flipAndPlay(page);
  const clip = page.locator(`${ACTIVE} [data-testid="clip"]`);
  const b = await box(clip);
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(300);
  assert.equal(await face(page), "back");
});

test("CB-10 clip box is at least 200x200 at 360x640", async () => {
  const { page } = await open({ device: SMALL });
  await flip(page);
  const b = await box(page.locator(`${ACTIVE} [data-testid="clip"]`));
  assert.ok(b.width >= 200 && b.height >= 200, `${b.width}x${b.height}`);
});

test("CL-1 no player on the front; one appears after the flip", async () => {
  const { page } = await open();
  await startHealthy(page, 0);
  await page.waitForTimeout(500);
  assert.equal(await iframes(page), 0);
  assert.equal(await page.evaluate(() => (window.__yt ? window.__yt.players.length : 0)), 0);
  await flip(page);
  await waitClip(page, "playing");
  assert.equal(await page.locator(`${ACTIVE} iframe`).count(), 1);
  assert.equal(await iframes(page), 1);
});

test("CL-2 player options and iframe src carry the right parameters", async () => {
  const { page } = await open();
  await startHealthy(page, 0);
  await flipAndPlay(page);
  const id = await activeId(page);
  const card = CARDS.find((c) => c.id === id);
  const src = await page.locator(`${ACTIVE} iframe`).getAttribute("src");
  assert.ok(
    src.startsWith(`https://www.youtube-nocookie.com/embed/${card.youtubeId}`),
    src,
  );
  const q = new URL(src).searchParams;
  for (const [k, v] of Object.entries({
    autoplay: "1",
    mute: "1",
    controls: "0",
    playsinline: "1",
    cc_load_policy: "1",
    rel: "0",
    start: String(card.start),
    end: String(card.end),
  })) {
    assert.equal(q.get(k), v, `param ${k}`);
  }
  const opts = await page.evaluate(() => window.__yt.players[0].options);
  assert.equal(opts.videoId, card.youtubeId);
  assert.match(String(opts.host), /youtube-nocookie\.com/);
});

test("CL-6 never more than one player or iframe", async () => {
  const { page } = await open();
  await startHealthy(page, 2);
  await flipAndPlay(page);
  await next(page);
  await flipAndPlay(page);
  await next(page);
  await flipAndPlay(page);
  await prev(page);
  await waitClip(page, "playing");
  await prev(page);
  await waitClip(page, "playing");
  const max = await page.evaluate(() => window.__max);
  assert.ok(max.iframes <= 1, `max iframes ${max.iframes}`);
  assert.ok(max.live <= 1, `max live players ${max.live}`);
  assert.ok(max.iframes >= 1);
});

test("CL-7 scrolling away destroys the player", async () => {
  const { page } = await open();
  await startHealthy(page, 1);
  await flipAndPlay(page);
  await next(page);
  await page.waitForTimeout(300);
  assert.equal(await iframes(page), 0);
  const destroyed = await page.evaluate(() =>
    window.__yt.calls.some((c) => c.player === 0 && c.name === "destroy"),
  );
  assert.ok(destroyed);
});

test("CL-8 flipping back destroys the player", async () => {
  const { page } = await open();
  await startHealthy(page, 0);
  await flipAndPlay(page);
  await page.keyboard.press("Space");
  await page.waitForFunction((s) => document.querySelector(s).getAttribute("data-face") === "front", ACTIVE);
  await page.waitForTimeout(300);
  assert.equal(await iframes(page), 0);
});

test("CL-9 a flipped card plays again when it becomes active", async () => {
  const { page } = await open();
  await startHealthy(page, 1);
  await flipAndPlay(page);
  const first = await activeId(page);
  await next(page);
  await prev(page);
  assert.equal(await activeId(page), first);
  await waitClip(page, "playing");
  assert.equal(await iframes(page), 1);
});

test("CL-10 leaving the feed destroys the player; returning recreates it", async () => {
  const { page } = await open();
  await startHealthy(page, 0);
  await flipAndPlay(page);
  await page.getByRole("link", { name: "Saved" }).click();
  await page.waitForURL("**/saved");
  await page.waitForTimeout(400);
  assert.equal(await page.locator("iframe:visible").count(), 0);
  assert.equal(await iframes(page), 0);
  await page.getByRole("link", { name: "Feed" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await waitClip(page, "playing");
  assert.equal(await iframes(page), 1);
});

test("CL-15 broken clip shows the fallback and keeps the text", async () => {
  const { page } = await open();
  await goToCard(page, BROKEN);
  await flip(page);
  await waitClip(page, "error");
  const card = page.locator(ACTIVE);
  const fb = card.locator('[data-testid="clip-fallback"]');
  await fb.waitFor({ state: "visible" });
  assert.match(await fb.innerText(), /Clip unavailable/);
  assert.ok(await card.locator('[data-testid="exchange"]').isVisible());
  assert.ok(await card.locator('[data-testid="breakdown"]').isVisible());
  assert.equal(await iframes(page), 0);
  assert.ok(!(await card.locator('[data-testid="mute"]').isVisible()));
  assert.ok(await card.locator('[data-testid="heart"]').isVisible());
});

test("CL-16 fallback when the API script cannot load", async () => {
  const { page } = await open({ stub: false });
  await page.route("**/iframe_api", (r) => r.abort());
  await flip(page);
  await waitClip(page, "error", 10000);
  await page.locator(`${ACTIVE} [data-testid="clip-fallback"]`).waitFor({ state: "visible" });
});

test("CL-19 nothing overlaps the player", async () => {
  const { page } = await open();
  await startHealthy(page, 0);
  await flipAndPlay(page);
  // D-CLIP-13: the frame is rounded, so corner probes sit inside the curve:
  // inset by radius x (1 - 1/sqrt 2) + 4 px. Edge midpoints are probed too.
  const result = await page.evaluate((s) => {
    const f = document.querySelector(`${s} iframe`);
    const frame = document.querySelector(`${s} [data-testid="clip"]`);
    const radius = parseFloat(getComputedStyle(frame).borderTopLeftRadius) || 0;
    const d = radius * (1 - Math.SQRT1_2) + 4;
    const r = f.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const pts = [
      [cx, cy],
      [cx, r.top + 4],
      [cx, r.bottom - 4],
      [r.left + 4, cy],
      [r.right - 4, cy],
      [r.left + d, r.top + d],
      [r.right - d, r.top + d],
      [r.left + d, r.bottom - d],
      [r.right - d, r.bottom - d],
    ];
    return { radius, hits: pts.map(([x, y]) => document.elementFromPoint(x, y) === f) };
  }, ACTIVE);
  assert.ok(result.radius >= 20, `clip radius ${result.radius}`);
  assert.deepEqual(result.hits, Array(9).fill(true));
});

test("CL-20 shortcuts still work after clicking inside the clip", async () => {
  const { page } = await open();
  await startHealthy(page, 1);
  await flipAndPlay(page);
  const before = await activeId(page);
  const b = await box(page.locator(`${ACTIVE} [data-testid="clip"]`));
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(200);
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(
    ({ s, before }) => document.querySelector(s)?.getAttribute("data-card-id") !== before,
    { s: ACTIVE, before },
    { timeout: 4000 },
  );
});

// =====================================================================
// Keyboard
// =====================================================================
test("KB-4 M mutes on the back only and not in the error state", async () => {
  const { page } = await open();
  await startHealthy(page, 0);
  const muted = () =>
    page.evaluate((s) => document.querySelector(`${s} [data-testid="mute"]`).getAttribute("data-muted"), ACTIVE);
  await page.keyboard.press("m");
  assert.equal(await muted(), "true", "no effect on the front");
  await flipAndPlay(page);
  await page.keyboard.press("m");
  await page.waitForFunction(
    (s) => document.querySelector(`${s} [data-testid="mute"]`).getAttribute("data-muted") === "false",
    ACTIVE,
  );
  await page.keyboard.press("m");
  await page.waitForFunction(
    (s) => document.querySelector(`${s} [data-testid="mute"]`).getAttribute("data-muted") === "true",
    ACTIVE,
  );
  await goToCard(page, BROKEN);
  await flip(page);
  await waitClip(page, "error");
  await page.keyboard.press("m");
  await page.waitForTimeout(300);
  assert.equal(await muted(), "true", "no effect in the error state");
});

// =====================================================================
// Saving
// =====================================================================
test("SV-3 a save survives a reload and shows on Saved", async () => {
  const { page } = await open();
  await startHealthy(page, 0);
  await flipAndPlay(page);
  const id = await activeId(page);
  await page.locator(`${ACTIVE} [data-testid="heart"]`).click();
  assert.equal(
    await page.locator(`${ACTIVE} [data-testid="heart"]`).getAttribute("aria-pressed"),
    "true",
  );
  await page.reload();
  await page.waitForSelector('[data-testid="feed"][data-ready="true"]');
  await goToCard(page, id);
  await flip(page);
  assert.equal(
    await page.locator(`${ACTIVE} [data-testid="heart"]`).getAttribute("aria-pressed"),
    "true",
  );
  await page.getByRole("link", { name: "Saved" }).click();
  await page.waitForURL("**/saved");
  await page.locator(`[data-testid="saved-row"][data-card-id="${id}"]:visible`).waitFor();
});

test("SV-9 announcements: live region text, no toast (feed and Saved detail)", async () => {
  const { page } = await open({ saved: ["c01", "c02"] });
  await flip(page);
  await page.locator(`${ACTIVE} [data-testid="heart"]`).click();
  await page.waitForFunction(() =>
    [...document.querySelectorAll('[data-testid="live"]')].some((e) => /Saved|Removed from saved/.test(e.textContent)),
  );
  assert.equal(await page.locator("[data-sonner-toast]").count(), 0);
  // Saved detail (phone sheet): unsave announces too.
  const m = await open({ device: PHONE, route: "/saved", saved: ["c01", "c02"] });
  await openSavedRow(m.page, "c01");
  await m.page.locator('[data-testid="card-detail"] [data-testid="heart"]').click();
  await m.page.waitForFunction(() =>
    [...document.querySelectorAll('[data-testid="live"]')].some((e) => /Removed from saved/.test(e.textContent)),
  );
});

test("SL-16 the search query survives a visit to the feed", async () => {
  const { page } = await open({ device: DESKTOP, route: "/saved", saved: ["c01", "c03", "c05"] });
  const search = page.getByRole("searchbox", { name: "Search saved" });
  await search.fill("horse");
  assert.equal(await page.locator('[data-testid="saved-row"]:visible').count(), 1);
  await page.getByRole("link", { name: "Feed" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await page.getByRole("link", { name: "Saved" }).click();
  await page.waitForURL("**/saved");
  assert.equal(await page.getByRole("searchbox", { name: "Search saved" }).inputValue(), "horse");
  assert.equal(await page.locator('[data-testid="saved-row"]:visible').count(), 1);
});

// =====================================================================
// Card detail
// =====================================================================
test("OV-1 tapping a row opens the full card in a sheet", async () => {
  const { page } = await open({ device: PHONE, route: "/saved", saved: ["c01", "c02"] });
  const card = CARDS.find((c) => c.id === "c01");
  await openSavedRow(page, "c01");
  const dialog = page.getByRole("dialog", { name: card.cue });
  await dialog.waitFor({ state: "visible" });
  const detail = dialog.locator('[data-testid="card-detail"]');
  assert.equal(await detail.getAttribute("data-mode"), "sheet");
  assert.equal(await detail.getAttribute("data-card-id"), "c01");
  for (const hook of ["move", "exchange", "trigger", "response", "breakdown", "clip", "heart", "mute"]) {
    assert.ok(await detail.locator(`[data-testid="${hook}"]`).first().isVisible(), hook);
  }
  assert.ok(await dialog.getByRole("button", { name: "Close" }).isVisible());
  assert.match(await detail.innerText(), new RegExp(card.cue));
  assert.equal(await page.evaluate(() => location.search), "?card=c01");
  const h = (await box(dialog)).height;
  assert.ok(h <= 0.92 * 844 + 1, `sheet height ${h}`);
});

test("OV-6 the clip plays in the detail and closing destroys it", async () => {
  const { page } = await open({ device: PHONE, route: "/saved", saved: ["c01"] });
  await openSavedRow(page, "c01");
  await page.waitForSelector('[data-testid="card-detail"] [data-testid="clip"][data-clip-state="playing"]');
  assert.equal(await iframes(page), 1);
  await page.getByRole("button", { name: "Close" }).click();
  await page.waitForFunction(() => document.querySelectorAll("iframe").length === 0);
});

test("OV-7 unsave from the detail keeps it open; re-pressing re-saves", async () => {
  const { page } = await open({ device: PHONE, route: "/saved", saved: ["c01", "c02"] });
  const heart = page.locator('[data-testid="card-detail"] [data-testid="heart"]');
  await openSavedRow(page, "c01");
  await heart.click();
  assert.equal(await heart.getAttribute("aria-pressed"), "false");
  assert.ok(await page.locator('[data-testid="card-detail"]').isVisible());
  await page.getByRole("button", { name: "Close" }).click();
  await page.locator('[data-testid="card-detail"]').waitFor({ state: "detached" });
  assert.equal(await page.locator('[data-testid="saved-row"][data-card-id="c01"]').count(), 0);
  // Press twice: unsave then save again -> row stays.
  await openSavedRow(page, "c02");
  await heart.click();
  await heart.click();
  assert.equal(await heart.getAttribute("aria-pressed"), "true");
  await page.getByRole("button", { name: "Close" }).click();
  await page.locator('[data-testid="card-detail"]').waitFor({ state: "detached" });
  assert.equal(await page.locator('[data-testid="saved-row"][data-card-id="c02"]:visible').count(), 1);
});

test("OV-8 unsaving the last card shows the empty state after close", async () => {
  const { page } = await open({ device: PHONE, route: "/saved", saved: ["c01"] });
  await openSavedRow(page, "c01");
  await page.locator('[data-testid="card-detail"] [data-testid="heart"]').click();
  await page.getByRole("button", { name: "Close" }).click();
  await page.locator('[data-testid="saved-empty"]').waitFor({ state: "visible" });
});

test("OV-12 broken clip in the detail shows the fallback; text intact", async () => {
  const { page } = await open({ device: PHONE, route: "/saved", saved: [BROKEN] });
  await openSavedRow(page, BROKEN);
  const detail = page.locator('[data-testid="card-detail"]');
  await detail.locator('[data-testid="clip"][data-clip-state="error"]').waitFor();
  assert.match(await detail.locator('[data-testid="clip-fallback"]').innerText(), /Clip unavailable/);
  assert.ok(await detail.locator('[data-testid="exchange"]').isVisible());
  assert.ok(await detail.locator('[data-testid="breakdown"]').isVisible());
  assert.equal(await iframes(page), 0);
});

// =====================================================================
// Real API (no stub): sandbox videos all fail, D-TEST-5
// =====================================================================
test("REAL a flipped card reaches the error state with the fallback (no stub)", async () => {
  const { page } = await open({ stub: false });
  await flip(page);
  await waitClip(page, "error", 30000);
  await page.locator(`${ACTIVE} [data-testid="clip-fallback"]`).waitFor({ state: "visible" });
  assert.match(await page.locator(`${ACTIVE} [data-testid="clip-fallback"]`).innerText(), /Clip unavailable/);
});
