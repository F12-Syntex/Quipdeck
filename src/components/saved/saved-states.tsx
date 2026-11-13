import { HeartIcon } from "lucide-react";

/**
 * Nothing saved (SL-9). Centred in the space below the title; no search, no
 * button (the nav is one thumb away). "Tap" on coarse pointers, "Click" on
 * fine ones, swapped in CSS so there is no hydration difference.
 */
export function SavedEmpty({ inColumn = false }: { inColumn?: boolean }) {
  return (
    <div
      data-testid="saved-empty"
      className={`flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center ${
        inColumn ? "" : "min-h-[50dvh]"
      }`}
    >
      <HeartIcon aria-hidden="true" className="size-8" />
      <p className="text-lg">Nothing saved yet</p>
      <p className="text-sm">
        <span className="pointer-fine:hidden">Tap</span>
        <span className="hidden pointer-fine:inline">Click</span> the heart on
        a card to keep it here.
      </p>
    </div>
  );
}

/** Search missed (SL-10): title, helper and the one recovery action. */
export function SavedNoResults({ onClear }: { onClear: () => void }) {
  return (
    <div
      data-testid="saved-no-results"
      className="flex flex-col items-center gap-2 py-16 text-center"
    >
      <p className="text-lg">No matches</p>
      <p className="text-sm">Try a different word.</p>
      <button
        type="button"
        onClick={onClear}
        className="mt-2 min-h-11 border border-neutral-700 px-4"
      >
        Clear search
      </button>
    </div>
  );
}
