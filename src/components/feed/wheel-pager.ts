/**
 * Wheel paging (D-FEED-11). CSS `scroll-snap-stop: always` does not stop
 * Chromium carrying a large wheel delta across several cards, and a single
 * notch can snap back to the same card. On fine pointers the feed takes the
 * wheel over: deltas accumulate to a small threshold, one card is paged, and
 * further wheel input is swallowed until the scroll has settled and the
 * wheel stream (a trackpad's momentum tail included) has gone quiet.
 *
 * Framework-free so the timing rules are unit-tested with fake timers.
 */

/** The parts of a `WheelEvent` the pager reads. */
export type WheelLike = {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  ctrlKey: boolean;
  preventDefault(): void;
};

export type WheelPagerOptions<E extends WheelLike> = {
  /**
   * Move one card in `direction`. Returns true when a scroll was started;
   * false at either end of the deck (no scroll, so nothing to settle).
   */
  page(direction: 1 | -1): boolean;
  /**
   * The event belongs to the browser: coarse pointer, an inner scroller that
   * can still move, an open dialog. Checked only for events the pager would
   * otherwise take.
   */
  passThrough?(event: E, direction: 1 | -1): boolean;
  /** Called for every event left to native scrolling. */
  onNative?(): void;
  /** Accumulated distance that pages one card, in px. */
  thresholdPx?: number;
  /** Wheel silence that ends a gesture and, once settled, the lock. */
  quietMs?: number;
  /** Longest wait for `settled()` before the lock stops waiting for it. */
  settleTimeoutMs?: number;
  /** Pixels per line for `deltaMode` 1 (Firefox). */
  lineHeightPx?: number;
  /** Pixels per page for `deltaMode` 2. */
  pageHeightPx?(): number;
  now?(): number;
};

export type WheelPager<E extends WheelLike> = {
  /** Attach with `{ passive: false }`. */
  onWheel(event: E): void;
  /** Report that a scroll the pager started has come to rest (`scrollend`). */
  settled(): void;
  /** True while wheel input is being swallowed. */
  isLocked(): boolean;
  dispose(): void;
};

const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;

export function createWheelPager<E extends WheelLike>(
  options: WheelPagerOptions<E>,
): WheelPager<E> {
  const {
    page,
    passThrough,
    onNative,
    thresholdPx = 40,
    quietMs = 200,
    settleTimeoutMs = 1000,
    lineHeightPx = 16,
    pageHeightPx = () => 800,
    now = () => performance.now(),
  } = options;

  let accumulated = 0;
  let lastWheelAt = -Infinity;
  let locked = false;
  let scrollSettled = true;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  let quietTimer: ReturnType<typeof setTimeout> | undefined;

  const clearTimers = () => {
    clearTimeout(settleTimer);
    clearTimeout(quietTimer);
    settleTimer = undefined;
    quietTimer = undefined;
  };

  /** Unlock once the scroll is settled and the wheel has been quiet. */
  const scheduleUnlock = () => {
    clearTimeout(quietTimer);
    if (!locked || !scrollSettled) return;
    const wait = Math.max(0, quietMs - (now() - lastWheelAt));
    quietTimer = setTimeout(() => {
      quietTimer = undefined;
      if (!locked || !scrollSettled) return;
      if (now() - lastWheelAt < quietMs) {
        scheduleUnlock();
        return;
      }
      locked = false;
      accumulated = 0;
    }, wait);
  };

  const markSettled = () => {
    clearTimeout(settleTimer);
    settleTimer = undefined;
    scrollSettled = true;
    scheduleUnlock();
  };

  const toPixels = (event: E): number => {
    if (event.deltaMode === DOM_DELTA_LINE) return event.deltaY * lineHeightPx;
    if (event.deltaMode === DOM_DELTA_PAGE) return event.deltaY * pageHeightPx();
    return event.deltaY;
  };

  const onWheel = (event: E) => {
    // Pinch-zoom and horizontal scrolling are never ours.
    if (event.ctrlKey || event.deltaY === 0 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      onNative?.();
      return;
    }
    const delta = toPixels(event);
    const direction: 1 | -1 = delta > 0 ? 1 : -1;
    if (!locked && passThrough?.(event, direction)) {
      onNative?.();
      return;
    }

    event.preventDefault();
    const at = now();
    const gap = at - lastWheelAt;
    lastWheelAt = at;

    if (locked) {
      // Swallow the rest of the gesture; each event pushes the unlock back.
      scheduleUnlock();
      return;
    }

    // A pause or a change of direction starts a new gesture.
    if (gap >= quietMs || Math.sign(accumulated) !== direction) accumulated = 0;
    accumulated += delta;
    if (Math.abs(accumulated) < thresholdPx) return;

    accumulated = 0;
    locked = true;
    scrollSettled = false;
    clearTimers();
    if (page(direction)) {
      settleTimer = setTimeout(markSettled, settleTimeoutMs);
    } else {
      markSettled();
    }
  };

  return {
    onWheel,
    settled() {
      if (locked && !scrollSettled) markSettled();
    },
    isLocked: () => locked,
    dispose() {
      clearTimers();
      locked = false;
      accumulated = 0;
    },
  };
}
