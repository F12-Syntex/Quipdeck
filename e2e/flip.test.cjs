/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/* FEATURE_INVENTORY section 6: flip (FL-1 .. FL-12). */
const test = require("node:test");
const assert = require("node:assert/strict");
const h = require("./support/harness.cjs").create(test);

const faceIs = (page, want) =>
  page.waitForFunction(
    ({ s, want }) => document.querySelector(s)?.getAttribute("data-face") === want,
    { s: h.ACTIVE, want },
  );
/** The flip has finished: the visible face has no transform at rest. */
const atRest = (page, which) =>
  page.waitForFunction(
    ({ s, which }) => {
      const face = document.querySelector(`${s} [data-testid="card-${which}"]`);
      const cs = face && getComputedStyle(face);
      return cs && cs.visibility === "visible" && cs.transform === "none";
    },
    { s: h.ACTIVE, which },
  );
const act = (page, sel) => page.locator(`${h.ACTIVE} ${sel}`);

test("FL-1 a click on the card shows the back", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  await h.startHealthy(page, 0);
  const b = await h.box(page.locator(h.ACTIVE));
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await faceIs(page, "back");
  await atRest(page, "back");
  assert.ok(await act(page, '[data-testid="card-back"]').isVisible());
  assert.ok(!(await act(page, '[data-testid="card-front"]').isVisible()));
});

test("FL-1 a tap on the card shows the back (phone)", async () => {
  const { page } = await h.open({ device: h.PHONE });
  await page.locator(h.ACTIVE).tap({ position: { x: 100, y: 300 } });
  await faceIs(page, "back");
  await atRest(page, "back");
  assert.ok(await act(page, '[data-testid="card-back"]').isVisible());
});

test("FL-2 a click on the back breakdown flips back to the front", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  await h.startHealthy(page, 0);
  await h.flipAndPlay(page);
  await act(page, '[data-testid="breakdown"]').click();
  await faceIs(page, "front");
  await atRest(page, "front");
  assert.ok(await act(page, '[data-testid="card-front"]').isVisible());
});

test("FL-3 the heart does not flip; it toggles aria-pressed", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  await h.flip(page);
  const heart = act(page, '[data-testid="heart"]');
  assert.equal(await heart.getAttribute("aria-pressed"), "false");
  await heart.click();
  await page.waitForFunction(
    (s) => document.querySelector(`${s} [data-testid="heart"]`).getAttribute("aria-pressed") === "true",
    h.ACTIVE,
  );
  assert.equal(await h.face(page), "back");
  await heart.click();
  await page.waitForFunction(
    (s) => document.querySelector(`${s} [data-testid="heart"]`).getAttribute("aria-pressed") === "false",
    h.ACTIVE,
  );
  assert.equal(await h.face(page), "back");
});

test("FL-4 the mute button does not flip", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  await h.startHealthy(page, 0);
  await h.flipAndPlay(page);
  await act(page, '[data-testid="mute"]').click();
  await page.waitForFunction(
    (s) => document.querySelector(`${s} [data-testid="mute"]`).getAttribute("data-muted") === "false",
    h.ACTIVE,
  );
  assert.equal(await h.face(page), "back");
});

test("FL-5 clicking the clip does not flip", async () => {
  const { page } = await h.open();
  await h.startHealthy(page, 0);
  await h.flipAndPlay(page);
  const b = await h.box(act(page, '[data-testid="clip"]'));
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  // A flip would show at once in data-face; give the click two frames to land.
  await h.frame(page);
  assert.equal(await h.face(page), "back");
  assert.equal(await h.iframes(page), 1, "player still there");
});

test("FL-6 flip state persists while scrolling", async () => {
  const { page } = await h.open({ device: h.PHONE });
  const first = await h.startHealthy(page, 2);
  const order = await h.domOrder(page);
  await h.flip(page);
  await h.next(page);
  await h.next(page);
  await h.prev(page);
  await h.prev(page);
  assert.equal(await h.activeId(page), first);
  assert.equal(await h.face(page), "back");
  const faces = await h.faces(page);
  assert.equal(faces[order[order.indexOf(first) + 1]], "front");
  assert.equal(faces[order[order.indexOf(first) + 2]], "front");
});

test("FL-7 the hidden face is inert and Tab never lands in it", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  await h.startHealthy(page, 0);
  const hiddenFaceHasFocus = (hidden) =>
    page.evaluate(
      ({ s, hidden }) => {
        const face = document.querySelector(`${s} [data-testid="card-${hidden}"]`);
        return face.contains(document.activeElement);
      },
      { s: h.ACTIVE, hidden },
    );
  for (const [visible, hidden] of [["front", "back"], ["back", "front"]]) {
    if (visible === "back") await h.flipAndPlay(page);
    assert.equal(await act(page, `[data-testid="card-${hidden}"]`).getAttribute("inert"), "");
    assert.equal(await act(page, `[data-testid="card-${visible}"]`).getAttribute("inert"), null);
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      assert.ok(!(await hiddenFaceHasFocus(hidden)), `Tab ${i} landed in the hidden ${hidden}`);
    }
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
  }
});

test("FL-8 Space and Enter flip the active card when focus is not on a control", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press("Space");
  await faceIs(page, "back");
  await page.keyboard.press("Enter");
  await faceIs(page, "front");
});

test("FL-9 the reveal and Back to cue buttons flip by keyboard; Back to cue shows when focused", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  await h.startHealthy(page, 0);
  const reveal = act(page, '[data-testid="reveal"]');
  await reveal.focus();
  await page.keyboard.press("Enter");
  await faceIs(page, "back");
  // Focus moves to the back's button once the back is shown.
  await page.waitForFunction(() => document.activeElement?.getAttribute("data-testid") === "flip-back");
  const b = await h.box(act(page, '[data-testid="flip-back"]'));
  assert.ok(b.width > 0 && b.height > 0);
  // The focus fade is a short transition: wait for it to land on 1.
  await page.waitForFunction(
    (s) => getComputedStyle(document.querySelector(`${s} [data-testid="flip-back"]`)).opacity === "1",
    h.ACTIVE,
  );
  await page.keyboard.press("Space");
  await faceIs(page, "front");
  await page.waitForFunction(() => document.activeElement?.getAttribute("data-testid") === "reveal");
});

test("FL-10 after the flip settles the visible face has no transform", async () => {
  const { page } = await h.open({ device: h.PHONE });
  await h.flip(page);
  await atRest(page, "back");
  assert.equal(await act(page, '[data-testid="card-back"]').evaluate((e) => getComputedStyle(e).transform), "none");
  await h.unflip(page);
  await atRest(page, "front");
  assert.equal(await act(page, '[data-testid="card-front"]').evaluate((e) => getComputedStyle(e).transform), "none");
});

test("FL-11 reduced motion: crossfade only, the back is visible within 300 ms", async () => {
  const { page } = await h.open({ device: h.DESKTOP, reducedMotion: "reduce" });
  await page.evaluate((s) => {
    const card = document.querySelector(s);
    window.__flipProbe = { threeD: false, shownAt: null, t0: performance.now() };
    const tick = () => {
      for (const el of [card, ...card.querySelectorAll("*")]) {
        const t = getComputedStyle(el).transform;
        if (/matrix3d|perspective|rotate/.test(t)) window.__flipProbe.threeD = true;
      }
      const back = card.querySelector('[data-testid="card-back"]');
      if (window.__flipProbe.shownAt === null && getComputedStyle(back).visibility === "visible") {
        window.__flipProbe.shownAt = performance.now() - window.__flipProbe.t0;
      }
      if (performance.now() - window.__flipProbe.t0 < 700) requestAnimationFrame(tick);
      else window.__flipProbe.done = true;
    };
    window.__flipProbe.t0 = performance.now();
    requestAnimationFrame(tick);
  }, h.ACTIVE);
  await page.keyboard.press("Space");
  await page.waitForFunction(() => window.__flipProbe.done, null, { timeout: 5000 });
  const probe = await page.evaluate(() => window.__flipProbe);
  assert.equal(probe.threeD, false, "no 3D transform during the flip");
  assert.ok(probe.shownAt !== null && probe.shownAt <= 300, `back visible after ${probe.shownAt} ms`);
});

test("FL-12 selecting text in the breakdown does not flip", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  await h.startHealthy(page, 0);
  await h.flipAndPlay(page);
  const b = await h.box(act(page, '[data-testid="breakdown"]'));
  await page.mouse.move(b.x + 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + Math.min(b.width - 2, 160), b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
  assert.ok((await page.evaluate(() => String(getSelection()))).length > 0, "text is selected");
  await h.frame(page);
  assert.equal(await h.face(page), "back");
});
