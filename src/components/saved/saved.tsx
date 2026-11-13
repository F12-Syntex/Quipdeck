"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LiveRegion } from "@/components/card/live-region";
import { cards, groupByMove, searchCards, type WitCard } from "@/content";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSavedIds } from "@/lib/saves-store";
import { CardDetail } from "./card-detail";
import { DetailSheet } from "./detail-sheet";
import { SavedEmpty, SavedNoResults } from "./saved-states";
import { SavedGroups } from "./saved-groups";
import { SavedSearch } from "./saved-search";

/** Page frame: one column on phone, the 1200 px container on desktop. */
const FRAME =
  "mx-auto w-full max-w-[560px] px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+84px)] lg:max-w-[1200px] lg:px-6 lg:pt-[88px] lg:pb-6";

const TITLE = "py-2 text-2xl";

const cardById = new Map(cards.map((c) => [c.id, c]));

/**
 * Title plus skeleton rows. The `/saved` Suspense fallback (the prerendered
 * shell) and the "saves not read yet" state (D-SAVE-2). No search field.
 */
export function SavedFallback() {
  return (
    <div className={FRAME}>
      <h1 className={TITLE}>Saved</h1>
      <div data-testid="saved-skeleton" className="mt-6 lg:max-w-[400px]">
        <div className="mb-2 h-4 w-32 border border-neutral-800" />
        <div className="border border-neutral-700">
          <div className="h-16 border-b border-neutral-800" />
          <div className="h-16 border-b border-neutral-800" />
          <div className="h-16" />
        </div>
      </div>
    </div>
  );
}

/**
 * Saved screen (D-SAVED-1..7, LAYOUT_PLAN sections 7 and 8). Three mount
 * states (skeleton, empty, list). The detail lives in the URL
 * (`?card=<id>`): a modal sheet below 1024 px, a pane beside the list at it.
 */
export function Saved() {
  const params = useSearchParams();
  const ids = useSavedIds();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const [query, setQuery] = useState("");

  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const searchRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  /** This page pushed the `?card=` entry, so closing goes back (D-SAVED-5). */
  const pushedRef = useRef(false);
  /** A close is in flight (a pending `history.back()`); ignore repeats. */
  const closingRef = useRef(false);

  const param = params.get("card");
  const detailId = param !== null && cardById.has(param) ? param : null;

  const registerRow = useCallback(
    (id: string, el: HTMLButtonElement | null) => {
      if (el) rowRefs.current.set(id, el);
      else rowRefs.current.delete(id);
    },
    [],
  );

  const openDetail = (id: string) => {
    if (id === detailId) return;
    const url = `${window.location.pathname}?card=${encodeURIComponent(id)}`;
    closingRef.current = false;
    if (desktop) {
      window.history.replaceState(null, "", url);
    } else {
      pushedRef.current = true;
      window.history.pushState(null, "", url);
    }
  };

  const closeSheet = () => {
    if (closingRef.current) return;
    if (pushedRef.current) {
      closingRef.current = true;
      pushedRef.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", window.location.pathname);
    }
  };

  const fallbackFocus = () =>
    searchRef.current ?? headingRef.current ?? null;

  const returnFocus = (id: string) =>
    rowRefs.current.get(id) ?? fallbackFocus();

  // A close in flight belongs to the detail it closed. Forward (or any other
  // URL change) that shows a detail again must find the close routine live.
  useEffect(() => {
    closingRef.current = false;
  }, [detailId]);

  // Desktop: Escape clears the selection (OV-10). Escape inside a non-empty
  // search is consumed by the field first (it calls preventDefault).
  useEffect(() => {
    if (!desktop || detailId === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const active = document.activeElement;
      const focusWasInPane =
        active === document.body || !!paneRef.current?.contains(active);
      window.history.replaceState(null, "", window.location.pathname);
      if (focusWasInPane) {
        (rowRefs.current.get(detailId) ?? fallbackFocus())?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [desktop, detailId]);

  if (ids === null) return <SavedFallback />;

  // Save order, unknown ids ignored (D-SAVE-1, D-SAVE-7).
  const saved = ids
    .map((id) => cardById.get(id))
    .filter((c): c is WitCard => c !== undefined);
  const groups = groupByMove(searchCards(query, saved));
  const searching = query.trim() !== "";
  const noResults = saved.length > 0 && groups.length === 0;

  const sheetId = !desktop ? detailId : null;
  const paneId = desktop ? detailId : null;

  const title = (
    <h1 ref={headingRef} tabIndex={-1} className={TITLE}>
      Saved
    </h1>
  );

  // Nothing saved and no open card: no search, no grid, no pane (SL-9).
  const emptyBody = (
    <div className={`${FRAME} flex min-h-dvh flex-col`}>
      {title}
      <SavedEmpty />
    </div>
  );

  const listBody = (
    <div
      className={`${FRAME} lg:grid lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start lg:gap-8`}
    >
      <div data-testid="saved-list" className="min-w-0">
        {title}
        {saved.length === 0 ? (
          <SavedEmpty inColumn />
        ) : (
          <>
            <SavedSearch
              ref={searchRef}
              query={query}
              onQueryChange={setQuery}
            />
            {noResults ? (
              <SavedNoResults
                onClear={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
              />
            ) : (
              <SavedGroups
                groups={groups}
                selectedId={paneId}
                onOpen={openDetail}
                registerRow={registerRow}
              />
            )}
          </>
        )}
        <p className="sr-only" aria-live="polite">
          {searching && noResults ? "No matches" : ""}
        </p>
      </div>

      {desktop ? (
        <div
          ref={paneRef}
          className="sticky top-[88px] h-[calc(100dvh-112px)] overflow-y-auto border border-neutral-700"
        >
          {paneId ? (
            <CardDetail key={paneId} cardId={paneId} mode="pane" />
          ) : (
            <div
              data-testid="detail-placeholder"
              className="flex h-full items-center justify-center p-6 text-center"
            >
              <p>Choose a card to replay it.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );

  // The sheet keeps one stable position whichever body renders, so unsaving
  // or re-saving the last card never remounts it (D-SAVE-6 one-tap undo).
  return (
    <>
      {saved.length === 0 && paneId === null ? emptyBody : listBody}
      <LiveRegion />
      {desktop ? null : (
        <DetailSheet
          cardId={sheetId}
          onClose={closeSheet}
          returnFocus={returnFocus}
        />
      )}
    </>
  );
}
