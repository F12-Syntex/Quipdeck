/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/* FEATURE_INVENTORY section 10: saved list (SL-1 .. SL-16). */
const test = require("node:test");
const assert = require("node:assert/strict");
const h = require("./support/harness.cjs").create(test);

const ROWS = '[data-testid="saved-row"]:visible';
const searchbox = (page) => page.getByRole("searchbox", { name: "Search saved" });
const rowCount = (page) => page.locator(ROWS).count();
const waitRows = (page, n) =>
  page.waitForFunction(
    (n) =>
      [...document.querySelectorAll('[data-testid="saved-row"]')].filter((e) => e.getClientRects().length > 0).length === n,
    n,
  );

/** Independent expectation of the search: every field, case-insensitive. */
const matches = (card, q) =>
  [
    card.cue,
    h.moveLabel(card.move),
    card.trigger.line,
    card.trigger.speaker,
    card.response.line,
    card.response.speaker,
    card.breakdown,
  ].some((f) => f.toLowerCase().includes(q.toLowerCase()));

// Five saves over three moves: literal (c01 c02), escalation (c03), understatement (c05 c06).
const FIVE = ["c05", "c01", "c03", "c06", "c02"];

test("SL-1 grouped by move, headings sorted A to Z", async () => {
  const { page } = await h.open({ route: "/saved", saved: FIVE, device: h.PHONE });
  await page.waitForSelector(ROWS);
  const heads = await page.locator('[data-testid="move-group"]:visible h2').allInnerTexts();
  const want = [...new Set(FIVE.map((id) => h.moveLabel(h.card(id).move)))].sort((a, b) => a.localeCompare(b));
  assert.equal(want.length, 3);
  assert.deepEqual(heads, want);
});

test("SL-2 each row shows the cue and the response line", async () => {
  const { page } = await h.open({ route: "/saved", saved: FIVE, device: h.PHONE });
  await page.waitForSelector(ROWS);
  for (const id of FIVE) {
    const text = await page.locator(`[data-testid="saved-row"][data-card-id="${id}"]:visible`).innerText();
    assert.ok(text.includes(h.card(id).cue), `${id} cue`);
    assert.ok(text.includes(h.card(id).response.line), `${id} response line`);
  }
});

test("SL-3 no counts in group headings or the nav", async () => {
  const { page } = await h.open({ route: "/saved", saved: FIVE, device: h.PHONE });
  await page.waitForSelector(ROWS);
  for (const t of await page.locator('[data-testid="move-group"]:visible h2').allInnerTexts()) {
    assert.doesNotMatch(t, /\d/, t);
  }
  assert.doesNotMatch(await page.locator('nav[aria-label="Primary"]').innerText(), /\d/);
});

test("SL-4 search covers cue, move label, trigger, response and breakdown (and speakers)", async () => {
  const all = h.CARDS.map((c) => c.id);
  const { page } = await h.open({ route: "/saved", saved: all, device: h.DESKTOP });
  await page.waitForSelector(ROWS);
  const c = h.card("c05");
  const probes = [
    c.cue,
    h.moveLabel(c.move),
    c.trigger.line,
    c.response.line,
    c.breakdown,
    c.trigger.speaker,
    c.response.speaker,
  ];
  for (const q of probes) {
    const expected = all.filter((id) => matches(h.card(id), q));
    assert.ok(expected.includes("c05"), "the probe matches its own card");
    await searchbox(page).fill(q);
    await waitRows(page, expected.length);
    assert.deepEqual((await h.rowIds(page)).sort(), [...expected].sort(), `query ${JSON.stringify(q)}`);
  }
});

test("SL-5 search is live and case-insensitive: it narrows per keystroke", async () => {
  const all = h.CARDS.map((c) => c.id);
  const { page } = await h.open({ route: "/saved", saved: all, device: h.DESKTOP });
  await page.waitForSelector(ROWS);
  const word = "HORSE";
  let prev = all.length;
  let typed = "";
  for (const ch of word) {
    typed += ch;
    await searchbox(page).pressSequentially(ch);
    const expected = all.filter((id) => matches(h.card(id), typed)).length;
    await waitRows(page, expected);
    assert.ok(expected <= prev, "never grows while typing");
    prev = expected;
  }
  assert.equal(prev, 1);
  assert.deepEqual(await h.rowIds(page), ["c01"]);
});

test("SL-6 search only searches saved cards", async () => {
  const { page } = await h.open({ route: "/saved", saved: ["c01", "c02"], device: h.DESKTOP });
  await page.waitForSelector(ROWS);
  await searchbox(page).fill(h.card("c14").cue);
  await page.locator('[data-testid="saved-no-results"]:visible').waitFor();
  assert.equal(await rowCount(page), 0);
});

test("SL-7 groups with no match are hidden while searching", async () => {
  const { page } = await h.open({ route: "/saved", saved: FIVE, device: h.DESKTOP });
  await page.waitForSelector(ROWS);
  assert.equal(await page.locator('[data-testid="move-group"]:visible').count(), 3);
  await searchbox(page).fill(h.card("c03").cue);
  await waitRows(page, FIVE.filter((id) => matches(h.card(id), h.card("c03").cue)).length);
  assert.equal(await page.locator('[data-testid="move-group"]:visible').count(), 1);
});

test("SL-8 clear: the clear button and Escape empty the field and restore the list", async () => {
  const { page } = await h.open({ route: "/saved", saved: FIVE, device: h.DESKTOP });
  await page.waitForSelector(ROWS);
  const field = searchbox(page);
  await field.fill("horse");
  await waitRows(page, 1);
  await page.locator('[data-testid="search-clear"]:visible').click();
  await waitRows(page, FIVE.length);
  assert.equal(await field.inputValue(), "");
  await field.fill("horse");
  await waitRows(page, 1);
  await field.press("Escape");
  await waitRows(page, FIVE.length);
  assert.equal(await field.inputValue(), "");
});

test("SL-9 empty state: message, no search, no detail pane, centred on desktop", async () => {
  const phone = await h.open({ route: "/saved", device: h.PHONE });
  await phone.page.locator('[data-testid="saved-empty"]:visible').waitFor();
  assert.match(await phone.page.locator('[data-testid="saved-empty"]').innerText(), /Nothing saved yet/);
  assert.equal(await phone.page.getByRole("searchbox").count(), 0);
  const { page } = await h.open({ route: "/saved", device: h.DESKTOP });
  const empty = page.locator('[data-testid="saved-empty"]:visible');
  await empty.waitFor();
  assert.equal(await page.getByRole("searchbox").count(), 0);
  assert.equal(await page.locator('[data-testid="detail-placeholder"]').count(), 0);
  const b = await h.box(empty);
  const container = await page.evaluate(() => {
    const e = document.querySelector('[data-testid="saved-empty"]');
    const r = e.parentElement.getBoundingClientRect();
    return r.x + r.width / 2;
  });
  assert.ok(Math.abs(b.x + b.width / 2 - container) <= 8, `message centre ${b.x + b.width / 2} vs ${container}`);
  assert.ok((await page.locator('[data-testid="saved-empty"]').innerText()).includes("heart"));
});

test("SL-10 no results: No matches, helper and Clear search that restores the list", async () => {
  const { page } = await h.open({ route: "/saved", saved: FIVE, device: h.PHONE });
  await page.waitForSelector(ROWS);
  await searchbox(page).fill("zzzqqq");
  const none = page.locator('[data-testid="saved-no-results"]:visible');
  await none.waitFor();
  const text = await none.innerText();
  assert.match(text, /No matches/);
  assert.ok(text.replace(/No matches|Clear search/g, "").trim().length > 0, "a helper line");
  await none.getByRole("button", { name: "Clear search" }).click();
  await waitRows(page, FIVE.length);
  assert.equal(await searchbox(page).inputValue(), "");
});

test("SL-11 loading: no empty-state flash when saves exist; skeleton without JavaScript", async () => {
  const { page } = await h.open({
    route: "/saved",
    saved: FIVE,
    device: h.PHONE,
    init: () => {
      window.__emptySeen = false;
      const probe = () => {
        if (document.querySelector('[data-testid="saved-empty"]')) window.__emptySeen = true;
      };
      new MutationObserver(probe).observe(document, { childList: true, subtree: true });
      const loop = () => {
        probe();
        requestAnimationFrame(loop);
      };
      loop();
    },
  });
  await page.waitForSelector(ROWS);
  await h.frame(page);
  assert.equal(await page.evaluate(() => window.__emptySeen), false, "the empty state never appeared");
  const bare = await h.open({ route: "/saved", device: h.PHONE, javaScriptEnabled: false, wait: false });
  assert.ok(await bare.page.locator('[data-testid="saved-skeleton"]').first().isVisible());
});

test("SL-12 order inside a group is save order, oldest first", async () => {
  const a = await h.open({ route: "/saved", saved: ["c02", "c01"], device: h.PHONE });
  await a.page.waitForSelector(ROWS);
  assert.deepEqual(await h.rowIds(a.page), ["c02", "c01"]);
  const b = await h.open({ route: "/saved", saved: ["c01", "c02"], device: h.PHONE });
  await b.page.waitForSelector(ROWS);
  assert.deepEqual(await h.rowIds(b.page), ["c01", "c02"]);
});

test("SL-13 phone layout: one column, search sticky, the last row clears the nav", async () => {
  const all = h.CARDS.map((c) => c.id);
  const { page } = await h.open({ route: "/saved", saved: all, device: h.PHONE });
  await page.waitForSelector(ROWS);
  const col = await page.evaluate(() => {
    const xs = [...document.querySelectorAll('[data-testid="saved-row"]')]
      .filter((e) => e.getClientRects().length > 0)
      .map((e) => Math.round(e.getBoundingClientRect().x));
    return new Set(xs).size;
  });
  assert.equal(col, 1, "one column");
  const sticky = await searchbox(page).evaluate((e) => {
    let el = e;
    while (el && el !== document.body) {
      if (getComputedStyle(el).position === "sticky") return true;
      el = el.parentElement;
    }
    return false;
  });
  assert.ok(sticky, "search is sticky");
  const top0 = (await h.box(searchbox(page))).y;
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForFunction(() => window.scrollY > 100);
  assert.ok(Math.abs((await h.box(searchbox(page))).y - top0) < 80, "search stays near the top while scrolled");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForFunction(() => Math.abs(window.scrollY + window.innerHeight - document.documentElement.scrollHeight) <= 1);
  const lastBottom = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-testid="saved-row"]')].filter((e) => e.getClientRects().length > 0);
    return rows[rows.length - 1].getBoundingClientRect().bottom;
  });
  const navTop = (await h.navBox(page)).y;
  assert.ok(lastBottom < navTop, `last row bottom ${lastBottom} < nav top ${navTop}`);
});

test("SL-14 desktop layout: list about 400 px on the left, detail pane to its right", async () => {
  const { page } = await h.open({ route: "/saved", saved: FIVE, device: h.DESKTOP });
  await page.waitForSelector(ROWS);
  const list = await h.box(page.locator('[data-testid="saved-list"]:visible'));
  assert.ok(list.width >= 380 && list.width <= 420, `list width ${list.width}`);
  const ph = await h.box(page.locator('[data-testid="detail-placeholder"]:visible'));
  assert.ok(ph.x >= list.x + list.width - 1, "placeholder right of the list");
  await h.openSavedRow(page, "c01");
  const detail = await h.box(page.locator('[data-testid="card-detail"]:visible'));
  assert.ok(detail.x >= list.x + list.width - 1, "detail right of the list");
});

test("SL-15 keyboard: Tab reaches search, then rows in order; Enter opens", async () => {
  const { page } = await h.open({ route: "/saved", saved: FIVE, device: h.DESKTOP });
  await page.waitForSelector(ROWS);
  const where = () =>
    page.evaluate(() => {
      const e = document.activeElement;
      if (!e) return null;
      if (e.getAttribute("role") === "searchbox" || e.type === "search") return "search";
      return e.getAttribute("data-testid") === "saved-row" ? e.getAttribute("data-card-id") : null;
    });
  let at = null;
  for (let i = 0; i < 15 && at !== "search"; i++) {
    await page.keyboard.press("Tab");
    at = await where();
  }
  assert.equal(at, "search");
  const want = await h.rowIds(page);
  const got = [];
  for (let i = 0; i < want.length + 3 && got.length < want.length; i++) {
    await page.keyboard.press("Tab");
    const w = await where();
    if (w && w !== "search") got.push(w);
  }
  assert.deepEqual(got, want);
  await page.locator(`[data-testid="saved-row"][data-card-id="${want[0]}"]:visible`).focus();
  await page.keyboard.press("Enter");
  await page.locator(`[data-testid="card-detail"][data-card-id="${want[0]}"]`).waitFor({ state: "visible" });
});

test("SL-16 the search query survives a visit to the feed", async () => {
  const { page } = await h.open({ device: h.DESKTOP, route: "/saved", saved: ["c01", "c03", "c05"] });
  await searchbox(page).fill("horse");
  await waitRows(page, 1);
  await page.getByRole("link", { name: "Feed" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  await page.getByRole("link", { name: "Saved" }).click();
  await page.waitForURL("**/saved");
  assert.equal(await searchbox(page).inputValue(), "horse");
  await waitRows(page, 1);
});
