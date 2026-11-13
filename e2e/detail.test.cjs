/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/* FEATURE_INVENTORY section 11: card detail (OV-1 .. OV-13). */
const test = require("node:test");
const assert = require("node:assert/strict");
const h = require("./support/harness.cjs").create(test);

const DETAIL = '[data-testid="card-detail"]';
const detailHeart = '[data-testid="card-detail"] [data-testid="heart"]';
const phoneSaved = (saved, extra = {}) => h.open({ device: h.PHONE, route: "/saved", saved, ...extra });
const search = (page) => page.evaluate(() => location.search);
const dialogGone = (page) =>
  page.waitForFunction(() => ![...document.querySelectorAll('[role="dialog"]')].some((d) => d.getClientRects().length > 0));
const focusIsRow = (page, id) =>
  page.waitForFunction(
    (id) => {
      const e = document.activeElement;
      return !!e && e.getAttribute("data-testid") === "saved-row" && e.getAttribute("data-card-id") === id;
    },
    id,
  );
const closeButton = (page) => page.getByRole("dialog").getByRole("button", { name: "Close" });

test("OV-1 tapping a row opens the full card in a sheet", async () => {
  const { page } = await phoneSaved(["c01", "c02"]);
  const card = h.card("c01");
  await h.openSavedRow(page, "c01");
  const dialog = page.getByRole("dialog", { name: card.cue });
  await dialog.waitFor({ state: "visible" });
  const detail = dialog.locator(DETAIL);
  assert.equal(await detail.getAttribute("data-mode"), "sheet");
  assert.equal(await detail.getAttribute("data-card-id"), "c01");
  for (const hook of ["move", "exchange", "trigger", "response", "breakdown", "clip", "heart", "mute"]) {
    assert.ok(await detail.locator(`[data-testid="${hook}"]`).first().isVisible(), hook);
  }
  assert.equal(await detail.locator('[data-testid="move"]').innerText(), h.moveLabel(card.move));
  assert.deepEqual(await detail.locator('[data-testid="speaker"]').allInnerTexts(), [
    card.trigger.speaker,
    card.response.speaker,
  ]);
  assert.deepEqual(await detail.locator('[data-testid="line"]').allInnerTexts(), [card.trigger.line, card.response.line]);
  assert.equal((await detail.locator('[data-testid="breakdown"]').innerText()).trim(), card.breakdown);
  assert.ok(await dialog.getByRole("button", { name: "Close" }).isVisible());
  assert.ok((await detail.innerText()).includes(card.cue));
});

test("OV-2 the URL carries ?card=<id> while open and loses it when closed", async () => {
  const { page } = await phoneSaved(["c01", "c02"]);
  assert.equal(await search(page), "");
  await h.openSavedRow(page, "c01");
  assert.equal(await search(page), "?card=c01");
  await closeButton(page).click();
  await dialogGone(page);
  await page.waitForFunction(() => location.search === "");
});

const CLOSE_PATHS = {
  "Close button": async ({ page }) => closeButton(page).click(),
  Escape: async ({ page }) => page.keyboard.press("Escape"),
  "backdrop tap": async ({ page }) => page.touchscreen.tap(195, 24),
  "drag down on the grabber": async ({ page, ctx }) => {
    const dialog = await h.box(page.getByRole("dialog"));
    const grab = await h.box(page.locator('[data-testid="sheet-grabber"]'));
    // More than half the sheet height, so it is a deliberate dismissal.
    await h.touchDrag(page, ctx, {
      x: grab.x + grab.width / 2,
      y: grab.y + grab.height / 2,
      dy: Math.round(dialog.height * 0.7),
      steps: 14,
    });
  },
  "browser Back": async ({ page }) => page.goBack(),
};
for (const [name, close] of Object.entries(CLOSE_PATHS)) {
  test(`OV-3 close path (${name}) closes, clears the URL and returns focus to the row`, async () => {
    const m = await phoneSaved(["c01", "c02"]);
    await h.openSavedRow(m.page, "c01");
    await m.page.getByRole("dialog").locator(DETAIL).waitFor({ state: "visible" });
    await h.frame(m.page);
    await close(m);
    await dialogGone(m.page);
    await m.page.waitForFunction(() => location.search === "");
    await focusIsRow(m.page, "c01");
  });
}

test("OV-4 focus stays in the dialog through Tab and the list behind does not scroll", async () => {
  const all = h.CARDS.map((c) => c.id);
  const { page } = await phoneSaved(all);
  await page.waitForSelector('[data-testid="saved-row"]:visible');
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForFunction(() => window.scrollY >= 250);
  const visible = await page.evaluate(() => {
    const row = [...document.querySelectorAll('[data-testid="saved-row"]')].find((e) => {
      const r = e.getBoundingClientRect();
      return e.getClientRects().length > 0 && r.top > 150 && r.bottom < 600;
    });
    return row.getAttribute("data-card-id");
  });
  await h.openSavedRow(page, visible);
  await page.getByRole("dialog").locator(DETAIL).waitFor({ state: "visible" });
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    await h.frame(page); // one frame between Tabs (P5-1 inbox, OV-4)
    const inside = await page.evaluate(() => {
      const d = [...document.querySelectorAll('[role="dialog"]')].find((x) => x.getClientRects().length > 0);
      return !!d && d.contains(document.activeElement);
    });
    assert.ok(inside, `focus left the dialog after Tab ${i + 1}`);
  }
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.move(195, 24);
  await page.mouse.wheel(0, 500);
  await h.frame(page);
  await h.frame(page);
  assert.equal(await page.evaluate(() => window.scrollY), before);
});

test("OV-5 the dialog is named by the cue", async () => {
  const { page } = await phoneSaved(["c03"]);
  await h.openSavedRow(page, "c03");
  await page.getByRole("dialog", { name: h.card("c03").cue }).waitFor({ state: "visible" });
});

test("OV-6 the clip plays in the detail and closing destroys it", async () => {
  const { page } = await phoneSaved(["c01"]);
  await h.openSavedRow(page, "c01");
  await page.waitForSelector(`${DETAIL} [data-testid="clip"][data-clip-state="playing"]`);
  assert.equal(await h.iframes(page), 1);
  assert.equal(await page.locator(`${DETAIL} [data-testid="mute"]`).getAttribute("data-muted"), "true");
  await closeButton(page).click();
  await page.waitForFunction(() => document.querySelectorAll("iframe").length === 0);
  assert.ok((await h.ytCalls(page, 0, "destroy")).length >= 1);
});

test("OV-7 unsave from the detail keeps it open; re-pressing re-saves", async () => {
  const { page } = await phoneSaved(["c01", "c02"]);
  const heart = page.locator(detailHeart);
  const pressed = (v) =>
    page.waitForFunction(
      (v) => document.querySelector('[data-testid="card-detail"] [data-testid="heart"]').getAttribute("aria-pressed") === v,
      v,
    );
  await h.openSavedRow(page, "c01");
  await heart.click();
  await pressed("false");
  assert.ok(await page.locator(DETAIL).isVisible());
  await closeButton(page).click();
  await page.locator(DETAIL).waitFor({ state: "detached" });
  assert.equal(await page.locator('[data-testid="saved-row"][data-card-id="c01"]').count(), 0);
  // Press twice: unsave then save again, and the row stays.
  await h.openSavedRow(page, "c02");
  await heart.click();
  await pressed("false");
  await heart.click();
  await pressed("true");
  await closeButton(page).click();
  await page.locator(DETAIL).waitFor({ state: "detached" });
  assert.equal(await page.locator('[data-testid="saved-row"][data-card-id="c02"]:visible').count(), 1);
});

test("OV-8 unsaving the last card shows the empty state after close", async () => {
  const { page } = await phoneSaved(["c01"]);
  await h.openSavedRow(page, "c01");
  await page.locator(detailHeart).click();
  await page.waitForFunction(
    () => document.querySelector('[data-testid="card-detail"] [data-testid="heart"]').getAttribute("aria-pressed") === "false",
  );
  await closeButton(page).click();
  await page.locator('[data-testid="saved-empty"]:visible').waitFor();
});

test("OV-9 tapping the detail body does not flip or change anything", async () => {
  const { page } = await phoneSaved(["c01"]);
  await h.openSavedRow(page, "c01");
  await page.waitForSelector(`${DETAIL} [data-testid="clip"][data-clip-state="playing"]`);
  await page.locator(`${DETAIL} [data-testid="breakdown"]`).click();
  await h.frame(page);
  const detail = page.locator(DETAIL);
  assert.equal(await detail.getAttribute("data-card-id"), "c01");
  assert.ok(await detail.locator('[data-testid="exchange"]').isVisible());
  assert.ok(await detail.locator('[data-testid="clip"][data-clip-state="playing"]').isVisible());
  assert.equal(await detail.locator("[data-face]").count(), 0, "the detail has no faces to flip");
});

for (const [name, device] of [["1440x900", h.DESKTOP], ["1024x768", h.DESKTOP_SMALL]]) {
  test(`OV-10 desktop pane at ${name}: non-modal, stacked, swaps on row click, Escape clears`, async () => {
    const { page } = await h.open({ device, route: "/saved", saved: ["c01", "c02", "c03"] });
    await page.waitForSelector('[data-testid="saved-row"]:visible');
    await h.openSavedRow(page, "c01");
    const detail = page.locator(`${DETAIL}:visible`);
    assert.equal(await detail.getAttribute("data-mode"), "pane");
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page.waitForSelector(`${DETAIL} [data-testid="clip"][data-clip-state="playing"]`);
    const bd = await h.box(detail.locator('[data-testid="breakdown"]'));
    const clip = await h.box(detail.locator('[data-testid="clip"]'));
    assert.ok(clip.y >= bd.y + bd.height - 1, "clip under the breakdown");
    const card = await page.evaluate(() => {
      const d = document.querySelector('[data-testid="card-detail"]');
      const inner = [...d.querySelectorAll("*")].reduce((m, e) => Math.max(m, e.getBoundingClientRect().width), 0);
      return { detail: d.getBoundingClientRect().width, inner };
    });
    assert.ok(card.detail <= 560 + 1, `detail width ${card.detail}`);
    assert.equal(
      await page.locator('[data-testid="saved-row"][data-card-id="c01"]:visible').getAttribute("aria-current"),
      "true",
    );
    // Another row swaps the card.
    await h.openSavedRow(page, "c02");
    await page.waitForSelector(`${DETAIL}[data-card-id="c02"]`);
    assert.equal(await page.locator('[data-testid="saved-row"][data-card-id="c01"]:visible').getAttribute("aria-current"), null);
    assert.equal(await page.locator('[data-testid="saved-row"][data-card-id="c02"]:visible').getAttribute("aria-current"), "true");
    await page.waitForSelector(`${DETAIL} [data-testid="clip"][data-clip-state="playing"]`);
    await page.keyboard.press("Escape");
    await page.locator('[data-testid="detail-placeholder"]:visible').waitFor();
    assert.equal(await page.locator(DETAIL).count(), 0);
    await page.waitForFunction(() => document.querySelectorAll("iframe").length === 0);
    const max = await page.evaluate(() => window.__max);
    assert.ok(max.iframes <= 1 && max.live <= 1, JSON.stringify(max));
  });
}

test("OV-11 desktop Back leaves Saved in one step", async () => {
  const { page } = await h.open({ device: h.DESKTOP, saved: ["c01", "c02"] });
  await page.getByRole("link", { name: "Saved" }).click();
  await page.waitForURL("**/saved");
  await h.openSavedRow(page, "c01");
  await page.waitForFunction(() => location.search === "?card=c01");
  await h.openSavedRow(page, "c02");
  await page.waitForFunction(() => location.search === "?card=c02");
  await page.goBack();
  await page.waitForURL((u) => u.pathname === "/" && u.search === "");
});

test("OV-12 a broken clip in the detail shows the fallback; text intact", async () => {
  const { page } = await phoneSaved([h.BROKEN]);
  await h.openSavedRow(page, h.BROKEN);
  const detail = page.locator(DETAIL);
  await detail.locator('[data-testid="clip"][data-clip-state="error"]').waitFor();
  assert.match(await detail.locator('[data-testid="clip-fallback"]').innerText(), /Clip unavailable/);
  assert.ok(await detail.locator('[data-testid="exchange"]').isVisible());
  assert.ok(await detail.locator('[data-testid="breakdown"]').isVisible());
  assert.equal(await h.iframes(page), 0);
});

test("OV-13 the sheet is at most 92% of the viewport height", async () => {
  const { page } = await phoneSaved(["c01"]);
  await h.openSavedRow(page, "c01");
  await page.getByRole("dialog").locator(DETAIL).waitFor({ state: "visible" });
  // Wait for the rise transition to finish before measuring.
  await page.evaluate(() => {
    window.__sheetTop = undefined;
  });
  await page.waitForFunction(
    () => {
      const d = [...document.querySelectorAll('[role="dialog"]')].find((x) => x.getClientRects().length > 0);
      const top = Math.round(d.getBoundingClientRect().top);
      const stable = window.__sheetTop === top;
      window.__sheetTop = top;
      return stable && top > 0 && top < innerHeight;
    },
    null,
    { polling: 100 },
  );
  const b = await h.box(page.getByRole("dialog"));
  assert.ok(b.height <= 0.92 * 844 + 1, `sheet height ${b.height}`);
});
