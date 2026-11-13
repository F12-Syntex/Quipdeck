import { describe, expect, it, vi } from "vitest";
import { createSavesStore, SAVES_KEY, type SavesStorage } from "./saves-store";

function memoryStorage(initial?: string): SavesStorage & {
  data: Map<string, string>;
} {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(SAVES_KEY, initial);
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

const throwingStorage: SavesStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("quota");
  },
};

function storageEvent(key: string | null): Event {
  return Object.assign(new Event("storage"), { key });
}

describe("saves store", () => {
  it("server snapshot is null (not read yet)", () => {
    const store = createSavesStore(memoryStorage('["c01"]'), null);
    expect(store.getServerSnapshot()).toBeNull();
  });

  it("reads saved ids from storage", () => {
    const store = createSavesStore(memoryStorage('["c02","c01"]'), null);
    expect(store.getSnapshot()).toEqual(["c02", "c01"]);
    expect(store.isSaved("c01")).toBe(true);
    expect(store.isSaved("c03")).toBe(false);
  });

  it("empty, corrupt or wrongly shaped storage reads as []", () => {
    expect(createSavesStore(memoryStorage(), null).getSnapshot()).toEqual([]);
    expect(createSavesStore(memoryStorage("{nope"), null).getSnapshot()).toEqual([]);
    expect(createSavesStore(memoryStorage('{"a":1}'), null).getSnapshot()).toEqual([]);
    expect(
      createSavesStore(memoryStorage('["c01",3,null,"c01"]'), null).getSnapshot(),
    ).toEqual(["c01"]);
  });

  it("snapshot is referentially stable until a change", () => {
    const store = createSavesStore(memoryStorage('["c01"]'), null);
    const first = store.getSnapshot();
    expect(store.getSnapshot()).toBe(first);
    store.toggle("c02");
    const second = store.getSnapshot();
    expect(second).not.toBe(first);
    expect(store.getSnapshot()).toBe(second);
  });

  it("toggle writes JSON ids in save order and returns the new state", () => {
    const storage = memoryStorage();
    const store = createSavesStore(storage, null);
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.toggle("c03")).toBe(true);
    expect(store.toggle("c01")).toBe(true);
    expect(JSON.parse(storage.data.get(SAVES_KEY)!)).toEqual(["c03", "c01"]);
    expect(store.toggle("c03")).toBe(false);
    expect(JSON.parse(storage.data.get(SAVES_KEY)!)).toEqual(["c01"]);
    expect(store.getSnapshot()).toEqual(["c01"]);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("new saves append; existing ids keep their position", () => {
    const store = createSavesStore(memoryStorage('["c01","c02"]'), null);
    store.toggle("c05");
    expect(store.getSnapshot()).toEqual(["c01", "c02", "c05"]);
  });

  it("unknown ids are kept on read and on write", () => {
    const storage = memoryStorage('["c01","retired-card"]');
    const store = createSavesStore(storage, null);
    expect(store.getSnapshot()).toEqual(["c01", "retired-card"]);
    store.toggle("c02");
    expect(JSON.parse(storage.data.get(SAVES_KEY)!)).toEqual([
      "c01",
      "retired-card",
      "c02",
    ]);
  });

  it("throwing storage falls back to memory for the visit", () => {
    const store = createSavesStore(throwingStorage, null);
    expect(store.getSnapshot()).toEqual([]);
    expect(store.toggle("c01")).toBe(true);
    expect(store.toggle("c02")).toBe(true);
    expect(store.getSnapshot()).toEqual(["c01", "c02"]);
    expect(store.isSaved("c01")).toBe(true);
    expect(store.toggle("c01")).toBe(false);
    expect(store.getSnapshot()).toEqual(["c02"]);
  });

  it("missing storage works in memory", () => {
    const store = createSavesStore(null, null);
    expect(store.toggle("c04")).toBe(true);
    expect(store.getSnapshot()).toEqual(["c04"]);
  });

  it("a storage event from another tab updates the snapshot", () => {
    const storage = memoryStorage('["c01"]');
    const events = new EventTarget();
    const store = createSavesStore(storage, events);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const before = store.getSnapshot();

    storage.data.set(SAVES_KEY, '["c01","c09"]');
    events.dispatchEvent(storageEvent(SAVES_KEY));
    expect(store.getSnapshot()).toEqual(["c01", "c09"]);
    expect(store.getSnapshot()).not.toBe(before);
    expect(listener).toHaveBeenCalledTimes(1);

    // other keys and unchanged values are ignored
    events.dispatchEvent(storageEvent("other:key"));
    events.dispatchEvent(storageEvent(SAVES_KEY));
    expect(listener).toHaveBeenCalledTimes(1);

    // storage.clear() fires with key null
    storage.data.clear();
    events.dispatchEvent(storageEvent(null));
    expect(store.getSnapshot()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    storage.data.set(SAVES_KEY, '["c02"]');
    events.dispatchEvent(storageEvent(SAVES_KEY));
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
