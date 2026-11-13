import { useSyncExternalStore } from "react";
import { cards, shuffle } from "../content";
import type { WitCard as WitCardData } from "../content";

/**
 * Visit store (D-STATE-2): memory only, lives for one visit (a reload is a
 * new visit). The shuffle seed and order are created lazily on the first
 * client read, never at import time or during prerender (F1, D-FEED-2).
 */

type Listener = () => void;

type VisitState = {
  order: string[] | null;
  flipped: ReadonlySet<string>;
  activeId: string | null;
  muted: boolean;
};

export type VisitStore = ReturnType<typeof createVisitStore>;

export function createVisitStore(
  deck: readonly WitCardData[],
  seedFn: () => number,
) {
  const state: VisitState = {
    order: null,
    flipped: new Set<string>(),
    activeId: null,
    muted: true,
  };
  const listeners = new Set<Listener>();

  const emit = () => {
    for (const listener of listeners) listener();
  };

  return {
    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Shuffled card ids; created on first read, stable for the visit. */
    getOrder(): string[] {
      if (state.order === null) {
        state.order = shuffle(deck, seedFn()).map((c) => c.id);
      }
      return state.order;
    },
    isFlipped(id: string): boolean {
      return state.flipped.has(id);
    },
    getActiveId(): string | null {
      return state.activeId;
    },
    getMuted(): boolean {
      return state.muted;
    },
    toggleFlip(id: string): void {
      const next = new Set(state.flipped);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      state.flipped = next;
      emit();
    },
    setActive(id: string): void {
      if (state.activeId === id) return;
      state.activeId = id;
      emit();
    },
    setMuted(value: boolean): void {
      if (state.muted === value) return;
      state.muted = value;
      emit();
    },
  };
}

const store = createVisitStore(
  cards,
  () => crypto.getRandomValues(new Uint32Array(1))[0],
);

/** Actions and non-React reads for the visit. */
export const visit = {
  toggleFlip: store.toggleFlip,
  setActive: store.setActive,
  setMuted: store.setMuted,
  getMuted: store.getMuted,
  getActiveId: store.getActiveId,
};

const serverNull = () => null;
const serverFalse = () => false;
const serverTrue = () => true;

/** `null` on the server and during hydration, then the shuffled ids. */
export function useVisitOrder(): string[] | null {
  return useSyncExternalStore(store.subscribe, store.getOrder, serverNull);
}

export function useIsFlipped(id: string): boolean {
  return useSyncExternalStore(
    store.subscribe,
    () => store.isFlipped(id),
    serverFalse,
  );
}

export function useActiveId(): string | null {
  return useSyncExternalStore(store.subscribe, store.getActiveId, serverNull);
}

export function useMuted(): boolean {
  return useSyncExternalStore(store.subscribe, store.getMuted, serverTrue);
}
