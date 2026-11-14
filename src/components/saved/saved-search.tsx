"use client";

import { useEffect, useRef, type Ref } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type SavedSearchProps = {
  ref?: Ref<HTMLInputElement>;
  query: string;
  onQueryChange: (query: string) => void;
};

/**
 * Live search over saved cards (D-SAVED-2, REDESIGN_V2 5.6). Sticky under
 * the top safe area on phone and at the top of the page on desktop. The
 * field is the stock Input (white 1 px border, 30% white fill), 52 px tall.
 * A solid `bg-background` strip sits behind the bar, from the screen's top
 * edge (safe area included) to 8 px under the field, so rows never show
 * above or through it. No blur. `data-stuck` marks the bar while it is
 * stuck (a zero-height sentinel just before it leaves the top).
 * A clear button appears with a query; Escape in the field clears it and
 * consumes the key (so it does not also close the desktop pane).
 */
export function SavedSearch({ ref, query, onQueryChange }: SavedSearchProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    const sentinel = sentinelRef.current;
    if (!bar || !sentinel || typeof IntersectionObserver === "undefined") return;
    let observer: IntersectionObserver | null = null;
    const observe = () => {
      observer?.disconnect();
      // The bar sticks at its computed `top` (the safe-area inset, or 0).
      const top = Math.round(parseFloat(getComputedStyle(bar).top) || 0);
      observer = new IntersectionObserver(
        ([entry]) => {
          const stuck = !entry.isIntersecting && entry.boundingClientRect.top < top + 1;
          if (stuck) bar.dataset.stuck = "";
          else delete bar.dataset.stuck;
        },
        { rootMargin: `${-top}px 0px 0px 0px` },
      );
      observer.observe(sentinel);
    };
    observe();
    window.addEventListener("resize", observe);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", observe);
    };
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="h-0" />
      <div
        ref={barRef}
        className="sticky top-[env(safe-area-inset-top)] z-10 py-3 lg:top-0 before:pointer-events-none before:absolute before:-inset-x-4 before:top-[calc(-1*env(safe-area-inset-top))] before:-bottom-2 before:-z-10 before:bg-background lg:before:top-0"
      >
        <div className="relative">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={ref}
            type="search"
            aria-label="Search saved"
            placeholder="Search saved"
            autoComplete="off"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query !== "") {
                event.preventDefault();
                onQueryChange("");
              }
            }}
            className="h-13 rounded-full pr-12 pl-12 text-base md:text-base [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query !== "" ? (
            <Button
              variant="ghost"
              size="circle"
              data-testid="search-clear"
              aria-label="Clear"
              onClick={() => onQueryChange("")}
              className="absolute top-1/2 right-1 z-10 -translate-y-1/2"
            >
              <XIcon aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
}
