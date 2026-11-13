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
 * Live search over saved cards (D-SAVED-2). Sticky under the top safe area
 * on phone and at the top of the page on desktop.
 * The field is blurred chrome (`Input variant="chrome"`), so rows read
 * through it as they scroll under. The blur makes the field a stacking
 * context, hence `z-10` on the icon drawn before it.
 * A clear button appears with a query; Escape in the field clears it and
 * consumes the key (so it does not also close the desktop pane).
 *
 * While stuck, a backing (`--surface-base-top`, the colour of the ambient
 * base at the top of the screen) covers the strip from the screen's top
 * edge, safe area included, to the field's bottom edge plus a 16 px eased
 * fade (85% at 6 px, 40% at 11 px; final gate: the linear fade still read
 * as attached in motion). It stays 16 px because the first group sits 14 to
 * 17 px under the field when the bar sticks: a longer fade would dim it the
 * moment the backing appears. Rows never fuse with the field and only show
 * below the fade. It shows
 * only while stuck (a zero-height sentinel just before the bar leaves the
 * top), so nothing is painted over the title at rest and the layout never
 * changes.
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
        className="sticky top-[env(safe-area-inset-top)] z-10 py-2 lg:top-0 before:pointer-events-none before:absolute before:-inset-x-4 before:top-[calc(-1*env(safe-area-inset-top))] before:-bottom-2 before:bg-[linear-gradient(to_bottom,var(--surface-base-top)_calc(100%-16px),color-mix(in_oklab,var(--surface-base-top)_85%,transparent)_calc(100%-10px),color-mix(in_oklab,var(--surface-base-top)_40%,transparent)_calc(100%-5px),transparent)] before:opacity-0 data-stuck:before:opacity-100 lg:before:top-0"
      >
        <div className="relative">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-fg-tertiary"
          />
          <Input
            ref={ref}
            variant="chrome"
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
            className="pr-12 pl-11 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query !== "" ? (
            <Button
              variant="quiet"
              size="circle"
              data-testid="search-clear"
              aria-label="Clear"
              onClick={() => onQueryChange("")}
              className="absolute top-1/2 right-0.5 z-10 -translate-y-1/2"
            >
              <XIcon aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
}
