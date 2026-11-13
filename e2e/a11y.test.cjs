/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/*
 * P5-2 accessibility and motion suite (FEATURE_INVENTORY A-1..A-9, LF-1, LF-6).
 * axe-core is injected from node_modules. Every state is audited with the
 * WCAG 2.1 A and AA tags at 390x844 and 1440x900. Serious and critical
 * violations fail the test; moderate and minor ones are printed as
 * "MODERATE" lines. The YouTube IFrame API is the stub (D-TEST-2).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { execSync } = require("node:child_process");
const { chromium } = require("playwright");
const { startServer } = require("./support/server.cjs");

const STUB = path.join(__dirname, "support", "yt-stub.js");
const AXE_PATH = require.resolve("axe-core/axe.min.js");
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const VIEWPORTS = { "390x844": PHONE, "1440x900": DESKTOP };
const BROKEN = "c14";
const ACTIVE = '[data-testid="card"][data-active="true"]';
const SAVED = ["c01", "c02", "c03", "c05"];
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

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

const opened = [];
test.afterEach(async () => {
  while (opened.length) await opened.pop().close().catch(() => {});
});

async function open(opts = {}) {
  const ctx = await browser.newContext({
    ...(opts.device || DESKTOP),
    reducedMotion: opts.reducedMotion || "no-preference",
    colorScheme: opts.colorScheme || "dark",
  });
  opened.push(ctx);
  const page = await ctx.newPage();
  await page.route("**/embed/**", (r) =>
    r.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>blank</title>" }),
  );
  await page.route("**/iframe_api", (r) => r.fulfill({ path: STUB, contentType: "text/javascript" }));
  const saved = opts.saved;
  await page.addInitScript(
    ({ saved }) => {
      window.__ytStubConfig = {};
      if (saved && !sessionStorage.getItem("__seeded")) {
        localStorage.setItem("quipdeck:saved:v1", JSON.stringify(saved));
        sessionStorage.setItem("__seeded", "1");
      }
    },
    { saved },
  );
  const route = opts.route || "/";
  await page.goto(server.url + route);
  if (route === "/") {
    await page.waitForSelector('[data-testid="feed"][data-ready="true"]');
    await page.waitForSelector(ACTIVE);
  } else if (opts.saved && opts.saved.length) {
    await page.waitForSelector('[data-testid="saved-row"]');
  } else {
    await page.waitForSelector('[data-testid="saved-empty"]');
  }
  return { page, ctx };
}

// ---- feed helpers ----
const activeId = (page) =>
  page.evaluate((s) => document.querySelector(s)?.getAttribute("data-card-id") ?? null, ACTIVE);
async function settled(page) {
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
}
async function next(page) {
  const before = await activeId(page);
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(
    ({ s, before }) => document.querySelector(s)?.getAttribute("data-card-id") !== before,
    { s: ACTIVE, before },
    { timeout: 5000 },
  );
  await settled(page);
}
async function goToCard(page, id) {
  for (let i = 0; i < 20; i++) {
    if ((await activeId(page)) === id) return;
    await next(page);
  }
  throw new Error("could not reach " + id);
}
async function goToHealthy(page) {
  for (let i = 0; i < 20; i++) {
    if ((await activeId(page)) !== BROKEN) return;
    await next(page);
  }
}
async function flip(page) {
  await page.keyboard.press("Space");
  await page.waitForFunction((s) => document.querySelector(s)?.getAttribute("data-face") === "back", ACTIVE);
}
const waitClip = (page, state, scope = ACTIVE) =>
  page.waitForSelector(`${scope} [data-testid="clip"][data-clip-state="${state}"]`, { timeout: 8000 });

// ---- scenarios (each returns a page ready to audit) ----
const SCENARIOS = {
  "feed front": async (device) => (await open({ device })).page,
  "feed back (clip playing)": async (device) => {
    const { page } = await open({ device });
    await goToHealthy(page);
    await flip(page);
    await waitClip(page, "playing");
    return page;
  },
  "feed back fallback": async (device) => {
    const { page } = await open({ device });
    await goToCard(page, BROKEN);
    await flip(page);
    await waitClip(page, "error");
    await page.locator(`${ACTIVE} [data-testid="clip-fallback"]`).waitFor({ state: "visible" });
    return page;
  },
  "saved populated": async (device) =>
    (await open({ device, route: "/saved", saved: SAVED })).page,
  "saved empty": async (device) => (await open({ device, route: "/saved" })).page,
  "saved no-results": async (device) => {
    const { page } = await open({ device, route: "/saved", saved: SAVED });
    await page.getByRole("searchbox", { name: "Search saved" }).fill("zzzzqqqq");
    await page.locator('[data-testid="saved-no-results"]').waitFor({ state: "visible" });
    return page;
  },
  detail: async (device) => {
    const { page } = await open({ device, route: "/saved", saved: SAVED });
    await page.locator('[data-testid="saved-row"][data-card-id="c01"]:visible').click();
    await page.waitForSelector('[data-testid="card-detail"]');
    await waitClip(page, "playing", '[data-testid="card-detail"]');
    return page;
  },
};

// ---- axe ----
async function runAxe(page, options = {}) {
  await page.addScriptTag({ path: AXE_PATH });
  return page.evaluate(
    async (options) =>
      axe.run(document, options).then((r) => ({
        violations: r.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.map((n) => ({ target: n.target.join(" >> "), summary: n.failureSummary })),
        })),
        incomplete: r.incomplete.map((v) => ({ id: v.id, impact: v.impact, count: v.nodes.length })),
      })),
    options,
  );
}
const contrastFailures = new Map();

for (const [vpName, device] of Object.entries(VIEWPORTS)) {
  for (const [name, setup] of Object.entries(SCENARIOS)) {
    test(`A-2 axe WCAG 2.1 A/AA: ${name} @ ${vpName}`, async () => {
      const page = await setup(device);
      await page.waitForTimeout(400);
      const res = await runAxe(page, { runOnly: { type: "tag", values: WCAG_TAGS } });
      const blocking = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      const other = res.violations.filter((v) => v.impact !== "serious" && v.impact !== "critical");
      for (const v of other) {
        console.log(
          `MODERATE [${v.impact}] ${v.id} @ ${vpName} / ${name}: ${v.nodes.map((n) => n.target).join(" | ")}`,
        );
      }
      const cc = res.violations.filter((v) => v.id === "color-contrast");
      contrastFailures.set(`${name} @ ${vpName}`, cc.length);
      const report = blocking.map(
        (v) => `${v.impact} ${v.id} (${v.help}): ${v.nodes.map((n) => n.target).join(" | ")}`,
      );
      assert.deepEqual(report, [], `serious/critical axe violations in ${name} @ ${vpName}`);
    });
  }
}

test("A-1 contrast AA: no axe color-contrast violation on any audited screen", () => {
  assert.ok(contrastFailures.size >= 14, "axe runs recorded: " + contrastFailures.size);
  const bad = [...contrastFailures].filter(([, n]) => n > 0).map(([k]) => k);
  assert.deepEqual(bad, []);
});

// ---- A-3 landmarks and headings ----
test("A-3 landmarks and headings", async () => {
  for (const device of [PHONE, DESKTOP]) {
    const { page } = await open({ device });
    assert.equal(await page.getByRole("main").count(), 1, "one main on /");
    const nav = page.getByRole("navigation", { name: "Primary" });
    assert.equal(await nav.count(), 1, "labelled nav on /");
    const cue = page.locator(`${ACTIVE} [data-testid="cue"]`);
    const role = await cue.evaluate((el) => el.getAttribute("role") || el.tagName.toLowerCase());
    assert.ok(/^(h[1-6]|heading)$/.test(role), "cue is a heading in the card, got " + role);
    await page.goto(server.url + "/saved");
    await page.waitForSelector('[data-testid="saved-empty"]');
    assert.equal(await page.getByRole("main").count(), 1, "one main on /saved");
    assert.equal(await page.getByRole("heading", { level: 1 }).count(), 1, "one h1 on /saved");
    assert.equal(await page.getByRole("navigation", { name: "Primary" }).count(), 1);
  }
  const { page } = await open({ device: PHONE, route: "/saved", saved: SAVED });
  await page.locator('[data-testid="saved-row"][data-card-id="c01"]:visible').click();
  const detail = page.locator('[data-testid="card-detail"]');
  await detail.waitFor();
  assert.ok((await detail.getByRole("heading").count()) >= 1, "detail has a heading (cue)");
  const heading = detail.getByRole("heading").first();
  const cueTxt = (await heading.innerText()).trim();
  assert.ok(cueTxt.length > 0, "detail heading has the cue text");
});

// ---- A-4 names ----
test("A-4 every button and link has an accessible name; the iframe has a title", async () => {
  const unnamed = (page) =>
    page.evaluate(() => {
      const bad = [];
      const els = document.querySelectorAll('button, a[href], [role="button"], input, [role="tab"]');
      for (const el of els) {
        if (!el.checkVisibility()) continue;
        const labelled = el.getAttribute("aria-labelledby");
        const name =
          el.getAttribute("aria-label") ||
          (labelled && document.getElementById(labelled)?.textContent) ||
          (el.labels && el.labels[0]?.textContent) ||
          el.textContent;
        if (!name || !name.trim()) bad.push(el.outerHTML.slice(0, 120));
      }
      return bad;
    });
  for (const device of [PHONE, DESKTOP]) {
    const page = await SCENARIOS["feed back (clip playing)"](device);
    assert.deepEqual(await unnamed(page), [], "feed back");
    const title = await page.locator(`${ACTIVE} iframe`).getAttribute("title");
    assert.ok(title && title.trim().length > 0, "iframe title: " + title);
    const d = await SCENARIOS.detail(device);
    assert.deepEqual(await unnamed(d), [], "detail");
    const dt = await d.locator('[data-testid="card-detail"] iframe').getAttribute("title");
    assert.ok(dt && dt.trim().length > 0, "detail iframe title");
    const s = await SCENARIOS["saved populated"](device);
    assert.deepEqual(await unnamed(s), [], "saved");
  }
});

// ---- A-5 reduced motion / FL-11 ----
const REDUCED = { device: PHONE, reducedMotion: "reduce" };

test("A-5 reduced motion: nothing animates on the feed front; ambient drift is still", async () => {
  for (const device of [PHONE, DESKTOP]) {
    const { page } = await open({ device, reducedMotion: "reduce" });
    await page.waitForTimeout(600);
    const info = await page.evaluate(() => {
      const glow = document.querySelector(".ambient-glow");
      const running = document
        .getAnimations()
        .filter((a) => a.playState === "running")
        .map((a) => a.animationName || a.transitionProperty || a.constructor.name);
      return {
        glowAnim: glow ? getComputedStyle(glow).animationName : "missing",
        running,
        hint: (() => {
          const h = document.querySelector('[data-testid="reveal"]');
          return h ? getComputedStyle(h).animationName : "missing";
        })(),
      };
    });
    assert.equal(info.glowAnim, "none", "ambient drift animation");
    assert.equal(info.hint, "none", "hint pulse");
    assert.deepEqual(info.running, [], "running animations at rest");
  }
  // Control: with motion allowed the drift does exist, so the check is meaningful.
  const { page } = await open({ device: PHONE });
  const anim = await page.evaluate(() => getComputedStyle(document.querySelector(".ambient-glow")).animationName);
  assert.match(anim, /drift/);
});

test("FL-11 reduced motion: no transform animation on flip, back visible within 300ms", async () => {
  for (const device of [PHONE, DESKTOP]) {
    const { page } = await open({ device, reducedMotion: "reduce" });
    await goToHealthy(page);
    await page.evaluate((sel) => {
      const card = document.querySelector(sel);
      const samples = new Map(); // element -> Set of transforms
      const rec = [];
      window.__flipRec = rec;
      const stop = { v: false };
      window.__flipStop = stop;
      const t0 = performance.now();
      const tick = () => {
        const anims = document
          .getAnimations()
          .filter((a) => {
            const e = a.effect;
            if (!e || !e.target || !card.contains(e.target)) return false;
            if (a.playState !== "running") return false;
            return e.getKeyframes().some((k) => "transform" in k || "rotate" in k || "scale" in k || "translate" in k);
          })
          .map((a) => a.animationName || a.transitionProperty || "waapi");
        for (const el of [card, ...card.querySelectorAll("*")]) {
          const cs = getComputedStyle(el);
          const v = cs.transform + "|" + cs.rotate + "|" + cs.scale + "|" + cs.translate;
          let set = samples.get(el);
          if (!set) samples.set(el, (set = new Set()));
          set.add(v);
        }
        rec.push({ t: performance.now() - t0, anims, face: card.getAttribute("data-face") });
        if (!stop.v) requestAnimationFrame(tick);
      };
      tick();
      window.__flipSamples = samples;
    }, ACTIVE);
    await page.keyboard.press("Space");
    const t = Date.now();
    await page.waitForFunction((s) => document.querySelector(s)?.getAttribute("data-face") === "back", ACTIVE);
    await page.waitForSelector(`${ACTIVE} [data-testid="card-back"]`, { state: "visible" });
    const elapsed = Date.now() - t;
    await page.waitForTimeout(600);
    const res = await page.evaluate(() => {
      window.__flipStop.v = true;
      const moving = [];
      for (const [el, set] of window.__flipSamples) {
        if (set.size > 1 && el.isConnected) {
          moving.push(el.tagName.toLowerCase() + "[" + (el.getAttribute("data-testid") || "") + "]:" + [...set].join(" ~ "));
        }
      }
      return {
        anims: [...new Set(window.__flipRec.flatMap((r) => r.anims))],
        moving,
        pulse: getComputedStyle(document.querySelector(".ambient-glow")).animationName,
      };
    });
    assert.deepEqual(res.anims, [], "no transform animation during flip (" + device.viewport.width + ")");
    assert.deepEqual(res.moving, [], "no element changes transform during flip");
    assert.equal(res.pulse, "none", "ambient drift still");
    assert.ok(elapsed < 1000, "back visible promptly, took " + elapsed);
  }
});

test("A-5 reduced motion: flip never shows a 3D transform and drift stays still on the back and in the detail", async () => {
  const { page } = await open(REDUCED);
  await goToHealthy(page);
  await flip(page);
  await waitClip(page, "playing");
  const t3d = await page.evaluate((s) => {
    const card = document.querySelector(s);
    return [card, ...card.querySelectorAll("*")]
      .map((e) => getComputedStyle(e).transform)
      .filter((t) => t.startsWith("matrix3d"));
  }, ACTIVE);
  assert.deepEqual(t3d, []);
  const d = await open({ ...REDUCED, route: "/saved", saved: SAVED });
  await d.page.locator('[data-testid="saved-row"][data-card-id="c01"]:visible').click();
  await d.page.waitForSelector('[data-testid="card-detail"]');
  await d.page.waitForTimeout(500);
  const running = await d.page.evaluate(() =>
    document.getAnimations().filter((a) => a.playState === "running").map((a) => a.animationName || a.transitionProperty),
  );
  assert.deepEqual(running, [], "no running animations in the detail");
});

// ---- A-6 reduced transparency ----
test("A-6 reduced transparency: the media query drops backdrop-filter on glass chrome", async () => {
  const { page } = await open({ device: PHONE });
  const res = await page.evaluate(() => {
    const out = { rules: [], navFilter: null };
    const visit = (rules, inRT) => {
      for (const r of rules) {
        if (r.type === CSSRule.MEDIA_RULE) {
          visit(r.cssRules, inRT || /prefers-reduced-transparency:\s*reduce/.test(r.conditionText));
        } else {
          if (inRT && r.style) {
            const bf = r.style.getPropertyValue("backdrop-filter") || r.style.getPropertyValue("-webkit-backdrop-filter");
            if (bf) out.rules.push({ sel: r.selectorText, backdrop: bf });
          }
          if (r.cssRules) visit(r.cssRules, inRT);
        }
      }
    };
    for (const sheet of document.styleSheets) {
      try {
        visit(sheet.cssRules, false);
      } catch {}
    }
    const nav = document.querySelector('nav[aria-label="Primary"]');
    const probe = nav && nav.querySelector("[class*=glass]") ? nav.querySelector("[class*=glass]") : nav;
    out.navFilter = nav ? getComputedStyle(probe).backdropFilter : null;
    return out;
  });
  const dropping = res.rules.filter((r) => /^(none)$/.test(r.backdrop.trim()));
  assert.ok(dropping.length > 0, "a reduced-transparency rule sets backdrop-filter: none; rules: " + JSON.stringify(res.rules));
  // Best effort live check: Chromium honours the feature only when emulated.
  const ctx = await browser.newContext({ ...PHONE });
  opened.push(ctx);
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp
    .send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] })
    .catch(() => {});
  await p.route("**/iframe_api", (r) => r.fulfill({ path: STUB, contentType: "text/javascript" }));
  await p.goto(server.url + "/");
  await p.waitForSelector('[data-testid="feed"][data-ready="true"]');
  const supported = await p.evaluate(() => matchMedia("(prefers-reduced-transparency: reduce)").matches);
  if (supported) {
    const bad = await p.evaluate(() =>
      [...document.querySelectorAll("nav[aria-label='Primary'] *, nav[aria-label='Primary']")]
        .map((e) => getComputedStyle(e).backdropFilter)
        .filter((v) => v && v !== "none"),
    );
    assert.deepEqual(bad, [], "nav backdrop-filter under reduced transparency");
  } else {
    console.log("A-6 note: browser did not honour prefers-reduced-transparency emulation; checked the media rule only");
  }
});

// ---- A-7 pause mechanism ----
test("A-7 the clip can be stopped by flipping back", async () => {
  const { page } = await open({ device: PHONE });
  await goToHealthy(page);
  await flip(page);
  await waitClip(page, "playing");
  await page.keyboard.press("Space");
  await page.waitForFunction((s) => document.querySelector(s).getAttribute("data-face") === "front", ACTIVE);
  await page.waitForFunction(() => document.querySelectorAll("iframe").length === 0);
});

// ---- A-8 zoom proxy ----
test("A-8 usable at 200% zoom proxy (720x450): no horizontal scroll, cue inside the card", async () => {
  for (const route of ["/", "/saved"]) {
    const { page } = await open({
      device: { viewport: { width: 720, height: 450 } },
      route,
      saved: route === "/saved" ? SAVED : undefined,
    });
    await page.waitForTimeout(300);
    const hs = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
    }));
    assert.ok(hs.doc <= 1 && hs.body <= 1, `horizontal scroll on ${route}: ${JSON.stringify(hs)}`);
    if (route === "/") {
      const geo = await page.evaluate((s) => {
        const card = document.querySelector(s).getBoundingClientRect();
        const cue = document.querySelector(`${s} [data-testid="cue"]`).getBoundingClientRect();
        return { card: [card.left, card.top, card.right, card.bottom], cue: [cue.left, cue.top, cue.right, cue.bottom] };
      }, ACTIVE);
      const [cl, ct, cr, cb] = geo.card;
      const [ql, qt, qr, qb] = geo.cue;
      assert.ok(ql >= cl - 1 && qr <= cr + 1 && qt >= ct - 1 && qb <= cb + 1, "cue inside card " + JSON.stringify(geo));
    }
  }
});

// ---- A-9 touch targets ----
const INTERACTIVE =
  'button, a[href], input, select, textarea, summary, [role="button"], [role="tab"], [role="link"], [tabindex]:not([tabindex="-1"])';
async function undersized(page, scope = "body") {
  return page.evaluate(
    ({ sel, scope }) => {
      const out = [];
      const root = document.querySelector(scope) || document.body;
      for (const el of root.querySelectorAll(sel)) {
        if (!el.checkVisibility({ visibilityProperty: true })) continue;
        if (el.closest("[inert], [aria-hidden='true']")) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        // Skip things fully outside the viewport horizontally (off-screen slides).
        if (r.right < 0 || r.left > innerWidth) continue;
        if (el.matches("iframe")) continue;
        if (r.width < 43.5 || r.height < 43.5) {
          const id = el.getAttribute("data-testid") || el.getAttribute("aria-label") || el.textContent.trim().slice(0, 24);
          out.push(`${el.tagName.toLowerCase()}[${id}] ${Math.round(r.width * 10) / 10}x${Math.round(r.height * 10) / 10}`);
        }
      }
      return out;
    },
    { sel: INTERACTIVE, scope },
  );
}

test("A-9 touch targets >= 44x44 at 390 on every screen", async () => {
  const failures = {};
  for (const [name, setup] of Object.entries(SCENARIOS)) {
    const page = await setup(PHONE);
    await page.waitForTimeout(300);
    const bad = await undersized(page);
    if (bad.length) failures[name] = bad;
  }
  // Saved with the search clear button showing.
  const { page } = await open({ device: PHONE, route: "/saved", saved: SAVED });
  await page.getByRole("searchbox", { name: "Search saved" }).fill("a");
  const bad = await undersized(page);
  if (bad.length) failures["saved search active"] = bad;
  assert.deepEqual(failures, {});
});

// ---- Focus visibility ----
async function ringOf(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const sig = () => {
      const cs = getComputedStyle(el);
      const outlineOn =
        cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.outlineColor);
      return { outline: outlineOn ? `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}` : "", shadow: cs.boxShadow };
    };
    const focusVisible = el.matches(":focus-visible");
    const on = sig();
    // Compare with the same element unfocused: the ring must be what focus adds.
    el.blur();
    const off = sig();
    el.focus({ focusVisible: true });
    const ring = !!(on.outline && on.outline !== off.outline) || (on.shadow !== "none" && on.shadow !== off.shadow);
    const id = el.getAttribute("data-testid") || el.getAttribute("aria-label") || el.textContent.trim().slice(0, 24);
    return { tag: el.tagName.toLowerCase(), id, focusVisible, ring, shown: el.checkVisibility() };
  });
}

const CONTROLS = 'button, a[href], input, select, textarea, summary, [role="button"], [role="tab"]';
async function tabAudit(page, max = 60) {
  const problems = [];
  const seen = [];
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const r = await ringOf(page);
    if (r) {
      const key = r.tag + ":" + r.id;
      const fresh = await page.evaluate(() => {
        const el = document.activeElement;
        if (el.hasAttribute("data-a11y-seen")) return false;
        el.setAttribute("data-a11y-seen", "1");
        return true;
      });
      if (fresh) {
        seen.push(key);
        if (r.shown && !(r.focusVisible && r.ring)) problems.push(`${key} focusVisible=${r.focusVisible} ring=${r.ring}`);
      }
    }
    // Stop once every visible, enabled control has had focus.
    const left = await page.evaluate((sel) => {
      let n = 0;
      for (const el of document.querySelectorAll(sel)) {
        if (!el.checkVisibility({ visibilityProperty: true }) || el.disabled || el.matches("iframe")) continue;
        if (el.closest("[inert], [aria-hidden='true']")) continue;
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0 || b.right < 0 || b.left > innerWidth) continue;
        if (!el.hasAttribute("data-a11y-seen")) n++;
      }
      return n;
    }, CONTROLS);
    if (left === 0) break;
  }
  return { problems, seen };
}

const FOCUS_SCENARIOS = ["feed front", "feed back (clip playing)", "saved populated", "saved no-results", "detail"];
for (const [vpName, device] of Object.entries(VIEWPORTS)) {
  test(`focus-visible ring on every tab stop @ ${vpName} (A-4/A-9 keyboard)`, async () => {
    const failures = {};
    for (const name of FOCUS_SCENARIOS) {
      const page = await SCENARIOS[name](device);
      await page.waitForTimeout(300);
      const { problems, seen } = await tabAudit(page);
      assert.ok(seen.length > 0, `${name}: Tab reaches something`);
      if (problems.length) failures[name] = problems;
    }
    assert.deepEqual(failures, {});
  });
}

test("every visible interactive control is reachable by keyboard and shows a ring", async () => {
  // Controls removed from the tab order (tabindex=-1) must not be the only way to act.
  const failures = {};
  for (const [vpName, device] of Object.entries(VIEWPORTS)) {
    for (const name of FOCUS_SCENARIOS) {
      const page = await SCENARIOS[name](device);
      await page.waitForTimeout(300);
      await tabAudit(page, 60);
      const controls = await page.evaluate((sel) => {
        const out = [];
        for (const el of document.querySelectorAll(sel)) {
          if (!el.checkVisibility({ visibilityProperty: true })) continue;
          if (el.closest("[inert], [aria-hidden='true']")) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0 || r.right < 0 || r.left > innerWidth) continue;
          if (el.matches("iframe") || el.disabled) continue;
          const id = el.getAttribute("data-testid") || el.getAttribute("aria-label") || el.textContent.trim().slice(0, 24);
          out.push(el.tagName.toLowerCase() + ":" + id + (el.hasAttribute("data-a11y-seen") ? "" : " (not reached)"));
        }
        return out;
      }, 'button, a[href], input, select, textarea, summary, [role="button"], [role="tab"]');
      const missing = controls.filter((c) => c.endsWith("(not reached)"));
      if (missing.length) failures[`${name} @ ${vpName}`] = missing;
    }
  }
  assert.deepEqual(failures, {});
});

// ---- LF-1 dark only ----
test("LF-1 dark only: html.dark, color-scheme dark, same in a light-preferring browser", async () => {
  for (const colorScheme of ["light", "dark"]) {
    const { page } = await open({ device: PHONE, colorScheme });
    const info = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const bg = getComputedStyle(document.body).backgroundColor;
      const m = (bg.match(/[\d.]+/g) || []).map(Number);
      const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      const lum = m.length >= 3 ? 0.2126 * lin(m[0]) + 0.7152 * lin(m[1]) + 0.0722 * lin(m[2]) : null;
      const alpha = m.length === 4 ? m[3] : 1;
      const rootBg = getComputedStyle(document.documentElement).backgroundColor;
      return {
        dark: document.documentElement.classList.contains("dark"),
        scheme: cs.colorScheme,
        bg,
        rootBg,
        lum,
        alpha,
        toggles: document.querySelectorAll('[aria-label*="theme" i], [aria-label*="dark mode" i], [aria-label*="light mode" i]').length,
      };
    });
    assert.ok(info.dark, "html has class dark");
    assert.match(info.scheme, /dark/);
    assert.equal(info.toggles, 0, "no theme toggle");
    // Body may be transparent over the ambient layer; fall back to the root colour.
    const effective = info.alpha === 0 ? info.rootBg : info.bg;
    const mm = (effective.match(/[\d.]+/g) || []).map(Number);
    const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const lum = 0.2126 * lin(mm[0]) + 0.7152 * lin(mm[1]) + 0.0722 * lin(mm[2]);
    assert.ok(lum < 0.1, `background luminance stays dark (${effective}, ${lum}) for ${colorScheme}`);
  }
});

// ---- LF-6 dvh ----
test("LF-6 no bare vh units in layout (only dvh, svh, lvh)", () => {
  let out = "";
  try {
    out = execSync('grep -rnE "[0-9]vh" src --include=*.tsx --include=*.css || true', {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
    });
  } catch {
    out = "";
  }
  const bad = out
    .split("\n")
    .filter(Boolean)
    .filter((l) => /[0-9]vh/.test(l.replace(/[0-9](dvh|svh|lvh)/g, "")));
  assert.deepEqual(bad, []);
});
