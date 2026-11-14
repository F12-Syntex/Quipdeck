/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/*
 * Gate screenshots: `npm run shots -- <phase>` writes 8 states x 3 viewports
 * (24 PNGs) plus the saved-bottom phone shot (1 PNG) to docs/gates/<phase>/,
 * with normal motion (each shot waits out the flip spring and the drawer
 * rise), the same 24 screens under `prefers-reduced-motion: reduce`
 * (`<state>-reduced-<viewport>.png`), and the light variant of Soft Pop
 * (D-THEME-8) for feed front, feed back and saved populated at 390x844 and
 * 1440x900 (`<state>-light-<viewport>.png`, 6 PNGs): the app ships dark, so
 * the shot removes `dark` from <html> after load (no toggle exists).
 * The design-system phases (p2, p3) instead add the showcase (2 PNGs).
 * Builds once and serves with `next start`.
 * The YouTube IFrame API is the stub (D-TEST-2), which paints a local still
 * of each seed video, so a healthy clip looks like a paused player; the
 * fallback shot uses the seeded broken card.
 * Set E2E_SKIP_BUILD=1 to reuse an existing build.
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const { startServer } = require("../e2e/support/server.cjs");

const { routeYouTube } = require("../e2e/support/yt-routes.cjs");
const ROOT = path.join(__dirname, "..");

const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844, touch: true },
  { name: "375x667", width: 375, height: 667, touch: true },
  { name: "1440x900", width: 1440, height: 900, touch: false },
];
// c01+c02 share a move and c03+c04 share a move, so two groups have 2 rows
// (Gate 1 carry-over); eight rows are enough to scroll on the phone.
const SAVED = ["c01", "c02", "c03", "c04", "c05", "c07", "c09", "c11"];
const BROKEN = "c14";
/** The feed front and back shots: a Big Buck Bunny card (a realistic clip still). */
const FEED_CARD = "c04";
const ACTIVE = '[data-testid="card"][data-active="true"]';

/** Phases that gate the design system: shots of /showcase, no reduced set. */
const SHOWCASE_PHASES = new Set(["p2", "p3"]);
/** Longest motion: the flip spring (about 600 ms) and the drawer rise, plus margin. */
const SETTLE_MS = 900;
/** Light-variant shots (D-THEME-8): screenshots only, no toggle in the app. */
const LIGHT_VIEWPORTS = new Set(["390x844", "1440x900"]);

/** Switch the page to Soft Pop's light tokens (the app itself is dark only). */
async function useLight(page) {
  await page.evaluate(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  });
  await page.waitForTimeout(100);
}

async function newPage(browser, vp, saved, reduced = false) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.touch,
    isMobile: vp.touch,
    deviceScaleFactor: 1,
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  const page = await ctx.newPage();
  await routeYouTube(page);
  await page.addInitScript((saved) => {
    if (saved && !sessionStorage.getItem("__seeded")) {
      localStorage.setItem("quipdeck:saved:v1", JSON.stringify(saved));
      sessionStorage.setItem("__seeded", "1");
    }
  }, saved || null);
  return { ctx, page };
}

async function openFeed(page, url) {
  await page.goto(url + "/");
  await page.waitForSelector('[data-testid="feed"][data-ready="true"]');
  await page.waitForSelector(ACTIVE);
}

/*
 * Drive each viewport the way it is used, so no keyboard focus ring shows:
 * touch viewports scroll the feed to the slide (a swipe) and tap the card;
 * desktop clicks "Next card" and clicks the card (the key hints stay up).
 */
async function goToCard(page, id) {
  const desktop = (await page.locator('[data-testid="feed-next"]').count()) > 0;
  for (let i = 0; i < 20; i++) {
    const cur = await page.evaluate((s) => document.querySelector(s)?.getAttribute("data-card-id"), ACTIVE);
    if (cur === id) break;
    if (desktop) {
      await page.locator('[data-testid="feed-next"]').click();
    } else {
      await page.evaluate((id) => {
        const f = document.querySelector('[data-testid="feed"]');
        const slide = f.querySelector(`[data-slide-id="${id}"]`);
        f.scrollTo({ top: slide.offsetTop, behavior: "instant" });
      }, id);
    }
    await page.waitForFunction(
      ({ s, cur }) => document.querySelector(s)?.getAttribute("data-card-id") !== cur,
      { s: ACTIVE, cur },
    );
    await page.waitForTimeout(150);
  }
  await page.waitForFunction(() => {
    const f = document.querySelector('[data-testid="feed"]');
    const c = document.querySelector('[data-testid="card"][data-active="true"]');
    const s = c && c.closest("[data-slide-id]");
    return Math.abs(f.scrollTop - s.offsetTop) <= 1;
  });
  if (desktop) await page.mouse.move(4, 4);
}

async function flip(page, touch) {
  const cue = page.locator(`${ACTIVE} [data-testid="cue"]`);
  if (touch) await cue.tap();
  else await cue.click();
  await page.waitForSelector(`${ACTIVE}[data-face="back"]`);
}

async function main() {
  const phase = process.argv[2];
  if (!phase || !/^[\w-]+$/.test(phase)) {
    console.error("usage: npm run shots -- <phase>   (e.g. p1)");
    process.exit(2);
  }
  const outDir = path.join(ROOT, "docs", "gates", phase);
  const showcase = SHOWCASE_PHASES.has(phase);
  fs.mkdirSync(outDir, { recursive: true });

  const server = await startServer();
  const browser = await chromium.launch();
  const written = [];
  let navGap = null;
  const shot = async (page, name, vp) => {
    const file = path.join(outDir, `${name}-${vp.name}.png`);
    await page.screenshot({ path: file });
    written.push(file);
    console.log("wrote", path.relative(ROOT, file));
  };

  /** The 8 states at one viewport (24 in all), normal or reduced motion. */
  const screens = async (vp, reduced) => {
    const name = (state) => (reduced ? `${state}-reduced` : state);
    const settle = reduced ? 450 : SETTLE_MS;
    // Feed: front, back (stubbed clip), back fallback.
    {
      const { ctx, page } = await newPage(browser, vp, null, reduced);
      await openFeed(page, server.url);
      await goToCard(page, FEED_CARD);
      await page.waitForTimeout(settle);
      await shot(page, name("feed-front"), vp);
      await flip(page, vp.touch);
      await page.waitForSelector(`${ACTIVE} [data-testid="clip"][data-clip-state="playing"]`);
      await page.waitForTimeout(settle);
      await shot(page, name("feed-back"), vp);
      await ctx.close();
    }
    {
      const { ctx, page } = await newPage(browser, vp, null, reduced);
      await openFeed(page, server.url);
      await goToCard(page, BROKEN);
      await page.waitForTimeout(settle);
      await flip(page, vp.touch);
      await page.waitForSelector(`${ACTIVE} [data-testid="clip"][data-clip-state="error"]`);
      await page.waitForTimeout(settle);
      await shot(page, name("feed-back-fallback"), vp);
      await ctx.close();
    }
    // Saved: populated, searching, no results, empty.
    {
      const { ctx, page } = await newPage(browser, vp, SAVED, reduced);
      await page.goto(server.url + "/saved");
      await page.waitForSelector('[data-testid="saved-row"]');
      await page.waitForTimeout(settle);
      const groups = await page.$$eval('[data-testid="move-group"]', (gs) =>
        gs.map((g) => g.querySelectorAll('[data-testid="saved-row"]').length),
      );
      if (!groups.some((n) => n >= 2)) throw new Error("saved shot has no group with 2+ rows: " + groups);
      await shot(page, name("saved-populated"), vp);
      if (vp.name === "390x844" && !reduced) {
        // Phone, scrolled to the bottom: the last row must clear the nav.
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(250);
        const m = await page.evaluate(() => {
          const rows = [...document.querySelectorAll('[data-testid="saved-row"]')].filter((r) => r.offsetParent);
          const last = rows[rows.length - 1].getBoundingClientRect();
          const nav = document.querySelector('nav[aria-label="Primary"]').getBoundingClientRect();
          return { lastBottom: last.bottom, navTop: nav.top, atEnd: Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 1 };
        });
        navGap = Math.round((m.navTop - m.lastBottom) * 10) / 10;
        console.log(`saved-bottom: last row bottom ${m.lastBottom}px, nav top ${m.navTop}px, gap ${navGap}px, at end ${m.atEnd}`);
        if (!m.atEnd) throw new Error("saved-bottom: page not scrolled to the end");
        if (navGap < 0) throw new Error(`saved-bottom: last row overlaps the nav by ${-navGap}px`);
        // Stuck search (P4-8, REDESIGN_V2 5.6): the solid backing is drawn, so rows never peek above it.
        const backing = await page.evaluate(() => {
          const bar = document.querySelector('[data-testid="saved-list"] input[type="search"]').closest(".sticky");
          return { stuck: bar.hasAttribute("data-stuck"), opacity: getComputedStyle(bar, "::before").opacity };
        });
        if (!backing.stuck || backing.opacity !== "1") throw new Error("saved-bottom: stuck search backing not drawn " + JSON.stringify(backing));
        await shot(page, "saved-bottom", vp);
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      const search = page.getByRole("searchbox", { name: "Search saved" });
      await search.fill("someone");
      await page.waitForTimeout(200);
      await shot(page, name("saved-searching"), vp);
      await search.fill("zzzqqq");
      await page.waitForSelector('[data-testid="saved-no-results"]');
      await shot(page, name("saved-no-results"), vp);
      await ctx.close();
    }
    {
      const { ctx, page } = await newPage(browser, vp, [], reduced);
      await page.goto(server.url + "/saved");
      await page.waitForSelector('[data-testid="saved-empty"]');
      await shot(page, name("saved-empty"), vp);
      await ctx.close();
    }
    // Detail: sheet on phone, pane on desktop.
    {
      const { ctx, page } = await newPage(browser, vp, SAVED, reduced);
      await page.goto(server.url + "/saved");
      await page.waitForSelector('[data-testid="saved-row"]');
      await page.locator('[data-testid="saved-row"][data-card-id="c03"]:visible').click();
      await page.waitForSelector('[data-testid="card-detail"] [data-testid="clip"][data-clip-state="playing"]');
      await page.waitForTimeout(Math.max(500, settle));
      await shot(page, name("detail"), vp);
      await ctx.close();
    }
  };

  /** Light variant: feed front, feed back, saved populated (3 per viewport). */
  const lightScreens = async (vp) => {
    const name = (state) => `${state}-light`;
    {
      const { ctx, page } = await newPage(browser, vp, null);
      await openFeed(page, server.url);
      await useLight(page);
      await goToCard(page, FEED_CARD);
      await page.waitForTimeout(SETTLE_MS);
      await shot(page, name("feed-front"), vp);
      await flip(page, vp.touch);
      await page.waitForSelector(`${ACTIVE} [data-testid="clip"][data-clip-state="playing"]`);
      await page.waitForTimeout(SETTLE_MS);
      await shot(page, name("feed-back"), vp);
      await ctx.close();
    }
    {
      const { ctx, page } = await newPage(browser, vp, SAVED);
      await page.goto(server.url + "/saved");
      await page.waitForSelector('[data-testid="saved-row"]');
      await useLight(page);
      await page.waitForTimeout(SETTLE_MS);
      await shot(page, name("saved-populated"), vp);
      await ctx.close();
    }
  };

  try {
    for (const vp of VIEWPORTS) await screens(vp, false);
    if (!showcase) for (const vp of VIEWPORTS) await screens(vp, true);
    if (!showcase) {
      for (const vp of VIEWPORTS.filter((v) => LIGHT_VIEWPORTS.has(v.name))) await lightScreens(vp);
    }
    // Showcase (R-6): phone and desktop, full page (design-system phases).
    for (const vp of showcase ? VIEWPORTS.filter((v) => v.name !== "375x667") : []) {
      const { ctx, page } = await newPage(browser, vp, null, true);
      await page.goto(server.url + "/showcase");
      await page.waitForSelector('[data-testid="showcase"]');
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      const file = path.join(outDir, `showcase-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      written.push(file);
      console.log("wrote", path.relative(ROOT, file));
      await ctx.close();
    }
  } finally {
    await browser.close();
    await server.stop();
  }
  // 24 screens + saved-bottom + 24 reduced + 6 light; showcase phases: 25 + 2.
  const expected = showcase ? 27 : 55;
  if (written.length !== expected) {
    console.error(`expected ${expected} PNGs, wrote ${written.length}`);
    process.exit(1);
  }
  console.log(`wrote ${written.length} PNGs to docs/gates/${phase}/ (saved-bottom nav gap ${navGap}px)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
