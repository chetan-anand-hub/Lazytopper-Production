import { describe, it, expect } from "vitest";
import { generateFromPlan, type WorksheetPlan, type TopicAllocRow } from "./worksheetModel";
import type { PracticeQuestion } from "../../data/predictionDataService";

// FIX A — within-topic SECTION SKEW (single-topic enrichment). generateFromPlan's
// per-section COUNTS are deterministic (allocateCounts has no randomness); only WHICH
// question within a section is drawn is shuffled — so counting the output by section is
// stable. Runs in CI/Codespaces vitest; not in the Windows quality-gate.

const q = (id: string, section: string, topicKey = "real-numbers"): PracticeQuestion =>
  ({ id, section, topicKey, marks: 1, questionText: id } as unknown as PracticeQuestion);

/** A pool with `perSection` questions in each of the given sections. */
function pool(perSection: Record<string, number>, topicKey = "real-numbers"): PracticeQuestion[] {
  const out: PracticeQuestion[] = [];
  for (const [section, n] of Object.entries(perSection)) {
    for (let i = 0; i < n; i += 1) out.push(q(`${section}-${i}`, section, topicKey));
  }
  return out;
}

function planFor(
  pools: Map<string, PracticeQuestion[]>,
  rows: TopicAllocRow[],
  sectionBoosts: Record<string, number> | null,
): WorksheetPlan {
  const totalAvailable = [...pools.values()].reduce((s, p) => s + p.length, 0);
  const totalAllocated = rows.reduce((s, r) => s + r.allocated, 0);
  return { rows, requested: totalAllocated, totalAvailable, totalAllocated, pools, sectionBoosts };
}

const countBy = (qs: PracticeQuestion[], section: string) =>
  qs.filter((x) => x.section === section).length;

describe("generateFromPlan — single-topic section skew (FIX A)", () => {
  const evenPool = pool({ A: 20, B: 20, C: 20, D: 20, E: 20 }); // 100, evenly spread
  const rows: TopicAllocRow[] = [
    { key: "real-numbers", label: "Real Numbers", weight: 1, available: 100, allocated: 25 },
  ];
  const pools = new Map([["real-numbers", evenPool]]);

  it("skews the drawn set toward the boosted (weak) section — honest count preserved", () => {
    const out = generateFromPlan(planFor(pools, rows, { C: 1.5 }));
    expect(out.length).toBe(25); // honest count — exactly the allocation
    // C is boosted → it must be the single largest section, above the neutral ~5.
    const cCount = countBy(out, "C");
    expect(cCount).toBeGreaterThan(countBy(out, "A"));
    expect(cCount).toBeGreaterThanOrEqual(6);
    for (const s of ["A", "B", "D", "E"]) expect(cCount).toBeGreaterThanOrEqual(countBy(out, s));
  });

  it("without section boosts the draw is the original uniform sample (honest count, unique)", () => {
    const out = generateFromPlan(planFor(pools, rows, null));
    expect(out.length).toBe(25); // honest count — exactly the allocation
    expect(new Set(out.map((x) => x.id)).size).toBe(25); // no duplicates
    // No boost → no single section is forced to dominate (unlike the C:1.5 case).
    const maxSection = Math.max(...["A", "B", "C", "D", "E"].map((s) => countBy(out, s)));
    expect(maxSection).toBeLessThan(25); // a spread, not one section only
  });

  it("HONEST CAP: a weak section thin in the bank is never over-drawn (no fabrication)", () => {
    const thinPool = pool({ A: 20, B: 20, C: 2, D: 20, E: 20 }); // only 2 in the boosted section
    const p = planFor(new Map([["real-numbers", thinPool]]), rows, { C: 5 });
    const out = generateFromPlan(p);
    expect(out.length).toBe(25); // still honest total (others absorb)
    expect(countBy(out, "C")).toBe(2); // capped at real availability, never invented
  });

  it("a boost map that raises nothing above 1.0 falls back to the uniform draw (no skew path)", () => {
    // hasEffectiveBoost is false → the uniform sample path runs (not orderPoolBySectionBoost).
    const out = generateFromPlan(planFor(pools, rows, { C: 1, D: 0.5 }));
    expect(out.length).toBe(25);
    expect(new Set(out.map((x) => x.id)).size).toBe(25);
  });
});

describe("generateFromPlan — cross-topic behaviour is UNCHANGED when no section boosts", () => {
  it("respects each topic's per-row allocation exactly", () => {
    const pools = new Map([
      ["real-numbers", pool({ A: 25, B: 25 }, "real-numbers")],
      ["circles", pool({ C: 25, D: 25 }, "circles")],
    ]);
    const rows: TopicAllocRow[] = [
      { key: "real-numbers", label: "Real Numbers", weight: 1, available: 50, allocated: 15 },
      { key: "circles", label: "Circles", weight: 1, available: 50, allocated: 10 },
    ];
    const out = generateFromPlan(planFor(pools, rows, null));
    expect(out.length).toBe(25);
    expect(out.filter((x) => x.topicKey === "real-numbers").length).toBe(15);
    expect(out.filter((x) => x.topicKey === "circles").length).toBe(10);
  });
});
