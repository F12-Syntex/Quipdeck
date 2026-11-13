/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/*
 * FEATURE_INVENTORY section 8: clip (CL-1 .. CL-21). CL-22 is MAN. CL-5,
 * CL-13 and CL-17 also have unit tests (src/lib/clip-controller.test.ts);
 * the PW halves run here against the stub (D-TEST-2). The one real-API test
 * at the end needs no stub (sandbox videos all end in error 150, F4).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const h = require("./support/harness.cjs").create(test);

const act = (page, sel) => page.locator(`${h.ACTIVE} ${sel}`);
const mutedAttr = (page) =>
  page.evaluate((s) => document.querySelector(`${s} [data-testid="mute"]`).getAttribute("data-muted"), h.ACTIVE);
const waitMuted = (page, value) =>
  page.waitForFunction(
    ({ s, value }) => document.querySelector(`${s} [data-testid="mute"]`)?.getAttribute("data-muted") === value,
    { s: h.ACTIVE, value },
  );

test("CL-1 no player on the front; one appears after the flip", async () => {
  const { page } = await h.open();
  await h.startHealthy(page, 0);
  await h.frame(page);
  assert.equal(await h.iframes(page), 0);
  assert.equal(await page.evaluate(() => (window.__yt ? window.__yt.players.length : 0)), 0);
  await h.flip(page);
  await h.waitClip(page, "playing");
  assert.equal(await page.locator(`${h.ACTIVE} iframe`).count(), 1);
  assert.equal(await h.iframes(page), 1);
});

test("CL-2 player options and iframe src carry the right parameters", async () => {
  const { page } = await h.open();
  await h.startHealthy(page, 0);
  await h.flipAndPlay(page);
  const card = h.card(await h.activeId(page));
  const src = await page.locator(`${h.ACTIVE} iframe`).getAttribute("src");
  assert.ok(src.startsWith(`https://www.youtube-nocookie.com/embed/${card.clip.youtubeId}`), src);
  const q = new URL(src).searchParams;
  for (const [k, v] of Object.entries({
    autoplay: "1",
    mute: "1",
    controls: "0",
    playsinline: "1",
    cc_load_policy: "1",
    rel: "0",
    start: String(card.clip.start),
    end: String(card.clip.end),
  })) {
    assert.equal(q.get(k), v, `param ${k}`);
  }
  const opts = await page.evaluate(() => window.__yt.players[0].options);
  assert.equal(opts.videoId, card.clip.youtubeId);
  assert.match(String(opts.host), /youtube-nocookie\.com/);
  assert.ok(
    (await page.locator(`${h.ACTIVE} iframe`).getAttribute("title")),
    "the iframe has a title",
  );
});

test("CL-3 the first player of a visit is muted and playing", async () => {
  const { page } = await h.open();
  await h.startHealthy(page, 0);
  await h.flipAndPlay(page);
  assert.equal(await mutedAttr(page), "true");
  const p = await page.evaluate(() => ({ muted: window.__yt.players[0].muted, state: window.__yt.players[0].state }));
  assert.deepEqual(p, { muted: true, state: 1 });
});

test("CL-4 captions are requested (cc_load_policy=1)", async () => {
  const { page } = await h.open();
  await h.startHealthy(page, 0);
  await h.flipAndPlay(page);
  const vars = await page.evaluate(() => window.__yt.players[0].options.playerVars);
  assert.equal(String(vars.cc_load_policy), "1");
});

test("CL-5 the clip loops: past the end the player seeks back to start and keeps playing", async () => {
  const { page } = await h.open();
  await h.startHealthy(page, 0);
  await h.flipAndPlay(page);
  const { start, end } = h.card(await h.activeId(page)).clip;
  const seeksBefore = (await h.ytCalls(page, 0, "seekTo")).length;
  await page.evaluate((span) => window.__yt.advance(span), end - start + 2);
  await page.waitForFunction(
    ({ before, start }) =>
      window.__yt.calls.filter((c) => c.player === 0 && c.name === "seekTo" && Number(c.args[0]) === start).length > before,
    { before: seeksBefore, start },
    { timeout: 5000 },
  );
  await h.waitClip(page, "playing");
});

test("CL-6 never more than one player or iframe", async () => {
  const { page } = await h.open();
  await h.startHealthy(page, 2);
  await h.flipAndPlay(page);
  await h.next(page);
  await h.flipAndPlay(page);
  await h.next(page);
  await h.flipAndPlay(page);
  await h.prev(page);
  await h.waitClip(page, "playing");
  await h.prev(page);
  await h.waitClip(page, "playing");
  const max = await page.evaluate(() => window.__max);
  assert.ok(max.iframes <= 1, `max iframes ${max.iframes}`);
  assert.ok(max.live <= 1, `max live players ${max.live}`);
  assert.ok(max.iframes >= 1);
});

test("CL-7 scrolling away destroys the player", async () => {
  const { page } = await h.open();
  await h.startHealthy(page, 1);
  await h.flipAndPlay(page);
  await h.next(page);
  await page.waitForFunction(() => document.querySelectorAll("iframe").length === 0);
  assert.ok((await h.ytCalls(page, 0, "destroy")).length >= 1, "destroy called on player 0");
});

test("CL-8 flipping back destroys the player", async () => {
  const { page } = await h.open();
  await h.startHealthy(page, 0);
  await h.flipAndPlay(page);
  await h.unflip(page);
  await page.waitForFunction(() => document.querySelectorAll("iframe").length === 0);
});

test("CL-9 a flipped card plays again when it becomes active", async () => {
  const { page } = await h.open();
  await h.startHealthy(page, 1);
  await h.flipAndPlay(page);
  const first = await h.activeId(page);
  await h.next(page);
  await h.prev(page);
  assert.equal(await h.activeId(page), first);
  await h.waitClip(page, "playing");
  assert.equal(await h.iframes(page), 1);
});

test("CL-10 leaving the feed destroys the player; returning recreates it", async () => {
  const { page } = await h.open();
  await h.startHealthy(page, 0);
  await h.flipAndPlay(page);
  await page.getByRole("link", { name: "Saved" }).click();
  await page.waitForURL("**/saved");
  await page.waitForFunction(() => document.querySelectorAll("iframe").length === 0);
  assert.equal(await page.locator("iframe:visible").count(), 0);
  await page.getByRole("link", { name: "Feed" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await h.waitClip(page, "playing");
  assert.equal(await h.iframes(page), 1);
});

test("CL-11 the mute button toggles sound and its own label", async () => {
  const { page } = await h.open();
  await h.startHealthy(page, 0);
  await h.flipAndPlay(page);
  const mute = act(page, '[data-testid="mute"]');
  assert.equal(await mute.getAttribute("aria-label"), "Unmute");
  await mute.click();
  await waitMuted(page, "false");
  assert.equal(await mute.getAttribute("aria-label"), "Mute");
  await page.waitForFunction(() => window.__yt.calls.some((c) => c.name === "unMute"));
  await mute.click();
  await waitMuted(page, "true");
  assert.equal(await mute.getAttribute("aria-label"), "Unmute");
  await page.waitForFunction(() => window.__yt.calls.some((c) => c.name === "mute"));
});

test("CL-12 unmute persists for the visit: next card and the Saved detail", async () => {
  const { page } = await h.open({ device: h.PHONE, saved: ["c01", "c02"] });
  await h.startHealthy(page, 1);
  await h.flipAndPlay(page);
  await act(page, '[data-testid="mute"]').click();
  await waitMuted(page, "false");
  await h.next(page);
  await h.flip(page);
  await h.waitClip(page, "playing");
  await waitMuted(page, "false");
  assert.ok((await h.ytCalls(page, 1, "unMute")).length >= 1, "player 2 was unmuted");
  await page.getByRole("link", { name: "Saved" }).click();
  await page.waitForURL("**/saved");
  await h.openSavedRow(page, "c01");
  const detail = page.locator('[data-testid="card-detail"]');
  await detail.locator('[data-testid="clip"][data-clip-state="playing"]').waitFor();
  assert.equal(await detail.locator('[data-testid="mute"]').getAttribute("data-muted"), "false");
});

test("CL-13 blocked unmute degrades honestly: playing, still muted", async () => {
  const { page } = await h.open({ stubConfig: { blockUnmute: true } });
  await h.startHealthy(page, 0);
  await h.flipAndPlay(page);
  await act(page, '[data-testid="mute"]').click();
  await page.waitForFunction(() => window.__yt.calls.some((c) => c.name === "unMute"));
  await h.waitClip(page, "playing");
  assert.equal(await mutedAttr(page), "true");
  assert.equal(await act(page, '[data-testid="mute"]').getAttribute("aria-label"), "Unmute");
});

test("CL-14 loading state: loading, then playing, with a constant clip box", async () => {
  const { page } = await h.open({ stubConfig: { readyDelayMs: 1200 } });
  await h.startHealthy(page, 0);
  await h.flip(page);
  await h.waitClip(page, "loading");
  const during = await h.box(act(page, '[data-testid="clip"]'));
  await h.waitClip(page, "playing");
  const after = await h.box(act(page, '[data-testid="clip"]'));
  assert.deepEqual(after, during);
});

test("CL-15 a broken clip shows the fallback and keeps the text", async () => {
  const { page } = await h.open();
  await h.goToCard(page, h.BROKEN);
  await h.flip(page);
  await h.waitClip(page, "error");
  const card = page.locator(h.ACTIVE);
  const fb = card.locator('[data-testid="clip-fallback"]');
  await fb.waitFor({ state: "visible" });
  assert.match(await fb.innerText(), /Clip unavailable/);
  assert.ok(await card.locator('[data-testid="exchange"]').isVisible());
  assert.ok(await card.locator('[data-testid="breakdown"]').isVisible());
  assert.equal(await h.iframes(page), 0);
  assert.ok(!(await card.locator('[data-testid="mute"]').isVisible()));
  assert.ok(await card.locator('[data-testid="heart"]').isVisible());
});

test("CL-16 fallback when the API script cannot load", async () => {
  const { page } = await h.open({ stub: false });
  await page.route("**/iframe_api", (r) => r.abort());
  await h.flip(page);
  await h.waitClip(page, "error", 15000);
  await act(page, '[data-testid="clip-fallback"]').waitFor({ state: "visible" });
});

test("CL-17 fallback on timeout: ready never fires, error within about 8 s", async () => {
  const { page } = await h.open({ stubConfig: { neverReady: true } });
  await h.startHealthy(page, 0);
  const t0 = Date.now();
  await h.flip(page);
  await h.waitClip(page, "loading");
  await h.waitClip(page, "error", 14000);
  const took = Date.now() - t0;
  assert.ok(took <= 12000, `error after ${took} ms`);
  await act(page, '[data-testid="clip-fallback"]').waitFor({ state: "visible" });
});

test("CL-18 the fallback keeps the layout: clip box and heart do not move", async () => {
  const { page } = await h.open({ stubConfig: { neverReady: true } });
  await h.startHealthy(page, 0);
  await h.flip(page);
  await h.waitClip(page, "loading");
  const clip = await h.box(act(page, '[data-testid="clip"]'));
  const heart = await h.box(act(page, '[data-testid="heart"]'));
  await h.waitClip(page, "error", 14000);
  const clip2 = await h.box(act(page, '[data-testid="clip"]'));
  const heart2 = await h.box(act(page, '[data-testid="heart"]'));
  assert.deepEqual(clip2, clip);
  assert.deepEqual(heart2, heart);
});

test("CL-19 nothing overlaps the player", async () => {
  const { page } = await h.open();
  await h.startHealthy(page, 0);
  await h.flipAndPlay(page);
  // D-CLIP-13: the frame is rounded, so corner probes sit inside the curve.
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
  }, h.ACTIVE);
  assert.ok(result.radius >= 20, `clip radius ${result.radius}`);
  assert.deepEqual(result.hits, Array(9).fill(true));
});

test("CL-20 shortcuts still work after clicking inside the clip", async () => {
  const { page } = await h.open();
  await h.startHealthy(page, 1);
  await h.flipAndPlay(page);
  const before = await h.activeId(page);
  const b = await h.box(act(page, '[data-testid="clip"]'));
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await h.frame(page);
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(
    ({ s, before }) => document.querySelector(s)?.getAttribute("data-card-id") !== before,
    { s: h.ACTIVE, before },
    { timeout: 4000 },
  );
});

test("CL-21 privacy: only the API script before the first flip; embeds use nocookie", async () => {
  const { page, requests } = await h.open();
  await h.startHealthy(page, 0);
  await h.frame(page);
  const yt = /(youtube\.com|youtube-nocookie\.com|ytimg\.com|ggpht\.com|googlevideo\.com)/;
  const before = requests.filter((u) => yt.test(u) && !/\/iframe_api(\?|$)/.test(u));
  assert.deepEqual(before, [], "no YouTube host contacted before the first flip, apart from the API script");
  await h.flipAndPlay(page);
  // The stub frame paints from srcdoc, so assert on the embed URL the page built.
  const src = await page.locator(`${h.ACTIVE} iframe`).getAttribute("src");
  assert.match(src, /^https:\/\/www\.youtube-nocookie\.com\/embed\//);
  for (const u of requests.filter((x) => /\/embed\//.test(x))) {
    assert.match(u, /^https:\/\/www\.youtube-nocookie\.com\/embed\//, u);
  }
  assert.ok(!requests.some((u) => /youtube\.com\/embed/.test(u)));
  assert.ok(!requests.some((u) => /ytimg\.com/.test(u)));
});

// ---- Gate 4 add-on: the loading hue wash is visible while the stub stalls.
test("CL-14 (Gate 4) the hue wash shows while the clip is loading and the stub is stalled", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  const order = await h.domOrder(page);
  const id = order.find((x) => x !== h.BROKEN);
  const stalled = h.card(id).clip.youtubeId;
  await page.evaluate((ids) => {
    window.__ytStubConfig = { stallIds: ids };
  }, [stalled]);
  await h.goToCard(page, id);
  await h.flip(page);
  await h.waitClip(page, "loading");
  // The player is ready but never plays: wait until the stub reports BUFFERING.
  await page.waitForFunction(() => window.__yt.players.length > 0 && window.__yt.players[0].ready);
  const clip = act(page, '[data-testid="clip"]');
  const wash = act(page, '[data-testid="clip"] > div[aria-hidden="true"]:not(.skeleton-shimmer)').first();
  const style = await wash.evaluate((e) => {
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    return { bg: cs.backgroundImage, opacity: cs.opacity, w: r.width, h: r.height };
  });
  assert.match(style.bg, /radial-gradient/);
  assert.ok(Number(style.opacity) > 0 && style.w > 100 && style.h > 100, JSON.stringify(style));
  assert.equal(await clip.getAttribute("data-clip-state"), "loading", "still loading (stalled)");
  // Pixels: with the wash hidden the clip looks different.
  const withWash = await clip.screenshot({ animations: "disabled" });
  await wash.evaluate((e) => (e.style.display = "none"));
  const without = await clip.screenshot({ animations: "disabled" });
  const diff = await h.pixelDiff(withWash, without);
  assert.ok(diff > 2, `mean pixel difference with vs without the wash is ${diff.toFixed(2)}`);
  assert.equal(await clip.getAttribute("data-clip-state"), "loading");
});

// Real API (no stub): every sandbox video ends in error 150 (F4, D-TEST-5).
test("REAL a flipped card reaches the error state with the fallback (no stub)", async () => {
  const { page } = await h.open({ stub: false });
  await h.flip(page);
  await h.waitClip(page, "error", 30000);
  await act(page, '[data-testid="clip-fallback"]').waitFor({ state: "visible" });
  assert.match(await act(page, '[data-testid="clip-fallback"]').innerText(), /Clip unavailable/);
});
