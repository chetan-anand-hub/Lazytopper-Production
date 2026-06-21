import { describe, it, expect } from "vitest";
import {
  allocateCounts,
  getTopics,
  weightFor,
  DELETED_TOPIC_KEYS,
  MI_BOOST,
  type TopicAllocInput,
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
