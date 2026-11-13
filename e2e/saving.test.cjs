/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";
/* FEATURE_INVENTORY section 9: saving (SV-1 .. SV-9). */
const test = require("node:test");
const assert = require("node:assert/strict");
const h = require("./support/harness.cjs").create(test);

const heart = (page) => page.locator(`${h.ACTIVE} [data-testid="heart"]`);
const pressed = (page, value) =>
  page.waitForFunction(
    ({ s, value }) => document.querySelector(`${s} [data-testid="heart"]`)?.getAttribute("aria-pressed") === value,
    { s: h.ACTIVE, value },
  );
const liveText = (page) =>
  page.evaluate(() => [...document.querySelectorAll('[data-testid="live"]')].map((e) => e.textContent).join("|"));

test("SV-1 the heart toggles save (aria-pressed)", async () => {
  const { page } = await h.open({ device: h.PHONE });
  await h.flip(page);
  assert.equal(await heart(page).getAttribute("aria-pressed"), "false");
  await heart(page).click();
  await pressed(page, "true");
  await heart(page).click();
  await pressed(page, "false");
});

test("SV-2 saves are stored on the device as a JSON array of ids in save order", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  await h.startHealthy(page, 1);
  const a = await h.activeId(page);
  await h.flip(page);
  await heart(page).click();
  await pressed(page, "true");
  await h.next(page);
  const b = await h.activeId(page);
  await h.flip(page);
  await heart(page).click();
  await pressed(page, "true");
  assert.deepEqual(await h.storage(page), [a, b]);
  // Unsaving removes it from the array and keeps the order of the rest.
  await heart(page).click();
  await pressed(page, "false");
  assert.deepEqual(await h.storage(page), [a]);
});

test("SV-3 a save survives a reload and shows on Saved", async () => {
  const { page } = await h.open();
  await h.startHealthy(page, 0);
  await h.flipAndPlay(page);
  const id = await h.activeId(page);
  await heart(page).click();
  await pressed(page, "true");
  await page.reload();
  await page.waitForSelector(h.FEED_READY);
  await h.goToCard(page, id);
  await h.flip(page);
  assert.equal(await heart(page).getAttribute("aria-pressed"), "true");
  await page.getByRole("link", { name: "Saved" }).click();
  await page.waitForURL("**/saved");
  await page.locator(`[data-testid="saved-row"][data-card-id="${id}"]:visible`).waitFor();
});

test("SV-4 saving makes no network request", async () => {
  const { page, requests } = await h.open({ device: h.PHONE });
  await h.startHealthy(page, 0);
  await h.flipAndPlay(page);
  const before = requests.length;
  await heart(page).click();
  await pressed(page, "true");
  await h.frame(page);
  await heart(page).click();
  await pressed(page, "false");
  await h.frame(page);
  assert.deepEqual(requests.slice(before), []);
});

test("SV-5 no hydration warning with pre-seeded storage on / and /saved", async () => {
  for (const route of ["/", "/saved"]) {
    const { page, logs } = await h.open({ route, saved: ["c01", "c03", "c05"], device: h.PHONE });
    if (route === "/saved") await page.waitForSelector('[data-testid="saved-row"]');
    else {
      await h.flip(page);
      await page.waitForSelector(`${h.ACTIVE} [data-testid="heart"]`);
    }
    await h.frame(page);
    assert.ok(!logs.some((l) => /hydrat/i.test(l)), `${route}: ${logs.join("\n")}`);
    assert.deepEqual(logs, [], route);
  }
});

test("SV-6 storage unavailable: saves work for the visit, no error shown", async () => {
  const { page, logs } = await h.open({
    device: h.PHONE,
    init: () => {
      Storage.prototype.setItem = function () {
        throw new DOMException("blocked", "SecurityError");
      };
    },
  });
  await h.flip(page);
  await heart(page).click();
  await pressed(page, "true");
  await heart(page).click();
  await pressed(page, "false");
  await heart(page).click();
  await pressed(page, "true");
  // Still saved for the visit: the Saved list shows it after client navigation.
  const id = await h.activeId(page);
  await page.getByRole("link", { name: "Saved" }).click();
  await page.waitForURL("**/saved");
  await page.locator(`[data-testid="saved-row"][data-card-id="${id}"]:visible`).waitFor();
  assert.deepEqual(logs, []);
});

test("SV-7 cross-tab: a save in one tab appears in another", async () => {
  const { page, ctx } = await h.open({ device: h.DESKTOP });
  const other = await ctx.newPage();
  await other.goto(h.url + "/saved");
  await other.locator('[data-testid="saved-empty"]:visible').waitFor();
  await h.startHealthy(page, 0);
  const id = await h.activeId(page);
  await h.flip(page);
  await heart(page).click();
  await pressed(page, "true");
  await other.locator(`[data-testid="saved-row"][data-card-id="${id}"]:visible`).waitFor({ timeout: 8000 });
});

test("SV-8 S toggles save on a flipped active card and does nothing on a front", async () => {
  const { page } = await h.open({ device: h.DESKTOP });
  await h.startHealthy(page, 0);
  await page.keyboard.press("s");
  await h.frame(page);
  assert.equal(await h.storage(page), null, "nothing stored from the front");
  await h.flip(page);
  assert.equal(await heart(page).getAttribute("aria-pressed"), "false");
  await page.keyboard.press("s");
  await pressed(page, "true");
  assert.equal((await h.storage(page)).length, 1);
  await page.keyboard.press("s");
  await pressed(page, "false");
  assert.deepEqual(await h.storage(page), []);
});

test("SV-9 announcements: live region text, no toast (feed and Saved detail)", async () => {
  const { page } = await h.open({ saved: ["c01", "c02"] });
  await h.flip(page);
  const wasSaved = (await heart(page).getAttribute("aria-pressed")) === "true";
  await heart(page).click();
  await page.waitForFunction(
    (want) => [...document.querySelectorAll('[data-testid="live"]')].some((e) => e.textContent.trim() === want),
    wasSaved ? "Removed from saved" : "Saved",
  );
  await heart(page).click();
  await page.waitForFunction(
    (want) => [...document.querySelectorAll('[data-testid="live"]')].some((e) => e.textContent.trim() === want),
    wasSaved ? "Saved" : "Removed from saved",
  );
  assert.equal(await page.locator("[data-sonner-toast]").count(), 0);
  assert.ok((await liveText(page)).length > 0);
  // Saved detail (phone sheet): unsave announces too.
  const m = await h.open({ device: h.PHONE, route: "/saved", saved: ["c01", "c02"] });
  await h.openSavedRow(m.page, "c01");
  await m.page.locator('[data-testid="card-detail"] [data-testid="heart"]').click();
  await m.page.waitForFunction(() =>
    [...document.querySelectorAll('[data-testid="live"]')].some((e) => e.textContent.trim() === "Removed from saved"),
  );
  assert.equal(await m.page.locator("[data-sonner-toast]").count(), 0);
});
