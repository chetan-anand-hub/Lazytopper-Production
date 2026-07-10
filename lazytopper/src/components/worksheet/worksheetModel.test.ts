import { describe, it, expect } from "vitest";
import {
  allocateCounts,
  allocateMiCounts,
  miCapFractionFor,
  MI_CAP_FRACTION_MANY,
  MI_CAP_FRACTION_TWO,
  getTopics,
  weightFor,
  DELETED_TOPIC_KEYS,
  MI_BOOST,
  type TopicAllocInput,
  type MiTopicAllocInput,
} from "./worksheetModel";

// PR-E2a — distribution + content-correctness unit tests. Pure, deterministic
// (allocateCounts has no randomness). Runs in CI/Codespaces vitest; not in the
// Windows-local quality-gate matrix.

const rows = (...specs: Array<[string, number, number]>): TopicAllocInput[] =>
  specs.map(([key, weight, available]) => ({ key, label: key, weight, available }));

describe("allocateCounts — even split (multi-topic)", () => {
  it("splits evenly with the remainder to the first by fractional order", () => {
    const out = allocateCounts(rows(["a", 1, 99], ["b", 1, 99]), 25);
    expect(out.map((r) => r.allocated).sort((x, y) => y - x)).toEqual([13, 12]);
    expect(out.reduce((s, r) => s + r.allocated, 0)).toBe(25);
  });

  it("three-way even split sums to the requested total", () => {
    const out = allocateCounts(rows(["a", 1, 99], ["b", 1, 99], ["c", 1, 99]), 20);
    expect(out.reduce((s, r) => s + r.allocated, 0)).toBe(20);
    // each within 1 of 20/3
    for (const r of out) expect(Math.abs(r.allocated - 20 / 3)).toBeLessThanOrEqual(1);
  });
});

describe("allocateCounts — board-weightage split (full-subject)", () => {
  it("allocates proportionally to weight", () => {
    // weights 15 vs 5 of 20 → 15 / 5
    const out = allocateCounts(rows(["trig", 15, 99], ["stat", 5, 99]), 20);
    const byKey = Object.fromEntries(out.map((r) => [r.key, r.allocated]));
    expect(byKey.trig).toBe(15);
    expect(byKey.stat).toBe(5);
  });
});

describe("allocateCounts — MI boost reproduces the locked 15:10 example", () => {
  it("a 1.5x boost on one of two even topics yields 15:10 of 25", () => {
    expect(MI_BOOST).toBe(1.5);
    const out = allocateCounts(rows(["trig", 1 * MI_BOOST, 99], ["stat", 1, 99]), 25);
    const byKey = Object.fromEntries(out.map((r) => [r.key, r.allocated]));
    expect(byKey.trig).toBe(15);
    expect(byKey.stat).toBe(10);
  });
});

describe("allocateCounts — honest counts (availability cap)", () => {
  it("never allocates more than a topic's real availability", () => {
    const out = allocateCounts(rows(["a", 1, 4], ["b", 1, 99]), 25);
    const byKey = Object.fromEntries(out.map((r) => [r.key, r.allocated]));
    expect(byKey.a).toBeLessThanOrEqual(4);
    // the shortfall flows to b (which has capacity)
    expect(byKey.a + byKey.b).toBe(25);
  });

  it("total allocated equals total capacity when capacity < requested", () => {
    const out = allocateCounts(rows(["a", 1, 3], ["b", 1, 2]), 25);
    expect(out.reduce((s, r) => s + r.allocated, 0)).toBe(5); // 3 + 2, never 25
  });

  it("allocates nothing when requested is zero", () => {
    const out = allocateCounts(rows(["a", 1, 9]), 0);
    expect(out[0].allocated).toBe(0);
  });
});

const miRows = (...specs: Array<[string, number, number, number]>): MiTopicAllocInput[] =>
  specs.map(([key, weight, available, marksLost]) => ({ key, label: key, weight, available, marksLost }));

describe("miCapFractionFor — cap engages only at 3+ topics (owner decision 2026-07-10)", () => {
  it("2 topics keep the ~60% ceiling; 3+ cap at ~50%", () => {
    expect(miCapFractionFor(1)).toBe(MI_CAP_FRACTION_TWO);
    expect(miCapFractionFor(2)).toBe(MI_CAP_FRACTION_TWO);
    expect(miCapFractionFor(3)).toBe(MI_CAP_FRACTION_MANY);
    expect(miCapFractionFor(4)).toBe(MI_CAP_FRACTION_MANY);
    expect(MI_CAP_FRACTION_TWO).toBe(0.6);
    expect(MI_CAP_FRACTION_MANY).toBe(0.5);
  });
});

describe("allocateMiCounts — proportional enrichment with floor + cap (FIX-3)", () => {
  it("2-topic single-weak preserves the locked ~60/40 tilt (15:10 of 25)", () => {
    // even base weights (1,1); only topic a has marks lost → keeps the shipped prototype.
    const out = allocateMiCounts(miRows(["a", 1, 99, 8], ["b", 1, 99, 0]), 25, miCapFractionFor(2));
    const byKey = Object.fromEntries(out.map((r) => [r.key, r.allocated]));
    expect(byKey.a).toBe(15);
    expect(byKey.b).toBe(10);
    expect(out.reduce((s, r) => s + r.allocated, 0)).toBe(25);
  });

  it("3+ topics: no single topic exceeds ~50% however lopsided the marks lost", () => {
    const out = allocateMiCounts(
      miRows(["a", 1, 99, 100], ["b", 1, 99, 1], ["c", 1, 99, 1]),
      25,
      miCapFractionFor(3),
    );
    const byKey = Object.fromEntries(out.map((r) => [r.key, r.allocated]));
    expect(byKey.a).toBeLessThanOrEqual(Math.floor(25 * 0.5)); // ≤ 12 — a tilt, not a takeover
    expect(byKey.b).toBeGreaterThanOrEqual(1); // floors kept for the other chosen topics
    expect(byKey.c).toBeGreaterThanOrEqual(1);
    expect(out.reduce((s, r) => s + r.allocated, 0)).toBe(25);
  });

  it("a zero-MI chosen topic is never dropped — the selection is intent, MI only tilts", () => {
    const out = allocateMiCounts(
      miRows(["weak", 1, 99, 50], ["chosen", 1, 99, 0], ["also", 1, 99, 0]),
      20,
      miCapFractionFor(3),
    );
    const byKey = Object.fromEntries(out.map((r) => [r.key, r.allocated]));
    expect(byKey.chosen).toBeGreaterThanOrEqual(1);
    expect(byKey.also).toBeGreaterThanOrEqual(1);
    expect(byKey.weak).toBeLessThanOrEqual(Math.floor(20 * 0.5));
    expect(out.reduce((s, r) => s + r.allocated, 0)).toBe(20);
  });

  it("honest counts: total == min(requested, capacity); availability is never exceeded", () => {
    const out = allocateMiCounts(miRows(["a", 1, 4, 10], ["b", 1, 3, 0]), 25, miCapFractionFor(2));
    const byKey = Object.fromEntries(out.map((r) => [r.key, r.allocated]));
    expect(byKey.a).toBeLessThanOrEqual(4);
    expect(byKey.b).toBeLessThanOrEqual(3);
    expect(out.reduce((s, r) => s + r.allocated, 0)).toBe(7); // 4 + 3 capacity, never 25
  });

  it("weak topics keep the larger (proportional) share within the cap", () => {
    const out = allocateMiCounts(
      miRows(["a", 1, 99, 9], ["b", 1, 99, 3], ["c", 1, 99, 0]),
      24,
      miCapFractionFor(3),
    );
    const byKey = Object.fromEntries(out.map((r) => [r.key, r.allocated]));
    expect(byKey.a).toBeGreaterThan(byKey.b);
    expect(byKey.b).toBeGreaterThan(byKey.c);
    expect(byKey.c).toBeGreaterThanOrEqual(1); // floor
  });
});

describe("content correctness — deleted topics never offered", () => {
  it("strips heredity-and-evolution and magnetic-effects from Science", () => {
    const keys = getTopics("Science").map((t) => t.key);
    expect(keys).not.toContain("heredity-and-evolution");
    expect(keys).not.toContain("magnetic-effects");
    expect(DELETED_TOPIC_KEYS.has("heredity-and-evolution")).toBe(true);
    expect(DELETED_TOPIC_KEYS.has("magnetic-effects")).toBe(true);
  });

  it("Maths topics are all retained (no deleted whole-chapters)", () => {
    expect(getTopics("Maths").length).toBe(13);
  });

  it("Science stream filter narrows the visible set", () => {
    const chem = getTopics("Science", "Chemistry");
    expect(chem.every((t) => t.stream === "Chemistry")).toBe(true);
    expect(chem.length).toBeGreaterThan(0);
  });
});

describe("weightFor — real CBSE weightage is available for in-syllabus topics", () => {
  it("returns a positive weight for a mapped Maths topic", () => {
    expect(weightFor("Maths", "trigonometry") ?? 0).toBeGreaterThan(0);
  });
  it("returns a positive weight for a mapped Science topic", () => {
    expect(weightFor("Science", "life-processes") ?? 0).toBeGreaterThan(0);
  });
});
