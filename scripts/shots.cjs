/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/*
 * Gate screenshots: `npm run shots -- <phase>` writes 8 states x 3 viewports
 * (24 PNGs) to docs/gates/<phase>/. Builds once and serves with `next start`.
 * The YouTube IFrame API is the stub (D-TEST-2), so a healthy clip is a
 * labelled frame; the fallback shot uses the seeded broken card.
 * Set E2E_SKIP_BUILD=1 to reuse an existing build.
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const { startServer } = require("../e2e/support/server.cjs");

const STUB = path.join(__dirname, "..", "e2e", "support", "yt-stub.js");
const ROOT = path.join(__dirname, "..");

const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844, touch: true },
  { name: "375x667", width: 375, height: 667, touch: true },
  { name: "1440x900", width: 1440, height: 900, touch: false },
];
const SAVED = ["c01", "c03", "c05", "c07", "c09", "c11"];
const BROKEN = "c14";
const ACTIVE = '[data-testid="card"][data-active="true"]';

async function newPage(browser, vp, saved) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.touch,
    isMobile: vp.touch,
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.route("**/embed/**", (r) =>
    r.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>blank</title>" }),
  );
  await page.route("**/iframe_api", (r) =>
    r.fulfill({ path: STUB, contentType: "text/javascript" }),
  );
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

async function goToCard(page, id) {
  for (let i = 0; i < 20; i++) {
    const cur = await page.evaluate((s) => document.querySelector(s)?.getAttribute("data-card-id"), ACTIVE);
    if (cur === id) break;
    await page.keyboard.press("ArrowDown");
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
}

async function flip(page) {
  await page.keyboard.press("Space");
  await page.waitForSelector(`${ACTIVE}[data-face="back"]`);
}

async function main() {
  const phase = process.argv[2];
  if (!phase || !/^[\w-]+$/.test(phase)) {
    console.error("usage: npm run shots -- <phase>   (e.g. p1)");
    process.exit(2);
  }
  const outDir = path.join(ROOT, "docs", "gates", phase);
  fs.mkdirSync(outDir, { recursive: true });

  const server = await startServer();
  const browser = await chromium.launch();
  const written = [];
  const shot = async (page, name, vp) => {
    const file = path.join(outDir, `${name}-${vp.name}.png`);
    await page.screenshot({ path: file });
    written.push(file);
    console.log("wrote", path.relative(ROOT, file));
  };

  try {
    for (const vp of VIEWPORTS) {
      // Feed: front, back (stubbed clip), back fallback.
      {
        const { ctx, page } = await newPage(browser, vp);
        await openFeed(page, server.url);
        await goToCard(page, "c01");
        await shot(page, "feed-front", vp);
        await flip(page);
        await page.waitForSelector(`${ACTIVE} [data-testid="clip"][data-clip-state="playing"]`);
        await page.waitForTimeout(300);
        await shot(page, "feed-back", vp);
        await ctx.close();
      }
      {
        const { ctx, page } = await newPage(browser, vp);
        await openFeed(page, server.url);
        await goToCard(page, BROKEN);
        await flip(page);
        await page.waitForSelector(`${ACTIVE} [data-testid="clip"][data-clip-state="error"]`);
        await page.waitForTimeout(300);
        await shot(page, "feed-back-fallback", vp);
        await ctx.close();
      }
      // Saved: populated, searching, no results, empty.
      {
        const { ctx, page } = await newPage(browser, vp, SAVED);
        await page.goto(server.url + "/saved");
        await page.waitForSelector('[data-testid="saved-row"]');
        await shot(page, "saved-populated", vp);
        const search = page.getByRole("searchbox", { name: "Search saved" });
        await search.fill("someone");
        await page.waitForTimeout(200);
        await shot(page, "saved-searching", vp);
        await search.fill("zzzqqq");
        await page.waitForSelector('[data-testid="saved-no-results"]');
        await shot(page, "saved-no-results", vp);
        await ctx.close();
      }
      {
        const { ctx, page } = await newPage(browser, vp, []);
        await page.goto(server.url + "/saved");
        await page.waitForSelector('[data-testid="saved-empty"]');
        await shot(page, "saved-empty", vp);
        await ctx.close();
      }
      // Detail: sheet on phone, pane on desktop.
      {
        const { ctx, page } = await newPage(browser, vp, SAVED);
        await page.goto(server.url + "/saved");
        await page.waitForSelector('[data-testid="saved-row"]');
        await page.locator('[data-testid="saved-row"][data-card-id="c03"]:visible').click();
        await page.waitForSelector('[data-testid="card-detail"] [data-testid="clip"][data-clip-state="playing"]');
        await page.waitForTimeout(500);
        await shot(page, "detail", vp);
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
    await server.stop();
  }
  if (written.length !== 24) {
    console.error(`expected 24 PNGs, wrote ${written.length}`);
    process.exit(1);
  }
  console.log(`wrote ${written.length} PNGs to docs/gates/${phase}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
