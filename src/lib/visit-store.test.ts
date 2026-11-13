import { describe, expect, it, vi } from "vitest";
import { cards } from "../content";
import { createVisitStore } from "./visit-store";

const ids = cards.map((c) => c.id);

describe("visit store", () => {
  it("order is a permutation of the deck", () => {
    const store = createVisitStore(cards, () => 42);
    const order = store.getOrder();
    expect(order).toHaveLength(ids.length);
    expect([...order].sort()).toEqual([...ids].sort());
  });

  it("order is stable across reads (same reference, seed read once)", () => {
    const seed = vi.fn(() => 7);
    const store = createVisitStore(cards, seed);
    expect(seed).not.toHaveBeenCalled(); // lazy: nothing at creation
    const first = store.getOrder();
    expect(store.getOrder()).toBe(first);
    store.toggleFlip(ids[0]);
    store.setActive(ids[1]);
    store.setMuted(false);
    expect(store.getOrder()).toBe(first);
    expect(seed).toHaveBeenCalledTimes(1);
  });

  it("different seeds can give different orders", () => {
    const a = createVisitStore(cards, () => 1).getOrder();
    const b = createVisitStore(cards, () => 2).getOrder();
    expect(a).not.toEqual(b);
  });

  it("toggleFlip flips and unflips one card only", () => {
    const store = createVisitStore(cards, () => 1);
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.isFlipped("c01")).toBe(false);
    store.toggleFlip("c01");
    expect(store.isFlipped("c01")).toBe(true);
    expect(store.isFlipped("c02")).toBe(false);
    store.toggleFlip("c01");
    expect(store.isFlipped("c01")).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("actions work before the order is ever read", () => {
    const seed = vi.fn(() => 3);
    const store = createVisitStore(cards, seed);
    store.toggleFlip("c03");
    store.setActive("c03");
    expect(store.isFlipped("c03")).toBe(true);
    expect(store.getActiveId()).toBe("c03");
    expect(seed).not.toHaveBeenCalled();
  });

  it("mute defaults to true and toggles", () => {
    const store = createVisitStore(cards, () => 1);
    expect(store.getMuted()).toBe(true);
    store.setMuted(false);
    expect(store.getMuted()).toBe(false);
  });

  it("active id starts null and notifies only on change", () => {
    const store = createVisitStore(cards, () => 1);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    expect(store.getActiveId()).toBeNull();
    store.setActive("c05");
    store.setActive("c05");
    store.setMuted(true); // unchanged
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.setActive("c06");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
