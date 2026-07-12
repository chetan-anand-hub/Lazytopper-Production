// src/utils/balancedMockDraw.test.ts — vitest (linux-pinned; runs in Codespaces/CI).
//
// The contract under test (Full Mock dispatch §2): purity/determinism from the
// seed, the ~pyqTargetFraction mix, and the HONEST fallbacks — too few PYQ → all
// PYQ + fresh fill; zero PYQ → all fresh; never padded past the pool.

import { describe, it, expect } from "vitest";
import { drawBalancedSet, mulberry32, seededShuffle } from "./balancedMockDraw";

interface Q {
  id: string;
  pyqYear?: string;
}

const pyqs = (n: number): Q[] =>
  Array.from({ length: n }, (_, i) => ({ id: `pyq-${i}`, pyqYear: "2023" }));
const fresh = (n: number): Q[] => Array.from({ length: n }, (_, i) => ({ id: `fresh-${i}` }));

describe("drawBalancedSet", () => {
  it("hits ~the target PYQ fraction when both classes are deep", () => {
    const r = drawBalancedSet({ pool: [...pyqs(50), ...fresh(50)], count: 20, seed: 7 });
    expect(r.drawn).toHaveLength(20);
    expect(r.pyqDrawn).toBe(10);
    expect(r.freshDrawn).toBe(10);
    expect(r.pyqDrawn + r.freshDrawn).toBe(r.drawn.length);
  });

  it("is deterministic for the same seed and differs across seeds", () => {
    const pool = [...pyqs(30), ...fresh(30)];
    const a = drawBalancedSet({ pool, count: 12, seed: 42 });
    const b = drawBalancedSet({ pool, count: 12, seed: 42 });
    const c = drawBalancedSet({ pool, count: 12, seed: 43 });
    expect(a.drawn.map((q) => q.id)).toEqual(b.drawn.map((q) => q.id));
    expect(c.drawn.map((q) => q.id)).not.toEqual(a.drawn.map((q) => q.id));
  });

  it("HONEST fallback — too few PYQ: takes ALL the PYQ + fills fresh", () => {
    const r = drawBalancedSet({ pool: [...pyqs(3), ...fresh(50)], count: 20, seed: 1 });
    expect(r.drawn).toHaveLength(20);
    expect(r.pyqDrawn).toBe(3);
    expect(r.freshDrawn).toBe(17);
  });

  it("HONEST fallback — zero PYQ: an all-fresh draw is still a full paper", () => {
    const r = drawBalancedSet({ pool: fresh(40), count: 15, seed: 1 });
    expect(r.drawn).toHaveLength(15);
    expect(r.pyqDrawn).toBe(0);
    expect(r.freshDrawn).toBe(15);
  });

  it("HONEST fallback — too few fresh: the remainder comes from spare PYQ", () => {
    const r = drawBalancedSet({ pool: [...pyqs(50), ...fresh(2)], count: 20, seed: 1 });
    expect(r.drawn).toHaveLength(20);
    expect(r.freshDrawn).toBe(2);
    expect(r.pyqDrawn).toBe(18);
  });

  it("never pads past the pool — a thin pool returns what exists, nothing more", () => {
    const r = drawBalancedSet({ pool: [...pyqs(2), ...fresh(3)], count: 20, seed: 1 });
    expect(r.drawn).toHaveLength(5);
    expect(r.pyqDrawn).toBe(2);
    expect(r.freshDrawn).toBe(3);
  });

  it("never mutates the pool and never duplicates an item", () => {
    const pool = [...pyqs(10), ...fresh(10)];
    const before = pool.map((q) => q.id);
    const r = drawBalancedSet({ pool, count: 20, seed: 9 });
    expect(pool.map((q) => q.id)).toEqual(before);
    expect(new Set(r.drawn.map((q) => q.id)).size).toBe(r.drawn.length);
  });

  it("respects a tuned pyqTargetFraction", () => {
    const r = drawBalancedSet({
      pool: [...pyqs(50), ...fresh(50)],
      count: 20,
      pyqTargetFraction: 0.25,
      seed: 5,
    });
    expect(r.pyqDrawn).toBe(5);
    expect(r.freshDrawn).toBe(15);
  });
});

describe("mulberry32 / seededShuffle", () => {
  it("same seed → same sequence; shuffle copies rather than mutates", () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    const src = [1, 2, 3, 4, 5];
    const out = seededShuffle(src, mulberry32(1));
    expect(src).toEqual([1, 2, 3, 4, 5]);
    expect(out.slice().sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
