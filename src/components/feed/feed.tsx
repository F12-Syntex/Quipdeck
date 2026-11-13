"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { cards, type WitCard as WitCardData } from "@/content";
import { WitCard } from "@/components/card/wit-card";
import { LiveRegion } from "@/components/card/live-region";
import { toggleSaveAndAnnounce } from "@/components/card/heart-button";
import { toggleMuteAndAnnounce } from "@/components/card/mute-button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useActiveId, useVisitOrder, visit } from "@/lib/visit-store";
import { FeedChrome } from "./feed-chrome";
import { FeedSlide } from "./feed-slide";

const byId = new Map<string, WitCardData>(cards.map((c) => [c.id, c]));

/** Previous / next and key hints exist only here (D-FEED-10). */
const DESKTOP_POINTER =
  "(min-width: 1024px) and (hover: hover) and (pointer: fine)";

const SLIDE = "[data-slide-id]";
const CARD = '[data-testid="card"]';
/** Space and Enter keep their native meaning on these (D-FEED-7). */
const NATIVE_ACTIVATION =
  'button, a, input, select, textarea, summary, iframe, [role="button"], [role="link"]';

/** Settle time after which a key-driven navigation stops owning `activeId`. */
const PENDING_TIMEOUT_MS = 1200;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]') !== null;
}

function isDialogOpen(): boolean {
  const dialogs = document.querySelectorAll(
    'dialog[open], [role="dialog"], [role="alertdialog"]',
  );
  for (const dialog of dialogs) {
    if (dialog.getClientRects().length > 0) return true;
  }
  return false;
}

/**
 * The feed (D-FEED-1..10, LAYOUT_PLAN sections 3 and 4): one fixed
 * scroll-snap container, one card per viewport, a skeleton until the client
 * has shuffled, an active-card observer, scroll restore after Activity, one
 * document key listener and the desktop pointer chrome.
 */
export function Feed() {
  const order = useVisitOrder();
  const storedActiveId = useActiveId();
  const ids = order?.filter((id) => byId.has(id)) ?? null;
  // Until the observer reports, the first card is the active one.
  const activeId = storedActiveId ?? ids?.[0] ?? null;
  const showChrome = useMediaQuery(DESKTOP_POINTER);

  const scrollerRef = useRef<HTMLDivElement>(null);
  /** Target of a key or button navigation still scrolling into place. */
  const pendingRef = useRef<string | null>(null);
  const pendingTimerRef = useRef<number | undefined>(undefined);

  const slides = useCallback((): HTMLElement[] => {
    const scroller = scrollerRef.current;
    return scroller ? Array.from(scroller.querySelectorAll<HTMLElement>(SLIDE)) : [];
  }, []);

  /** The slide whose top is nearest the scroller's offset. */
  const nearestSlideId = useCallback((): string | null => {
    const scroller = scrollerRef.current;
    if (!scroller) return null;
    let best: HTMLElement | null = null;
    for (const slide of slides()) {
      if (!best || Math.abs(slide.offsetTop - scroller.scrollTop) < Math.abs(best.offsetTop - scroller.scrollTop)) {
        best = slide;
      }
    }
    return best?.dataset.slideId ?? null;
  }, [slides]);

  const releasePending = useCallback(() => {
    window.clearTimeout(pendingTimerRef.current);
    pendingRef.current = null;
  }, []);

  /** Move by `delta` cards. Keys also move focus to the new card (D-FEED-8). */
  const go = useCallback(
    (delta: number, focusCard: boolean) => {
      const scroller = scrollerRef.current;
      const all = slides();
      if (!scroller || all.length === 0) return;
      const current =
        pendingRef.current ?? visit.getActiveId() ?? all[0].dataset.slideId;
      const index = Math.max(
        0,
        all.findIndex((s) => s.dataset.slideId === current),
      );
      const target = all[Math.min(all.length - 1, Math.max(0, index + delta))];
      const id = target.dataset.slideId;
      if (!id || id === current) return;

      pendingRef.current = id;
      window.clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = window.setTimeout(() => {
        pendingRef.current = null;
        const settled = nearestSlideId();
        if (settled) visit.setActive(settled);
      }, PENDING_TIMEOUT_MS);

      // Commit now so the target card is no longer inert before focusing it.
      flushSync(() => visit.setActive(id));
      scroller.scrollTo({
        top: target.offsetTop,
        behavior: prefersReducedMotion() ? "instant" : "smooth",
      });
      if (focusCard) {
        target.querySelector<HTMLElement>(CARD)?.focus({ preventScroll: true });
      }
    },
    [slides, nearestSlideId],
  );

  // Scroll restore (D-FEED-4). Runs before the observer is created, both on
  // first mount and when Activity shows the feed again.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !order) return;
    const id = visit.getActiveId();
    if (!id) return;
    const slide = scroller.querySelector<HTMLElement>(`[data-slide-id="${CSS.escape(id)}"]`);
    if (slide && Math.abs(scroller.scrollTop - slide.offsetTop) > 1) {
      scroller.scrollTo({ top: slide.offsetTop, behavior: "instant" });
    }
  }, [order]);

  // Active card observer (D-FEED-4): 60% visible makes a slide active.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !order) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio < 0.59) continue;
          const id = (entry.target as HTMLElement).dataset.slideId;
          if (!id) continue;
          if (pendingRef.current) {
            if (pendingRef.current === id) releasePending();
            continue;
          }
          visit.setActive(id);
        }
      },
      { root: scroller, threshold: 0.6 },
    );
    for (const slide of slides()) observer.observe(slide);

    const onScrollEnd = () => {
      const id = nearestSlideId();
      if (!id) return;
      if (pendingRef.current) {
        if (pendingRef.current === id) releasePending();
        return;
      }
      visit.setActive(id);
    };
    // A wheel or touch hands control back to the observer.
    scroller.addEventListener("wheel", releasePending, { passive: true });
    scroller.addEventListener("touchstart", releasePending, { passive: true });
    scroller.addEventListener("scrollend", onScrollEnd);
    return () => {
      observer.disconnect();
      scroller.removeEventListener("wheel", releasePending);
      scroller.removeEventListener("touchstart", releasePending);
      scroller.removeEventListener("scrollend", onScrollEnd);
      releasePending();
    };
  }, [order, slides, nearestSlideId, releasePending]);

  // Keyboard map (D-FEED-7). Registered here so Activity removes it.
  useEffect(() => {
    const activeCard = (): HTMLElement | null =>
      scrollerRef.current?.querySelector<HTMLElement>(`${CARD}[data-active="true"]`) ?? null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (isDialogOpen()) return;

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      switch (key) {
        case "ArrowDown":
        case "j":
          event.preventDefault();
          go(1, true);
          return;
        case "ArrowUp":
        case "k":
          event.preventDefault();
          go(-1, true);
          return;
        case " ":
        case "Enter": {
          const target = event.target;
          if (target instanceof Element && target.closest(NATIVE_ACTIVATION)) return;
          const card = activeCard();
          const id = card?.dataset.cardId;
          if (!id) return;
          event.preventDefault();
          visit.toggleFlip(id);
          return;
        }
        case "s": {
          // A shortcut mirrors a visible control: the heart is on the back.
          const card = activeCard();
          const id = card?.dataset.cardId;
          if (!id || card.dataset.face !== "back") return;
          event.preventDefault();
          toggleSaveAndAnnounce(id);
          return;
        }
        case "m": {
          const card = activeCard();
          if (!card || card.dataset.face !== "back") return;
          const clip = card.querySelector<HTMLElement>('[data-testid="clip"]');
          if (clip?.dataset.clipState === "error") return;
          event.preventDefault();
          toggleMuteAndAnnounce();
          return;
        }
      }
    };

    // A click inside the player moves focus into its frame; take it back so
    // the shortcuts keep working (D-FEED-9).
    let blurTimer: number | undefined;
    const onWindowBlur = () => {
      window.clearTimeout(blurTimer);
      blurTimer = window.setTimeout(() => {
        const focused = document.activeElement;
        if (focused instanceof HTMLIFrameElement && scrollerRef.current?.contains(focused)) {
          activeCard()?.focus({ preventScroll: true });
        }
      }, 0);
    };

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onWindowBlur);
      window.clearTimeout(blurTimer);
    };
  }, [go]);

  const activeIndex = ids && activeId ? ids.indexOf(activeId) : -1;

  return (
    <>
      <div
        ref={scrollerRef}
        data-testid="feed"
        data-ready={ids ? "true" : undefined}
        className="fixed inset-0 h-dvh snap-y snap-mandatory overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ids === null ? (
          <FeedSlide>
            <div
              data-testid="feed-skeleton"
              aria-hidden="true"
              className="h-full w-full border border-neutral-700"
            />
          </FeedSlide>
        ) : ids.length === 0 ? (
          <div className="flex h-dvh items-center justify-center">
            <p>No cards yet.</p>
          </div>
        ) : (
          ids.map((id) => (
            <FeedSlide key={id} id={id}>
              <WitCard card={byId.get(id)!} active={id === activeId} />
            </FeedSlide>
          ))
        )}
      </div>
      <LiveRegion />
      {showChrome ? (
        <FeedChrome
          canPrev={activeIndex > 0}
          canNext={ids !== null && activeIndex > -1 && activeIndex < ids.length - 1}
          onPrev={() => go(-1, false)}
          onNext={() => go(1, false)}
        />
      ) : null}
    </>
  );
}
