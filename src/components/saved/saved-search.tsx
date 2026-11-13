"use client";

import type { Ref } from "react";
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
 */
export function SavedSearch({ ref, query, onQueryChange }: SavedSearchProps) {
  return (
    <div className="sticky top-[env(safe-area-inset-top)] z-10 py-2 lg:top-0">
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
  );
}
