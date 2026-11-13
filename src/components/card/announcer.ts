import { useSyncExternalStore } from "react";

/**
 * Polite announcements (D-FEED-8): "Saved" / "Removed from saved",
 * "Sound on" / "Sound off". There is no visual toast. `n` changes on every
 * call so a repeated message is re-rendered and read again.
 */

export type Announcement = { text: string; n: number };

type Listener = () => void;

let current: Announcement = { text: "", n: 0 };
const serverAnnouncement: Announcement = { text: "", n: 0 };
const listeners = new Set<Listener>();

export function announce(text: string): void {
  current = { text, n: current.n + 1 };
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAnnouncement(): Announcement {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => serverAnnouncement,
  );
}
