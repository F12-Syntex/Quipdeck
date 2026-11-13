import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWheelPager, type WheelLike } from "./wheel-pager";

type FakeWheel = WheelLike & { prevented: boolean };

function wheel(deltaY: number, extra: Partial<WheelLike> = {}): FakeWheel {
  const event: FakeWheel = {
    deltaX: 0,
    deltaY,
    deltaMode: 0,
    ctrlKey: false,
    prevented: false,
    preventDefault() {
      event.prevented = true;
    },
    ...extra,
  };
  return event;
}

function setup(opts: { moves?: boolean; passThrough?: boolean } = {}) {
  const pages: number[] = [];
  const natives: number[] = [];
  const pager = createWheelPager<FakeWheel>({
    page(direction) {
      pages.push(direction);
      return opts.moves ?? true;
    },
    passThrough: () => opts.passThrough ?? false,
    onNative: () => natives.push(1),
    now: () => Date.now(),
  });
  return { pager, pages, natives };
}

describe("createWheelPager (D-FEED-11)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("pages one card for a single 120 px notch", () => {
    const { pager, pages } = setup();
    const e = wheel(120);
    pager.onWheel(e);
    expect(pages).toEqual([1]);
    expect(e.prevented).toBe(true);
  });

  it("pages one card for a 3000 px burst", () => {
    const { pager, pages } = setup();
    pager.onWheel(wheel(3000));
    for (let i = 0; i < 29; i++) {
      vi.advanceTimersByTime(10);
      pager.onWheel(wheel(100));
    }
    expect(pages).toEqual([1]);
  });

  it("accumulates small trackpad deltas to the threshold", () => {
    const { pager, pages } = setup();
    for (let i = 0; i < 4; i++) {
      pager.onWheel(wheel(-9));
      vi.advanceTimersByTime(16);
    }
    expect(pages).toEqual([]);
    pager.onWheel(wheel(-9));
    expect(pages).toEqual([-1]);
  });

  it("drops a partial gesture after a pause", () => {
    const { pager, pages } = setup();
    pager.onWheel(wheel(30));
    vi.advanceTimersByTime(500);
    pager.onWheel(wheel(30));
    expect(pages).toEqual([]);
  });

  it("starts over on a change of direction", () => {
    const { pager, pages } = setup();
    pager.onWheel(wheel(30));
    pager.onWheel(wheel(-30));
    expect(pages).toEqual([]);
    pager.onWheel(wheel(-30));
    expect(pages).toEqual([-1]);
  });

  it("stays locked through a momentum tail that outlasts the scroll", () => {
    const { pager, pages } = setup();
    pager.onWheel(wheel(60));
    // A decaying tail of about 1.4 s; the paged scroll settles after 400 ms.
    let elapsed = 0;
    for (let d = 60; d > 1; d *= 0.95) {
      vi.advanceTimersByTime(16);
      elapsed += 16;
      if (elapsed === 400) pager.settled();
      pager.onWheel(wheel(d));
    }
    expect(elapsed).toBeGreaterThan(1000);
    expect(pages).toEqual([1]);
    expect(pager.isLocked()).toBe(true);
    vi.advanceTimersByTime(200);
    expect(pager.isLocked()).toBe(false);
    pager.onWheel(wheel(120));
    expect(pages).toEqual([1, 1]);
  });

  it("does not unlock on scroll settle alone while the wheel keeps going", () => {
    const { pager } = setup();
    pager.onWheel(wheel(120));
    vi.advanceTimersByTime(100);
    pager.onWheel(wheel(20));
    pager.settled();
    vi.advanceTimersByTime(60);
    expect(pager.isLocked()).toBe(true);
    vi.advanceTimersByTime(200);
    expect(pager.isLocked()).toBe(false);
  });

  it("unlocks without a settle event (no scrollend)", () => {
    const { pager, pages } = setup();
    pager.onWheel(wheel(120));
    vi.advanceTimersByTime(2000);
    expect(pager.isLocked()).toBe(false);
    pager.onWheel(wheel(120));
    expect(pages).toEqual([1, 1]);
  });

  it("does not stick at the end of the deck", () => {
    const { pager, pages } = setup({ moves: false });
    pager.onWheel(wheel(120));
    vi.advanceTimersByTime(200);
    expect(pager.isLocked()).toBe(false);
    pager.onWheel(wheel(-120));
    expect(pages).toEqual([1, -1]);
  });

  it("leaves pinch-zoom, horizontal and passed-through wheels to the browser", () => {
    const { pager, pages, natives } = setup();
    const zoom = wheel(120, { ctrlKey: true });
    const sideways = wheel(10, { deltaX: 80 });
    pager.onWheel(zoom);
    pager.onWheel(sideways);
    expect(zoom.prevented || sideways.prevented).toBe(false);

    const inner = setup({ passThrough: true });
    const e = wheel(120);
    inner.pager.onWheel(e);
    expect(e.prevented).toBe(false);
    expect(inner.pages).toEqual([]);
    expect(pages).toEqual([]);
    expect(natives.length).toBe(2);
    expect(inner.natives.length).toBe(1);
  });

  it("converts line and page delta modes to pixels", () => {
    const { pager, pages } = setup();
    pager.onWheel(wheel(1, { deltaMode: 1 }));
    expect(pages).toEqual([]);
    vi.advanceTimersByTime(10);
    pager.onWheel(wheel(2, { deltaMode: 1 }));
    expect(pages).toEqual([1]);
  });
});
