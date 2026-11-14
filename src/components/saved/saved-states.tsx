import { HeartIcon, MousePointerClick, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The 72 px icon disc of the empty, no-results and pick states (REDESIGN_V2 5.7). */
const DISC =
  "mb-2 flex size-[72px] items-center justify-center rounded-full [&_svg]:size-8";

/**
 * Nothing saved (SL-9). Centred in the space below the title; no search.
 * "Tap" on coarse pointers, "Click" on fine ones, swapped in CSS so there is
 * no hydration difference. No button: the nav's Feed link is one thumb
 * away, and a second link named for the feed would make "Feed" ambiguous.
 */
export function SavedEmpty({ inColumn = false }: { inColumn?: boolean }) {
  return (
    <div
      data-testid="saved-empty"
      className={cn(
        "mx-auto flex w-full max-w-[320px] flex-1 flex-col items-center justify-center gap-2 py-16 text-center",
        !inColumn && "min-h-[50dvh]",
      )}
    >
      <span className={cn(DISC, "bg-primary text-primary-foreground")}>
        <HeartIcon aria-hidden="true" />
      </span>
      <p className="text-2xl font-bold text-foreground">Nothing saved yet</p>
      <p className="text-base text-muted-foreground">
        <span className="pointer-fine:hidden">Tap</span>
        <span className="hidden pointer-fine:inline">Click</span> the heart on a
        card to keep it here.
      </p>
    </div>
  );
}

/** Search missed (SL-10): title, helper and the one recovery action. */
export function SavedNoResults({
  query,
  onClear,
}: {
  query: string;
  onClear: () => void;
}) {
  return (
    <div
      data-testid="saved-no-results"
      className="mx-auto flex w-full max-w-[320px] flex-col items-center gap-2 py-16 text-center"
    >
      <span className={cn(DISC, "bg-muted text-foreground")}>
        <SearchX aria-hidden="true" />
      </span>
      <p className="text-2xl font-bold text-foreground">No matches</p>
      <p className="text-base break-words text-muted-foreground">
        Nothing saved matches “{query.trim()}”. Try a different word.
      </p>
      <Button variant="outline" size="pill" onClick={onClear} className="mt-3">
        Clear search
      </Button>
    </div>
  );
}

/** Desktop pane with nothing selected (`detail-placeholder`, SL-14). */
export function DetailPlaceholder() {
  return (
    <div
      data-testid="detail-placeholder"
      className="mx-auto flex h-full max-w-[320px] flex-col items-center justify-center gap-2 p-6 text-center"
    >
      <span className={cn(DISC, "bg-muted text-foreground")}>
        <MousePointerClick aria-hidden="true" />
      </span>
      <p className="text-2xl font-bold text-foreground">Pick a card</p>
      <p className="text-base text-muted-foreground">
        Choose a card to replay it.
      </p>
    </div>
  );
}
