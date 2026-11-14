/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/*
 * FEATURE_INVENTORY sections 5 and 7: card front (CF-1 .. CF-6) and card
 * back (CB-1 .. CB-10). The back is measured once per viewport for every
 * card (memoised, plain JSON), then each id asserts from the measurement.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const h = require("./support/harness.cjs").create(test);

const R = (e) => {
  if (!e) return null;
  const b = e.getBoundingClientRect();
  return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom };
};

/** Measure the active card's back in the page. Runs in the browser. */
function measureBack(activeSel) {
  const card = document.querySelector(activeSel);
  const back = card.querySelector('[data-testid="card-back"]');
  const q = (s, root = back) => root.querySelector(s);
  const rect = (e) => {
    if (!e) return null;
    const b = e.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom };
  };
  const cardRect = rect(card);
  const overflow = [];
  const outside = [];
  for (const el of [back, ...back.querySelectorAll("*")]) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const sr = el.getBoundingClientRect();
    if (sr.width === 0 && sr.height === 0) continue;
    // The inventory predicate, literally: no element scrolls.
    if (el.scrollHeight > el.clientHeight + 1) {
      overflow.push(`${el.getAttribute("data-testid") || el.tagName} ${el.scrollHeight}>${el.clientHeight}`);
    }
    const opacity = parseFloat(cs.opacity);
    if (opacity === 0 || sr.width <= 1 || sr.height <= 1) continue;
    if (sr.bottom > cardRect.b + 1 || sr.right > cardRect.r + 1 || sr.top < cardRect.y - 1 || sr.left < cardRect.x - 1) {
      outside.push(el.getAttribute("data-testid") || el.tagName);
    }
  }
  const lines = [...back.querySelectorAll('[data-testid="line"]')].map((e) => e.textContent);
  const speakers = [...back.querySelectorAll('[data-testid="speaker"]')].map((e) => e.textContent);
  const ex = q('[data-testid="exchange"]');
  return {
    id: card.getAttribute("data-card-id"),
    card: cardRect,
    move: rect(q('[data-testid="move"]')),
    moveText: q('[data-testid="move"]').textContent.trim(),
    exchange: rect(ex),
    exchangeTag: ex.tagName,
    exchangeItems: ex.children.length,
    trigger: rect(q('[data-testid="trigger"]')),
    response: rect(q('[data-testid="response"]')),
    lines,
    speakers,
    breakdown: rect(q('[data-testid="breakdown"]')),
    breakdownText: q('[data-testid="breakdown"]').textContent.trim(),
    clip: rect(q('[data-testid="clip"]')),
    heart: rect(q('[data-testid="heart"]')),
    mute: rect(q('[data-testid="mute"]')),
    source: q('[data-testid="source"]') ? q('[data-testid="source"]').textContent.trim() : null,
    overflow,
    outside,
    viewport: { w: window.innerWidth, h: window.innerHeight },
  };
}

async function backReady(page) {
  // At rest the visible face has no transform and the back is the shown face.
  await page.waitForFunction((s) => {
    const card = document.querySelector(s);
    const back = card && card.querySelector('[data-testid="card-back"]');
    return card && card.getAttribute("data-face") === "back" && getComputedStyle(back).transform === "none" &&
      getComputedStyle(back).visibility === "visible";
  }, h.ACTIVE);
}

const memo = new Map();
/** Flip and measure every card for a device; cached by name. */
function gather(name, device) {
  if (!memo.has(name)) {
    memo.set(
      name,
      (async () => {
        const { page } = await h.open({ device });
        const order = await h.domOrder(page);
        const out = [];
        for (let i = 0; i < order.length; i++) {
          if (i > 0) await h.next(page);
          await page.keyboard.press("Space");
          await backReady(page);
          out.push(await page.evaluate(measureBack, h.ACTIVE));
        }
        return out;
      })(),
    );
  }
  return memo.get(name);
}

// ------------------------------------------------------------ card front
test("CF-1 the cue is the card cue and the largest text on the face", async () => {
  for (const device of [h.PHONE, h.DESKTOP]) {
    const { page } = await h.open({ device });
    const cues = await page.evaluate(() =>
      Object.fromEntries(
        [...document.querySelectorAll('[data-testid="feed"] [data-testid="card"]')].map((c) => [
          c.getAttribute("data-card-id"),
          c.querySelector('[data-testid="card-front"] [data-testid="cue"]').textContent.trim(),
        ]),
      ),
    );
    for (const c of h.CARDS) assert.equal(cues[c.id], c.cue, c.id);
    const sizes = await page.evaluate((s) => {
      const front = document.querySelector(`${s} [data-testid="card-front"]`);
      return {
        cue: parseFloat(getComputedStyle(front.querySelector('[data-testid="cue"]')).fontSize),
        move: parseFloat(getComputedStyle(front.querySelector('[data-testid="move"]')).fontSize),
        all: [...front.querySelectorAll("*")]
          .filter((e) => e.children.length === 0 && e.textContent.trim())
          .map((e) => parseFloat(getComputedStyle(e).fontSize)),
      };
    }, h.ACTIVE);
    assert.ok(sizes.cue > sizes.move, `cue ${sizes.cue} vs move ${sizes.move}`);
    assert.equal(Math.max(...sizes.all), sizes.cue, "cue is the largest text");
    assert.equal(
      await page.locator(`${h.ACTIVE} [data-testid="card-front"] [data-testid="cue"]`).evaluate((e) => /^H[1-6]$/.test(e.tagName)),
      true,
      "cue is a heading",
    );
  }
});

test("CF-2 the move label is the data label, below the cue and smaller", async () => {
  const { page } = await h.open({ device: h.PHONE });
  const info = await page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('[data-testid="feed"] [data-testid="card"]')].map((c) => [
        c.getAttribute("data-card-id"),
        c.querySelector('[data-testid="card-front"] [data-testid="move"]').textContent.trim(),
      ]),
    ),
  );
  for (const c of h.CARDS) assert.equal(info[c.id], h.moveLabel(c.move), c.id);
  const cue = await h.box(page.locator(`${h.ACTIVE} [data-testid="card-front"] [data-testid="cue"]`));
  const move = await h.box(page.locator(`${h.ACTIVE} [data-testid="card-front"] [data-testid="move"]`));
  assert.ok(cue.y + cue.height <= move.y + 1, "cue box above move box");
});

test("CF-3 the hint reads Tap to reveal (touch) or Click to reveal (mouse)", async () => {
  const touch = await h.open({ device: h.PHONE });
  const tap = touch.page.locator(`${h.ACTIVE} [data-testid="card-front"]`).getByRole("button", { name: /Tap to reveal/ });
  assert.ok(await tap.isVisible());
  const mouse = await h.open({ device: h.DESKTOP });
  const click = mouse.page.locator(`${h.ACTIVE} [data-testid="card-front"]`).getByRole("button", { name: /Click to reveal/ });
  assert.ok(await click.isVisible());
});

test("CF-4 the front has no iframe, heart, mute, clip or video icon", async () => {
  const { page } = await h.open({ device: h.PHONE });
  const front = page.locator(`${h.ACTIVE} [data-testid="card-front"]`);
  for (const sel of ["iframe", '[data-testid="heart"]', '[data-testid="mute"]', '[data-testid="clip"]', 'svg[data-icon="video"]']) {
    assert.equal(await front.locator(sel).count(), 0, sel);
  }
});

test("CF-5 phone layout: cue centred in its zone, move panel and hint at the bottom, one left edge", async () => {
  // REDESIGN_V2 5.1: eyebrow row, cue zone (cue vertically centred), footer
  // panel (move label, reveal button) pinned to the bottom of the card.
  for (const device of [h.PHONE, h.SMALL]) {
    const { page } = await h.open({ device });
    const card = await h.box(page.locator(h.ACTIVE));
    const g = await page.evaluate((s) => {
      const front = document.querySelector(`${s} [data-testid="card-front"]`);
      const r = (e) => {
        const b = e.getBoundingClientRect();
        return { x: b.x, y: b.y, w: b.width, h: b.height, b: b.bottom };
      };
      const cue = front.querySelector('[data-testid="cue"]');
      const move = front.querySelector('[data-testid="move"]');
      const panel = move.parentElement;
      return {
        cue: r(cue),
        zone: r(cue.parentElement),
        panel: r(panel),
        hint: r(front.querySelector('[data-testid="reveal"]')),
        move: r(move),
      };
    }, h.ACTIVE);
    assert.ok(g.hint.y >= card.y && g.hint.b <= card.y + card.height + 1, "hint inside the card");
    assert.ok(g.hint.y > card.y + card.height / 2, "hint in the lower half");
    assert.ok(g.hint.y >= g.panel.y && g.hint.b <= g.panel.b + 1, "hint inside the move panel");
    assert.ok(card.y + card.height - g.panel.b <= 25, `panel near the card bottom (${card.y + card.height - g.panel.b})`);
    assert.ok(Math.abs(g.cue.x - g.panel.x) <= 1, `cue ${g.cue.x} vs panel ${g.panel.x}: one left edge`);
    assert.ok(g.move.y > g.cue.b, "move label below the cue");
    const zoneMid = g.zone.y + g.zone.h / 2;
    const cueMid = g.cue.y + g.cue.h / 2;
    assert.ok(Math.abs(zoneMid - cueMid) <= 2, `cue centred in its zone (${cueMid} vs ${zoneMid})`);
    assert.ok(g.zone.h > card.height * 0.4, `cue zone is the bulk of the card (${g.zone.h})`);
  }
});

test("CF-6 desktop layout: landscape card, centred", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  const card = await h.box(page.locator(h.ACTIVE));
  assert.ok(card.width > card.height, `${card.width}x${card.height}`);
  assert.ok(Math.abs(card.x + card.width / 2 - 720) <= 4, `centre x ${card.x + card.width / 2}`);
  assert.ok(Math.abs(card.y + card.height / 2 - 450) <= 4, `centre y ${card.y + card.height / 2}`);
});

// ------------------------------------------------------------- card back
test("CB-1 the move tag sits right under the clip, above everything else, and equals the label", async () => {
  // REDESIGN_V2 5.2: clip first (full-bleed), then the tag row.
  const data = await gather("phone", h.PHONE);
  for (const m of data) {
    const card = h.card(m.id);
    assert.equal(m.moveText, h.moveLabel(card.move), m.id);
    assert.ok(m.clip.b <= m.move.y + 1, `${m.id}: clip above the move tag`);
    for (const key of ["exchange", "breakdown", "heart"]) {
      assert.ok(m.move.y + m.move.h <= m[key].y + 1, `${m.id}: move above ${key}`);
    }
    assert.ok(m.move.y - m.clip.b <= 32, `${m.id}: tag ${m.move.y - m.clip.b}px under the clip`);
  }
});

test("CB-2 the exchange is a two item list of trigger then response with speakers and lines", async () => {
  const data = await gather("phone", h.PHONE);
  for (const m of data) {
    const c = h.card(m.id);
    assert.equal(m.exchangeTag, "UL", m.id);
    assert.equal(m.exchangeItems, 2, m.id);
    assert.ok(m.trigger.y + m.trigger.h <= m.response.y + 1, `${m.id}: trigger above response`);
    assert.deepEqual(m.speakers, [c.trigger.speaker, c.response.speaker], m.id);
    assert.deepEqual(m.lines, [c.trigger.line, c.response.line], m.id);
  }
});

test("CB-3 trigger sits left, response right (stacked layout)", async () => {
  const data = await gather("phone", h.PHONE);
  for (const m of data) {
    assert.ok(m.trigger.x < m.response.x, `${m.id}: trigger left edge < response left edge`);
    assert.ok(m.response.r >= m.trigger.r - 0.5, `${m.id}: response right edge >= trigger right edge`);
  }
});

test("CB-4 breakdown equals the card breakdown and sits below the response", async () => {
  const data = await gather("phone", h.PHONE);
  for (const m of data) {
    assert.equal(m.breakdownText, h.card(m.id).breakdown, m.id);
    assert.ok(m.breakdown.y >= m.response.b - 1, `${m.id}: breakdown below response`);
  }
});

test("CB-5 every card back has a clip, full-bleed at the top when stacked", async () => {
  // REDESIGN_V2 5.2: the clip is the first block, flush to the top and sides.
  const data = await gather("phone", h.PHONE);
  assert.equal(data.length, h.CARDS.length);
  for (const m of data) {
    assert.ok(m.clip && m.clip.w > 0, `${m.id}: clip box`);
    if (m.id === h.BROKEN) continue; // the fallback collapses (CL-18 phone)
    assert.ok(Math.abs(m.clip.y - m.card.y) <= 1, `${m.id}: clip top ${m.clip.y} at the card top ${m.card.y}`);
    assert.ok(Math.abs(m.clip.w - m.card.w) <= 1, `${m.id}: clip ${m.clip.w} spans the card ${m.card.w}`);
    assert.ok(m.clip.b <= m.exchange.y, `${m.id}: clip above the exchange`);
    assert.ok(m.clip.b <= m.breakdown.y, `${m.id}: clip above the breakdown`);
  }
});

test("CB-6 heart and mute are at least 44x44 and in the bottom third (phone)", async () => {
  const data = await gather("phone", h.PHONE);
  for (const m of data) {
    for (const key of ["heart", "mute"]) {
      assert.ok(m[key].w >= 44 && m[key].h >= 44, `${m.id} ${key} ${m[key].w}x${m[key].h}`);
      assert.ok(m[key].y > 0.6 * m.viewport.h, `${m.id} ${key} top ${m[key].y}`);
    }
  }
});

test("CB-7 the source shows when the card has one and is absent otherwise", async () => {
  const data = await gather("phone", h.PHONE);
  for (const m of data) {
    const c = h.card(m.id);
    if (c.source) assert.equal(m.source, c.source, m.id);
    else assert.equal(m.source, null, m.id);
  }
});

for (const [name, device] of [["375x667", h.SMALL], ["360x640", h.TINY]]) {
  test(`CB-8 the back fits one viewport with no inner overflow at ${name}`, async () => {
    const data = await gather(name, device);
    for (const m of data) {
      assert.deepEqual(m.overflow, [], `${m.id} scrollable overflow`);
      assert.deepEqual(m.outside, [], `${m.id} content outside the card box`);
      assert.ok(m.card.b <= m.viewport.h + 1 && m.card.y >= -1, `${m.id} card within the viewport`);
    }
  });
}

for (const [name, device] of [["1440x900", h.DESKTOP], ["1024x768", h.DESKTOP_SMALL]]) {
  test(`CB-9 desktop two columns at ${name}: text left, clip right, clip >= 400 wide`, async () => {
    const { page } = await h.open({ device });
    await h.flip(page);
    await backReady(page);
    const m = await page.evaluate(measureBack, h.ACTIVE);
    assert.ok(m.exchange.r < m.clip.x, `exchange right ${m.exchange.r} < clip left ${m.clip.x}`);
    assert.ok(m.clip.w >= 400, `clip width ${m.clip.w}`);
  });
}

test("CB-10 the clip box is at least 200x200 at 360x640", async () => {
  const data = await gather("360x640", h.TINY);
  for (const m of data) assert.ok(m.clip.w >= 200 && m.clip.h >= 200, `${m.id} ${m.clip.w}x${m.clip.h}`);
});

void R;
