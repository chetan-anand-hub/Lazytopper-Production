// @vitest-environment node
//
// The board-blueprint allocation, pinned as PROPERTIES rather than examples.
//
// This file exists because "the default set is 30/20/20/20/10" was a product claim that
// NOTHING guarded — and it had silently broken to ~A30/B30/C30/D10/E0, with Section E
// (case-based) never rendering on the default path. "E is fixed at count=10" is not the
// same statement as "E is fixed"; these assert the invariants across the whole count
// range (the UI allows 3..50) and across stock shapes, not one happy path.

import { describe, it, expect } from "vitest";
import { takeBlueprintShare, type BlueprintBatch } from "./blueprintTake";

type Q = { id: string };

const BLUEPRINT: Array<{ section: "A" | "B" | "C" | "D" | "E"; share: number }> = [
  { section: "A", share: 0.3 },
  { section: "B", share: 0.2 },
  { section: "C", share: 0.2 },
  { section: "D", share: 0.2 },
  { section: "E", share: 0.1 },
];

/** Batches with `stock` questions each; ids are section-prefixed so a take is traceable. */
const mk = (stock: Partial<Record<"A" | "B" | "C" | "D" | "E", number>>): Array<BlueprintBatch<Q>> =>
  BLUEPRINT.map(({ section, share }) => ({
    section,
    share,
    questions: Array.from({ length: stock[section] ?? 0 }, (_, i) => ({ id: `${section}${i}` })),
  }));

const keyOf = (q: Q) => q.id;
const countBySection = (out: Q[]) =>
  out.reduce<Record<string, number>>((acc, q) => {
    const s = q.id[0];
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

/** The UI's real count range: MIN_QUESTION_COUNT=3 .. COUNT_SOFT_MAX=50. */
const ALL_COUNTS = Array.from({ length: 48 }, (_, i) => i + 3);

describe("takeBlueprintShare — the shape, at the default count", () => {
  it("count=10 with ample stock is EXACTLY 3/2/2/2/1 — the intended board shape", () => {
    const out = takeBlueprintShare(mk({ A: 20, B: 20, C: 20, D: 20, E: 20 }), 10, keyOf);
    expect(countBySection(out)).toEqual({ A: 3, B: 2, C: 2, D: 2, E: 1 });
    expect(out).toHaveLength(10);
  });

  it("REGRESSION: the old tail-slice shape (A3/B3/C3/D1/E0) is gone", () => {
    // What `merged.slice(0, 10)` produced over 3/3/3/3/3 batches — E zeroed, D starved.
    const out = takeBlueprintShare(mk({ A: 3, B: 3, C: 3, D: 3, E: 3 }), 10, keyOf);
    const by = countBySection(out);
    expect(by).not.toEqual({ A: 3, B: 3, C: 3, D: 1 });
    expect(by).toEqual({ A: 3, B: 2, C: 2, D: 2, E: 1 });
    expect(by.E).toBeGreaterThanOrEqual(1);
  });
});

describe("takeBlueprintShare — Section E survives (the bug that started this)", () => {
  it("PROPERTY: for EVERY count >= 10, E with stock is never zeroed by rounding", () => {
    for (const total of ALL_COUNTS.filter((c) => c >= 10)) {
      const out = takeBlueprintShare(mk({ A: 99, B: 99, C: 99, D: 99, E: 99 }), total, keyOf);
      expect(countBySection(out).E ?? 0).toBeGreaterThanOrEqual(1);
    }
  });

  it("PROPERTY: E scales with the count — floor(total × 0.10), never less", () => {
    for (const total of ALL_COUNTS.filter((c) => c >= 10)) {
      const out = takeBlueprintShare(mk({ A: 99, B: 99, C: 99, D: 99, E: 99 }), total, keyOf);
      expect(countBySection(out).E ?? 0).toBeGreaterThanOrEqual(Math.floor(total * 0.1));
    }
  });

  it("HONEST at count < 10: E's 10% is worth < 1 whole question, so E may be 0 — arithmetic, not starvation", () => {
    // Documented as EXPECTED so the distinction stays honest: below 10 there are fewer
    // slots than the weighting can seat, and the set stays board-WEIGHTED (A dominant)
    // rather than silently going even. This is NOT the bug this module fixes.
    const out = takeBlueprintShare(mk({ A: 99, B: 99, C: 99, D: 99, E: 99 }), 5, keyOf);
    expect(out).toHaveLength(5);
    expect(countBySection(out).A).toBeGreaterThanOrEqual(countBySection(out).B ?? 0);
    // The set is still full and still weighted — nothing is dropped or invented.
  });
});

describe("takeBlueprintShare — never short, never padded", () => {
  it("PROPERTY: sum(take) === min(total, sum(stock)), for every count and several stock shapes", () => {
    const shapes = [
      { A: 99, B: 99, C: 99, D: 99, E: 99 }, // ample
      { A: 3, B: 3, C: 3, D: 3, E: 3 },      // exactly the engine's floored batches
      { A: 2, B: 1, C: 0, D: 5, E: 1 },      // ragged
      { A: 1, B: 1, C: 1, D: 1, E: 1 },      // one each
      { A: 0, B: 0, C: 0, D: 0, E: 0 },      // empty bank
      { A: 40, B: 0, C: 0, D: 0, E: 0 },     // single-section topic
    ];
    for (const shape of shapes) {
      const stockTotal = Object.values(shape).reduce((a, b) => a + b, 0);
      for (const total of ALL_COUNTS) {
        const out = takeBlueprintShare(mk(shape), total, keyOf);
        expect(out).toHaveLength(Math.min(total, stockTotal));
      }
    }
  });

  it("PROPERTY: a section is never taken beyond its stock (nothing fabricated)", () => {
    const shape = { A: 2, B: 1, C: 0, D: 5, E: 1 };
    for (const total of ALL_COUNTS) {
      const by = countBySection(takeBlueprintShare(mk(shape), total, keyOf));
      for (const [section, stock] of Object.entries(shape)) {
        expect(by[section] ?? 0).toBeLessThanOrEqual(stock);
      }
    }
  });

  it("PROPERTY: no duplicates, ever", () => {
    for (const total of ALL_COUNTS) {
      const out = takeBlueprintShare(mk({ A: 9, B: 9, C: 9, D: 9, E: 9 }), total, keyOf);
      expect(new Set(out.map(keyOf)).size).toBe(out.length);
    }
  });
});

describe("takeBlueprintShare — redistribution + honest gaps", () => {
  it("a section with LESS stock than its share redistributes — the set is never left short", () => {
    // E's share at 10 is 1, but E has 0. The set must still be 10.
    const out = takeBlueprintShare(mk({ A: 20, B: 20, C: 20, D: 20, E: 0 }), 10, keyOf);
    expect(out).toHaveLength(10);
    expect(countBySection(out).E ?? 0).toBe(0);
  });

  it("ZERO stock in a section is an HONEST gap — no padding, no fabrication", () => {
    // Some topics genuinely have no case-based items. The set fills from real questions
    // in other sections; it never invents an E question to hit the share.
    const out = takeBlueprintShare(mk({ A: 20, B: 20, C: 20, D: 20, E: 0 }), 10, keyOf);
    expect(out.every((q) => !q.id.startsWith("E"))).toBe(true);
  });

  it("D short (1 of its 2) redistributes the surplus, keeping E's slot intact", () => {
    const by = countBySection(takeBlueprintShare(mk({ A: 20, B: 20, C: 20, D: 1, E: 20 }), 10, keyOf));
    expect(by.D).toBe(1);
    expect(by.E).toBeGreaterThanOrEqual(1); // the surplus must NOT come out of E
    expect(Object.values(by).reduce((a, b) => a + b, 0)).toBe(10);
  });

  it("a thin bank returns the REAL smaller number — never padded to the request", () => {
    const out = takeBlueprintShare(mk({ A: 2, B: 1, C: 0, D: 0, E: 1 }), 10, keyOf);
    expect(out).toHaveLength(4); // 2+1+0+0+1 — the honest total
  });

  it("an empty bank returns an empty set (honest empty state)", () => {
    expect(takeBlueprintShare(mk({}), 10, keyOf)).toEqual([]);
    expect(takeBlueprintShare([], 10, keyOf)).toEqual([]);
  });
});

describe("takeBlueprintShare — determinism + dedup", () => {
  it("is PURE — identical inputs give an identical set AND order", () => {
    const a = takeBlueprintShare(mk({ A: 9, B: 9, C: 9, D: 9, E: 9 }), 10, keyOf);
    const b = takeBlueprintShare(mk({ A: 9, B: 9, C: 9, D: 9, E: 9 }), 10, keyOf);
    expect(a.map(keyOf)).toEqual(b.map(keyOf));
  });

  it("takes from the HEAD of each batch — the engine's predictionScore/unseen order is honoured", () => {
    const out = takeBlueprintShare(mk({ A: 9, B: 9, C: 9, D: 9, E: 9 }), 10, keyOf);
    expect(out.map(keyOf)).toEqual(["A0", "A1", "A2", "B0", "B1", "C0", "C1", "D0", "D1", "E0"]);
  });

  it("dedups ACROSS batches — a shared question is served once, and cannot inflate stock", () => {
    const batches: Array<BlueprintBatch<Q>> = [
      { section: "A", share: 0.3, questions: [{ id: "x" }, { id: "A1" }, { id: "A2" }] },
      { section: "B", share: 0.2, questions: [{ id: "x" }, { id: "B1" }] }, // "x" repeated
      { section: "C", share: 0.2, questions: [{ id: "C0" }, { id: "C1" }] },
      { section: "D", share: 0.2, questions: [{ id: "D0" }, { id: "D1" }] },
      { section: "E", share: 0.1, questions: [{ id: "E0" }] },
    ];
    const out = takeBlueprintShare(batches, 10, keyOf);
    expect(out.filter((q) => q.id === "x")).toHaveLength(1); // first occurrence (A) wins
    expect(new Set(out.map(keyOf)).size).toBe(out.length);
  });

  it("count=0 / negative is an empty set, not a crash", () => {
    expect(takeBlueprintShare(mk({ A: 9 }), 0, keyOf)).toEqual([]);
    expect(takeBlueprintShare(mk({ A: 9 }), -5, keyOf)).toEqual([]);
  });
});
