"use client";

import type { Ref } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

export type SavedSearchProps = {
  ref?: Ref<HTMLInputElement>;
  query: string;
  onQueryChange: (query: string) => void;
};

/**
 * Live search over saved cards (D-SAVED-2). Sticky under the top safe area.
 * A clear button appears with a query; Escape in the field clears it and
 * consumes the key (so it does not also close the desktop pane).
 */
export function SavedSearch({ ref, query, onQueryChange }: SavedSearchProps) {
  return (
    <div className="sticky top-[env(safe-area-inset-top)] z-10 bg-background py-2 lg:top-0">
      <div className="relative">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
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
          className="h-12 rounded-none border-neutral-700 pr-12 pl-10 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query !== "" ? (
          <button
            type="button"
            data-testid="search-clear"
            aria-label="Clear"
            onClick={() => onQueryChange("")}
            className="absolute top-1/2 right-0.5 flex size-11 -translate-y-1/2 items-center justify-center"
          >
            <XIcon aria-hidden="true" className="size-5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
