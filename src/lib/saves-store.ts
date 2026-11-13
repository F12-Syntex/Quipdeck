import { useSyncExternalStore } from "react";

/**
 * Saves store (D-SAVE-1..4, D-STATE-3). One localStorage key holding a JSON
 * array of card ids in save order. Memory is the source of truth after the
 * first read; every storage call is wrapped so a throwing or missing storage
 * degrades to memory for the visit. Unknown ids are kept: resolving ids to
 * cards (and ignoring unknown ones) is the consumer's job.
 */

export const SAVES_KEY = "quipdeck:saved:v1";

export type SavesStorage = Pick<Storage, "getItem" | "setItem">;

type Listener = () => void;

export type SavesStore = ReturnType<typeof createSavesStore>;

function parse(raw: string | null): string[] {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const out: string[] = [];
    for (const item of value) {
      if (typeof item === "string" && !out.includes(item)) out.push(item);
    }
    return out;
  } catch {
    return [];
  }
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/**
 * @param storage injected storage (a fake in tests, `localStorage` in the app)
 * @param events  target that fires `storage` events; defaults to `window`
 *                when it exists. Pass `null` to disable cross-tab sync.
 */
export function createSavesStore(
  storage: SavesStorage | null,
  events?: EventTarget | null,
) {
  let ids: string[] | null = null;
  const listeners = new Set<Listener>();

  const read = (): string[] => {
    if (!storage) return [];
    try {
      return parse(storage.getItem(SAVES_KEY));
    } catch {
      return [];
    }
  };

  const emit = () => {
    for (const listener of listeners) listener();
  };

  const getSnapshot = (): string[] => {
    if (ids === null) ids = read();
    return ids;
  };

  const onStorage = (event: Event) => {
    const key = (event as StorageEvent).key;
    if (key !== SAVES_KEY && key !== null) return;
    if (ids === null) return; // never read yet: the next read picks it up
    const next = read();
    if (sameIds(next, ids)) return;
    ids = next;
    emit();
  };

  const resolveEvents = (): EventTarget | null => {
    if (events !== undefined) return events;
    return typeof window === "undefined" ? null : window;
  };

  return {
    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      const target = listeners.size === 1 ? resolveEvents() : null;
      target?.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          resolveEvents()?.removeEventListener("storage", onStorage);
        }
      };
    },
    /** Saved ids in save order. Stable reference until a change. */
    getSnapshot,
    /** "Not read yet": the server and the hydration render see this. */
    getServerSnapshot(): string[] | null {
      return null;
    },
    isSaved(id: string): boolean {
      return getSnapshot().includes(id);
    },
    /** Toggles a save. Returns `true` if the card is now saved. */
    toggle(id: string): boolean {
      const current = getSnapshot();
      const saved = !current.includes(id);
      ids = saved ? [...current, id] : current.filter((x) => x !== id);
      try {
        storage?.setItem(SAVES_KEY, JSON.stringify(ids));
      } catch {
        // D-SAVE-3: silent; memory keeps the save for the visit.
      }
      emit();
      return saved;
    },
  };
}

/** Lazily reaches `window.localStorage`; any throw lands in the store's try/catch. */
const browserStorage: SavesStorage = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};

const store = createSavesStore(browserStorage);

const serverFalse = () => false;

/** `null` until saves are read on the client, then ids in save order. */
export function useSavedIds(): string[] | null {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
}

export function useIsSaved(id: string): boolean {
  return useSyncExternalStore(
    store.subscribe,
    () => store.isSaved(id),
    serverFalse,
  );
}

/** Returns `true` if the card is now saved. */
export function toggleSaved(id: string): boolean {
  return store.toggle(id);
}
