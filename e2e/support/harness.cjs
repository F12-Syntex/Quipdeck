/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/*
 * Shared e2e harness (P5-1). Every e2e/*.test.cjs file does
 *
 *   const h = require("./support/harness.cjs").create(test);
 *
 * which registers the before/after hooks (server + browser) and returns the
 * helpers. Conventions:
 *   - waits are on state (data-* attributes, scroll position, stub registry),
 *     never on a fixed sleep, except where a test asserts that nothing
 *     happens (then it waits a named settle time);
 *   - every locator is visibility-scoped (D-TEST-4): the feed stays in the
 *     DOM, hidden, while Saved is shown;
 *   - navigation by key is order-aware: it moves toward the target in either
 *     direction (see `goToCard`, the KB-4 fix).
 */
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const { startServer } = require("./server.cjs");

const STUB = path.join(__dirname, "yt-stub.js");
const CONTENT = path.join(__dirname, "..", "..", "src", "content");

const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const SMALL = { viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true };
const TINY = { viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true };
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const DESKTOP_SMALL = { viewport: { width: 1024, height: 768 } };

const BROKEN = "c14";
const SAVED_KEY = "quipdeck:saved:v1";
const ACTIVE = '[data-testid="card"][data-active="true"]';
const FEED_READY = '[data-testid="feed"][data-ready="true"]';

function create(test) {
  const state = { server: null, browser: null, content: null, opened: [] };

  test.before(async () => {
    state.content = {
      cards: (await import(pathToFileURL(path.join(CONTENT, "cards.ts")).href)).cards,
      moves: (await import(pathToFileURL(path.join(CONTENT, "moves.ts")).href)).moves,
    };
    state.server = await startServer();
    state.browser = await chromium.launch();
  });
  test.after(async () => {
    if (state.browser) await state.browser.close();
    if (state.server) await state.server.stop();
  });
  test.afterEach(async () => {
    while (state.opened.length) await state.opened.pop().close().catch(() => {});
  });

  const h = {
    PHONE, SMALL, TINY, DESKTOP, DESKTOP_SMALL, BROKEN, SAVED_KEY, ACTIVE, FEED_READY, STUB,
    get url() {
      return state.server.url;
    },
    get browser() {
      return state.browser;
    },
    get CARDS() {
      return state.content.cards;
    },
    get MOVES() {
      return state.content.moves;
    },
    card: (id) => {
      const c = state.content.cards.find((x) => x.id === id);
      assert.ok(c, "card " + id);
      return c;
    },
    moveLabel: (id) => state.content.moves.find((m) => m.id === id).label,
  };

  /**
   * Open a page.
   *   device         context options (default DESKTOP)
   *   route          "/" default; the feed is awaited when route is "/"
   *   saved          ids seeded into localStorage once per context
   *   stub           false: leave the real IFrame API alone
   *   stubConfig     window.__ytStubConfig
   *   reducedMotion  "reduce" | "no-preference" (default)
   *   colorScheme    context colorScheme
   *   seed           pin the visit shuffle (crypto.getRandomValues) to a value
   *   init           extra init script function (runs before the page scripts)
   *   javaScriptEnabled  false for the no-JS HTML checks
   *   wait           false: do not await the feed
   */
  h.open = async (opts = {}) => {
    const ctx = await state.browser.newContext({
      ...(opts.device || DESKTOP),
      reducedMotion: opts.reducedMotion || "no-preference",
      ...(opts.colorScheme ? { colorScheme: opts.colorScheme } : {}),
      ...(opts.javaScriptEnabled === false ? { javaScriptEnabled: false } : {}),
    });
    state.opened.push(ctx);
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
      await page.route("**/iframe_api", (r) => r.fulfill({ path: STUB, contentType: "text/javascript" }));
    }
    if (opts.javaScriptEnabled !== false) {
      await page.addInitScript(
        ({ config, saved, seed, key }) => {
          window.__ytStubConfig = config;
          if (saved && !sessionStorage.getItem("__seeded")) {
            localStorage.setItem(key, JSON.stringify(saved));
            sessionStorage.setItem("__seeded", "1");
          }
          if (seed !== undefined && seed !== null) {
            const real = crypto.getRandomValues.bind(crypto);
            crypto.getRandomValues = (arr) =>
              arr instanceof Uint32Array && arr.length === 1 ? ((arr[0] = seed), arr) : real(arr);
          }
          // Sample the most iframes / live stub players ever seen (CL-6).
          window.__max = { iframes: 0, live: 0 };
          setInterval(() => {
            const n = document.querySelectorAll("iframe").length;
            const l = window.__yt && window.__yt.live ? window.__yt.live() : 0;
            if (n > window.__max.iframes) window.__max.iframes = n;
            if (l > window.__max.live) window.__max.live = l;
          }, 20);
        },
        { config: opts.stubConfig || {}, saved: opts.saved, seed: opts.seed, key: SAVED_KEY },
      );
    }
    if (opts.init) await page.addInitScript(opts.init, opts.initArg);
    const route = opts.route || "/";
    const response = await page.goto(h.url + route);
    if (opts.wait !== false && opts.javaScriptEnabled !== false && route === "/") {
      await page.waitForSelector(FEED_READY);
      await page.waitForSelector(ACTIVE);
    }
    return { page, ctx, logs, requests, response };
  };

  // ---------------------------------------------------------------- reads
  h.activeId = (page) =>
    page.evaluate((s) => document.querySelector(s)?.getAttribute("data-card-id") ?? null, ACTIVE);
  h.domOrder = (page) =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="feed"] [data-testid="card"]')].map((c) =>
        c.getAttribute("data-card-id"),
      ),
    );
  h.faces = (page) =>
    page.evaluate(() =>
      Object.fromEntries(
        [...document.querySelectorAll('[data-testid="feed"] [data-testid="card"]')].map((c) => [
          c.getAttribute("data-card-id"),
          c.getAttribute("data-face"),
        ]),
      ),
    );
  h.face = (page) => page.evaluate((s) => document.querySelector(s).getAttribute("data-face"), ACTIVE);
  h.scrollRem = (page) =>
    page.evaluate(() => document.querySelector('[data-testid="feed"]').scrollTop % window.innerHeight);
  h.iframes = (page) => page.evaluate(() => document.querySelectorAll("iframe").length);
  h.box = async (loc) => {
    const b = await loc.boundingBox();
    assert.ok(b, "element has a box");
    return b;
  };
  h.navBox = (page) => h.box(page.locator('nav[aria-label="Primary"]'));
  h.ytCalls = (page, player, name) =>
    page.evaluate(
      ({ player, name }) =>
        window.__yt.calls.filter((c) => (player === undefined || c.player === player) && (!name || c.name === name)),
      { player, name },
    );
  h.storage = (page) =>
    page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), SAVED_KEY);

  /** Two animation frames: lets React commit and the browser paint. */
  h.frame = (page) =>
    page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));

  // ---------------------------------------------------------- feed waits
  /** Wait until the feed scroller has stopped on the active card's slide. */
  h.settled = async (page) => {
    await page.evaluate(() => {
      window.__lastScroll = undefined;
    });
    await page.waitForFunction(
      () => {
        const f = document.querySelector('[data-testid="feed"]');
        const c = document.querySelector('[data-testid="card"][data-active="true"]');
        const s = c && c.closest("[data-slide-id]");
        if (!f || !s) return false;
        const now = f.scrollTop;
        const prev = window.__lastScroll;
        window.__lastScroll = now;
        return Math.abs(now - s.offsetTop) <= 1 && prev === now;
      },
      null,
      { polling: 100, timeout: 8000 },
    );
  };

  /** Press a navigation key and wait for the next card to be active and settled. */
  h.step = async (page, key) => {
    const before = await h.activeId(page);
    await page.keyboard.press(key);
    await page.waitForFunction(
      ({ s, before }) => document.querySelector(s)?.getAttribute("data-card-id") !== before,
      { s: ACTIVE, before },
      { timeout: 5000 },
    );
    await h.settled(page);
    return h.activeId(page);
  };
  h.next = (page) => h.step(page, "ArrowDown");
  h.prev = (page) => h.step(page, "ArrowUp");

  /**
   * Move to card `id` in either direction. (KB-4 root cause: the old helper
   * only pressed ArrowDown, so when the target sat earlier in the shuffled
   * deck than the current card it ran off the end, pressed a key that had no
   * effect, and timed out waiting for an active card that never changed.)
   */
  h.goToCard = async (page, id) => {
    const order = await h.domOrder(page);
    const to = order.indexOf(id);
    assert.ok(to >= 0, `${id} is in the deck`);
    const at = order.indexOf(await h.activeId(page));
    if (at !== to) {
      // One burst of presses in the right direction (the feed counts presses
      // made while it is still scrolling), then wait on state.
      const key = at < to ? "ArrowDown" : "ArrowUp";
      for (let i = 0; i < Math.abs(to - at); i++) await page.keyboard.press(key);
      await page.waitForFunction(
        ({ s, id }) => document.querySelector(s)?.getAttribute("data-card-id") === id,
        { s: ACTIVE, id },
        { timeout: 8000 },
      );
    }
    await h.settled(page);
  };

  /** Move to the card at DOM index `index`. */
  h.goToIndex = async (page, index) => {
    const order = await h.domOrder(page);
    await h.goToCard(page, order[index]);
  };

  /**
   * Move to a start card such that it and the next `span` cards are healthy
   * (none is the broken clip). Picks the nearest such card.
   */
  h.startHealthy = async (page, span = 0) => {
    const order = await h.domOrder(page);
    const bad = order.indexOf(BROKEN);
    let target = 0;
    while (target + span >= order.length || (bad >= target && bad <= target + span)) target++;
    await h.goToCard(page, order[target]);
    return order[target];
  };

  h.waitClip = (page, st, timeout = 8000) =>
    page.waitForSelector(`${ACTIVE} [data-testid="clip"][data-clip-state="${st}"]`, { timeout });

  /** Flip the active card with the keyboard and wait for the back. */
  h.flip = async (page) => {
    await page.keyboard.press("Space");
    await page.waitForFunction((s) => document.querySelector(s)?.getAttribute("data-face") === "back", ACTIVE);
  };
  h.unflip = async (page) => {
    await page.keyboard.press("Space");
    await page.waitForFunction((s) => document.querySelector(s)?.getAttribute("data-face") === "front", ACTIVE);
  };
  h.flipAndPlay = async (page) => {
    await h.flip(page);
    await h.waitClip(page, "playing");
  };

  // ------------------------------------------------------------- saved
  h.openSavedRow = async (page, id) => {
    await page.locator(`[data-testid="saved-row"][data-card-id="${id}"]:visible`).click();
    await page.waitForSelector('[data-testid="card-detail"]');
  };
  h.rowIds = (page) =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="saved-row"]')]
        .filter((e) => e.getClientRects().length > 0)
        .map((e) => e.getAttribute("data-card-id")),
    );

  // ------------------------------------------------------------ gestures
  /** A touch drag by CDP: from (x, y) by dy over `steps` moves. */
  h.touchDrag = async (page, ctx, { x, y, dy, steps = 10, delay = 8 }) => {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= steps; i++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y + (dy * i) / steps }],
      });
      await page.waitForTimeout(delay);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await cdp.detach().catch(() => {});
  };

  /** Pixel difference between two PNG buffers, via a canvas in a spare page. */
  h.pixelDiff = async (a, b) => {
    const ctx = await state.browser.newContext();
    state.opened.push(ctx);
    const page = await ctx.newPage();
    return page.evaluate(
      async ([a, b]) => {
        const load = (b64) =>
          new Promise((res, rej) => {
            const img = new Image();
            img.onload = () => res(img);
            img.onerror = rej;
            img.src = "data:image/png;base64," + b64;
          });
        const [ia, ib] = await Promise.all([load(a), load(b)]);
        const w = Math.min(ia.width, ib.width);
        const hgt = Math.min(ia.height, ib.height);
        const grab = (img) => {
          const c = document.createElement("canvas");
          c.width = w;
          c.height = hgt;
          const g = c.getContext("2d");
          g.drawImage(img, 0, 0);
          return g.getImageData(0, 0, w, hgt).data;
        };
        const da = grab(ia);
        const db = grab(ib);
        let sum = 0;
        for (let i = 0; i < da.length; i += 4) {
          sum += Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
        }
        return sum / (da.length / 4) / 3; // mean per-channel difference, 0 to 255
      },
      [a.toString("base64"), b.toString("base64")],
    );
  };

  return h;
}

module.exports = { create, PHONE, SMALL, TINY, DESKTOP, DESKTOP_SMALL, BROKEN, SAVED_KEY, ACTIVE };
