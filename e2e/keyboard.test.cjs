/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/*
 * FEATURE_INVENTORY section 12: keyboard and focus (KB-1 .. KB-10).
 *
 * KB-4 root cause (the old flake, seen three times): the helper that walked
 * to the broken-clip card only ever pressed ArrowDown. The deck is shuffled
 * per visit, so about one visit in fourteen the broken card sat before the
 * start card; the helper then ran to the end of the deck, where ArrowDown
 * does nothing, and its wait for the active card to change timed out after
 * 5 s. `h.goToCard` now reads the deck order and walks in the right
 * direction, presses once per card in a burst, then waits on state (the
 * active id is the target and the scroller stopped on its slide), not on a
 * longer timeout.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const h = require("./support/harness.cjs").create(test);

const mutedOf = (page) =>
  page.evaluate((s) => document.querySelector(`${s} [data-testid="mute"]`).getAttribute("data-muted"), h.ACTIVE);
const waitMuted = (page, value) =>
  page.waitForFunction(
    ({ s, value }) => document.querySelector(`${s} [data-testid="mute"]`)?.getAttribute("data-muted") === value,
    { s: h.ACTIVE, value },
  );

test("KB-1 ArrowDown / J go next, ArrowUp / K go previous, in DOM order", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  const order = await h.domOrder(page);
  const seq = [];
  for (const key of ["j", "ArrowDown", "ArrowDown", "k", "ArrowUp", "ArrowUp"]) {
    seq.push(await h.step(page, key));
  }
  assert.deepEqual(seq, [order[1], order[2], order[3], order[2], order[1], order[0]]);
});

test("KB-2 Space and Enter flip (see FL-8)", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  await page.keyboard.press("Space");
  await page.waitForFunction((s) => document.querySelector(s).getAttribute("data-face") === "back", h.ACTIVE);
  await page.keyboard.press("Enter");
  await page.waitForFunction((s) => document.querySelector(s).getAttribute("data-face") === "front", h.ACTIVE);
});

test("KB-3 S saves on the back only (see SV-8)", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  await page.keyboard.press("s");
  await h.frame(page);
  assert.equal(await h.storage(page), null);
  await h.flip(page);
  await page.keyboard.press("s");
  await page.waitForFunction(() => (JSON.parse(localStorage.getItem("quipdeck:saved:v1") || "[]") || []).length === 1);
});

test("KB-4 M mutes on the back only, and not in the error state", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  await h.startHealthy(page, 0);
  await page.keyboard.press("m");
  await h.frame(page);
  assert.equal(await mutedOf(page), "true", "no effect on the front");
  await h.flipAndPlay(page);
  await page.keyboard.press("m");
  await waitMuted(page, "false");
  await page.keyboard.press("m");
  await waitMuted(page, "true");
  await h.goToCard(page, h.BROKEN); // either direction (the flake fix)
  await h.flip(page);
  await h.waitClip(page, "error");
  await page.keyboard.press("m");
  await h.frame(page);
  assert.equal(await mutedOf(page), "true", "no effect in the error state");
});

test("KB-4 the walk to a card works backwards as well as forwards (flake regression)", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  const order = await h.domOrder(page);
  const last = order.length - 1;
  // Start from the far end so the target is behind us whenever it can be.
  await h.goToIndex(page, last);
  const target = order.indexOf(h.BROKEN) === last ? order[0] : h.BROKEN;
  await h.goToCard(page, target);
  assert.equal(await h.activeId(page), target);
  // And forwards again from the very first card.
  await h.goToIndex(page, 0);
  await h.goToCard(page, order[Math.min(3, last)]);
  assert.equal(await h.activeId(page), order[Math.min(3, last)]);
});

test("KB-5 shortcuts are ignored while typing, with a modifier held, or with a dialog open", async () => {
  // Typing in the Saved search.
  const saved = await h.open({ route: "/saved", saved: ["c01", "c02", "c03"], device: h.DESKTOP });
  const box = saved.page.getByRole("searchbox", { name: "Search saved" });
  await box.waitFor();
  await box.click();
  await saved.page.keyboard.type("sm");
  assert.equal(await box.inputValue(), "sm");
  assert.equal(await h.storage(saved.page).then((s) => s.length), 3, "S did not change saves");
  // Feed: modifiers and an open dialog.
  const { page } = await h.open({ device: h.DESKTOP });
  await h.flip(page);
  const id = await h.activeId(page);
  for (const mod of ["Control", "Alt", "Meta"]) {
    await page.keyboard.down(mod);
    await page.keyboard.press("m");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.up(mod);
  }
  await h.frame(page);
  assert.equal(await mutedOf(page), "true", "no mute with a modifier");
  assert.equal(await h.activeId(page), id, "no move with a modifier");
  await page.evaluate(() => {
    const d = document.createElement("div");
    d.setAttribute("role", "dialog");
    d.id = "probe-dialog";
    d.style.cssText = "position:fixed;left:0;top:0;width:10px;height:10px";
    document.body.appendChild(d);
  });
  await page.keyboard.press("m");
  await page.keyboard.press("s");
  await page.keyboard.press("ArrowDown");
  await h.frame(page);
  assert.equal(await mutedOf(page), "true", "no mute with a dialog open");
  assert.equal(await h.activeId(page), id, "no move with a dialog open");
  assert.equal(await h.storage(page), null, "no save with a dialog open");
  await page.evaluate(() => document.getElementById("probe-dialog").remove());
  await page.keyboard.press("m");
  await waitMuted(page, "false");
});

test("KB-6 inactive cards are inert: Tab never enters another card", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  await h.next(page);
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    const inInactive = await page.evaluate(() => {
      const e = document.activeElement;
      const card = e && e.closest ? e.closest('[data-testid="card"]') : null;
      return !!card && card.getAttribute("data-active") === "false";
    });
    assert.ok(!inInactive, `Tab ${i + 1} landed in an inactive card`);
  }
});

test("KB-7 focus follows navigation: after J, the active card root has focus", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  await h.step(page, "j");
  await page.waitForFunction((s) => document.activeElement === document.querySelector(s), h.ACTIVE);
  await h.step(page, "ArrowDown");
  await page.waitForFunction((s) => document.activeElement === document.querySelector(s), h.ACTIVE);
});

test("KB-8 every control shows a focus indicator on keyboard focus", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  await h.startHealthy(page, 1);
  await h.next(page); // so Previous is enabled
  const targets = [
    ['nav[aria-label="Primary"] a:nth-of-type(1)', "Feed link"],
    ['nav[aria-label="Primary"] a:nth-of-type(2)', "Saved link"],
    ['[data-testid="feed-prev"]', "previous"],
    ['[data-testid="feed-next"]', "next"],
    [`${h.ACTIVE} [data-testid="reveal"]`, "reveal"],
  ];
  const check = async (selector, label) => {
    // Reach it with the keyboard so :focus-visible applies.
    let reached = false;
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    for (let i = 0; i < 40 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate((sel) => document.activeElement === document.querySelector(sel), selector);
    }
    assert.ok(reached, `Tab reaches ${label}`);
    const el = page.locator(selector);
    await page.waitForFunction(
      (sel) => {
        const e = document.querySelector(sel);
        const cs = getComputedStyle(e);
        const sig = cs.outlineWidth + cs.outlineStyle + cs.boxShadow;
        const stable = window.__sig === sig;
        window.__sig = sig;
        return stable;
      },
      selector,
      { polling: 100 },
    );
    const style = await el.evaluate((e) => {
      const cs = getComputedStyle(e);
      return { ow: parseFloat(cs.outlineWidth), os: cs.outlineStyle, shadow: cs.boxShadow };
    });
    const hasOutline = style.os !== "none" && style.ow > 0;
    const hasRing = style.shadow && style.shadow !== "none";
    assert.ok(hasOutline || hasRing, `${label}: outline ${style.os} ${style.ow}px, shadow ${style.shadow}`);
    // The pixels differ between focused and not focused.
    const b = await h.box(el);
    const clip = { x: Math.max(0, b.x - 8), y: Math.max(0, b.y - 8), width: b.width + 16, height: b.height + 16 };
    const focused = await page.screenshot({ clip, animations: "disabled" });
    await page.evaluate(() => document.activeElement.blur());
    await page.waitForFunction((sel) => document.activeElement !== document.querySelector(sel), selector);
    await h.frame(page);
    await page.waitForTimeout(250); // the ring fades out over its transition
    const plain = await page.screenshot({ clip, animations: "disabled" });
    assert.ok((await h.pixelDiff(focused, plain)) > 0.02, `${label}: focused pixels differ from unfocused`);
  };
  for (const [sel, label] of targets) await check(sel, label);
  // The back's controls.
  await h.flipAndPlay(page);
  for (const [sel, label] of [
    [`${h.ACTIVE} [data-testid="flip-back"]`, "Back to cue"],
    [`${h.ACTIVE} [data-testid="mute"]`, "mute"],
    [`${h.ACTIVE} [data-testid="heart"]`, "heart"],
  ]) {
    await check(sel, label);
  }
});

test("KB-9 desktop previous / next buttons work, disable at the ends, and are absent on phone", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  const order = await h.domOrder(page);
  const prev = page.locator('[data-testid="feed-prev"]');
  const next = page.locator('[data-testid="feed-next"]');
  assert.ok(await prev.isDisabled(), "Previous disabled on the first card");
  assert.ok(await next.isEnabled());
  await next.click();
  await page.waitForFunction(
    ({ s, id }) => document.querySelector(s)?.getAttribute("data-card-id") === id,
    { s: h.ACTIVE, id: order[1] },
  );
  await h.settled(page);
  assert.ok(await prev.isEnabled());
  await prev.click();
  await page.waitForFunction(
    ({ s, id }) => document.querySelector(s)?.getAttribute("data-card-id") === id,
    { s: h.ACTIVE, id: order[0] },
  );
  await h.goToIndex(page, order.length - 1);
  assert.ok(await next.isDisabled(), "Next disabled on the last card");
  assert.ok(await prev.isEnabled());
  const phone = await h.open({ device: h.PHONE });
  assert.equal(await phone.page.locator('[data-testid="feed-prev"], [data-testid="feed-next"]').count(), 0);
});

test("KB-10 key hints: one line on desktop, absent on phone and coarse pointers", async () => {
  for (const device of [h.DESKTOP, h.DESKTOP_SMALL]) {
    const { page } = await h.open({ device });
    const hints = page.locator('[data-testid="key-hints"]');
    assert.equal(await hints.count(), 1);
    assert.ok(await hints.isVisible());
    const text = await hints.innerText();
    assert.ok(!text.includes("\n"), "one line");
    assert.match(text, /Space/);
    const lineHeight = await hints.evaluate((e) => e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight));
    assert.ok(lineHeight < 1.6, `renders on one line (${lineHeight})`);
  }
  const phone = await h.open({ device: h.PHONE });
  assert.equal(await phone.page.locator('[data-testid="key-hints"]').count(), 0);
  const coarse = await h.open({ device: { viewport: { width: 1440, height: 900 }, hasTouch: true, isMobile: true } });
  assert.equal(await coarse.page.locator('[data-testid="key-hints"]').count(), 0);
});

test("KB-10 (Gate 4) the key-hint line fades out after the first key press", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  const hints = page.locator('[data-testid="key-hints"]');
  const opacity = () => hints.evaluate((e) => parseFloat(getComputedStyle(e).opacity));
  assert.ok((await opacity()) > 0.5, "visible before any key");
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector('[data-testid="key-hints"]')).opacity) === 0);
  assert.equal(await opacity(), 0);
  // It stays gone: another key and the hint is still faded.
  await page.keyboard.press("ArrowUp");
  await h.frame(page);
  assert.equal(await opacity(), 0);
});
