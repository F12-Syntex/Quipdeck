import { HeartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <span className="mb-2 flex size-14 items-center justify-center rounded-full glass-control">
        <HeartIcon aria-hidden="true" className="size-6 text-fg-secondary" />
      </span>
      <p className="text-heading text-fg-primary">Nothing saved yet</p>
      <p className="max-w-[30ch] text-body text-fg-secondary">
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
      <p className="text-heading text-fg-primary">No matches</p>
      <p className="text-body text-fg-secondary">Try a different word.</p>
      {/* `pill` (44 px), not `pill-sm`: the touch-target floor (A-9). */}
      <Button variant="quiet" size="pill" onClick={onClear} className="mt-2">
        Clear search
      </Button>
    </div>
  );
}
