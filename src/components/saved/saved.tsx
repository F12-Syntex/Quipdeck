"use client";

import { useSearchParams } from "next/navigation";
import { cards } from "@/content";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSavedIds } from "@/lib/saves-store";
import { CardDetail } from "./card-detail";

/**
 * Title plus skeleton rows. The `/saved` Suspense fallback (the prerendered
 * shell) and the "saves not read yet" state (D-SAVE-2). No search field.
 */
export function SavedFallback() {
  return (
    <div className="w-full">
      <h1>Saved</h1>
      <div data-testid="saved-skeleton">
        <div className="h-16 border border-neutral-700" />
        <div className="h-16 border border-neutral-700" />
        <div className="h-16 border border-neutral-700" />
      </div>
    </div>
  );
}

/** P1-1 stub. P1-5 builds the real Saved screen. */
export function Saved() {
  const params = useSearchParams();
  const ids = useSavedIds();
  const desktop = useMediaQuery("(min-width: 1024px)");

  if (ids === null) return <SavedFallback />;

  const saved = cards.filter((c) => ids.includes(c.id));
  const cardParam = params.get("card");
  const detailId = cards.some((c) => c.id === cardParam) ? cardParam : null;

  return (
    <div className="w-full">
      <h1>Saved</h1>
      {saved.length === 0 ? (
        <p data-testid="saved-empty">Nothing saved yet.</p>
      ) : (
        <ul>
          {saved.map((c) => (
            <li key={c.id}>
              <button type="button" data-testid="saved-row" data-card-id={c.id}>
                {c.cue}
              </button>
            </li>
          ))}
        </ul>
      )}
      {detailId ? (
        <CardDetail cardId={detailId} mode={desktop ? "pane" : "sheet"} />
      ) : null}
    </div>
  );
}
