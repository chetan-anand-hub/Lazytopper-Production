// @vitest-environment node
/**
 * WORKSHEET-FIX-2 (c)-(f): the ?focus= narrowing, the per-section top-up, the AI cap in the skewed draw and the
 * boosted-topic tilt. Small table-driven cases with controls; the real-bank sweep stays in worksheetDraw.guard.test.ts.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("../../data/bankChapters/loader", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../data/bankChapters/loader")>()),
  isAiGeneratedBankId: (id: string) => String(id).startsWith("AI-"),
}));

import { generateFromPlan, narrowToConcept, type WorksheetPlan } from "./worksheetModel";
import { aiCapFor, drawFromSpec, planDraw, stemKey, type DrawSpec, type DrawTools } from "./worksheetShape";
import type { PracticeQuestion } from "../../data/predictionDataService";

let n = 0;
const uniq = () => `distinct stem number ${(n += 1)} about an unrelated subject ${n * 7919} for dedupe tests`;
function row(id: string, section: string, extra: Partial<PracticeQuestion> = {}): PracticeQuestion {
  return { id, section, marks: 1, questionText: uniq(), subtopic: "", ...extra } as unknown as PracticeQuestion;
}
const noShuffle: DrawTools["shuffle"] = (a) => [...a];
const tools: DrawTools = { isAi: (q) => String(q.id).startsWith("AI-"), isCbq: () => false, shuffle: noShuffle };
const SECS = ["A", "B", "C", "D", "E"];

describe("(c) ?focus= narrowing: a row matches the concept or the sheet is honestly short", () => {
  const circlesFocus = "Areas Related to Circles";
  const onConcept = Array.from({ length: 6 }, (_, i) => row(`C${i}`, "B", { subtopic: "Areas Related to Circles" }));
  const offConcept = Array.from({ length: 30 }, (_, i) =>
    row(`T${i}`, "B", { subtopic: "Tangents", questionText: `A circle with a tangent number ${i} and some related areas for question ${uniq()}` }),
  );
  const noSubtopicAll = row("N1", "B", { subtopic: "", questionText: "Find the areas related to circles in this figure of the sector" });
  const noSubtopicOne = row("N2", "B", { subtopic: "", questionText: "A circle has radius 7 cm; find its circumference" });

  it("only rows whose OWN subtopic matches come through; an off-concept word in the stem no longer admits a row", () => {
    const out = narrowToConcept([...onConcept, ...offConcept], circlesFocus);
    expect(out.map((q) => q.id).sort()).toEqual(onConcept.map((q) => q.id).sort());
  });

  it("a row with NO subtopic needs EVERY focus word in its text (one shared word is not enough)", () => {
    const out = narrowToConcept([...onConcept, noSubtopicAll, noSubtopicOne], circlesFocus);
    expect(out.map((q) => q.id)).toContain("N1");
    expect(out.map((q) => q.id)).not.toContain("N2");
  });

  it("an honestly short result is returned as is (2 matches -> 2 rows), and no match keeps the full pool (never an empty sheet)", () => {
    const two = onConcept.slice(0, 2);
    expect(narrowToConcept([...two, ...offConcept], circlesFocus)).toHaveLength(2);
    expect(narrowToConcept(offConcept, circlesFocus)).toHaveLength(offConcept.length);
  });

  it("CONTROL: no focus returns the very same pool (every existing caller is unchanged)", () => {
    const pool = [...onConcept, ...offConcept];
    expect(narrowToConcept(pool, undefined)).toBe(pool);
    expect(narrowToConcept(pool, "   ")).toBe(pool);
  });
});

describe("(d) the top-up of a short section stops at THAT section's own gap", () => {
  it("two short sections (B and D, one row each) get one borrowed row each: A3 B1 C2 D1, not A4 B1 C1 D1", () => {
    const A = Array.from({ length: 8 }, (_, i) => row(`A${i}`, "A"));
    const B = [row("B0", "B")];
    const C = Array.from({ length: 4 }, (_, i) => row(`C${i}`, "C"));
    const D = [row("D0", "D")];
    const pools = new Map([["t", [...A, ...B, ...C, ...D]]]);
    const spec: DrawSpec = {
      mode: "shaped",
      sections: ["A", "B", "C", "D"],
      sectionTargets: { A: 2, B: 2, C: 1, D: 2 },
      cells: [
        { topic: "t", section: "A", n: 2, cbq: 0 },
        { topic: "t", section: "B", n: 2, cbq: 0 },
        { topic: "t", section: "C", n: 1, cbq: 0 },
        { topic: "t", section: "D", n: 2, cbq: 0 },
      ],
      aiCap: 2,
      aiOverCap: 0,
      cbqTarget: 0,
      cbqUnder: 0,
      reallocations: [],
    };
    const out = drawFromSpec(spec, pools, tools);
    const by = (s: string) => out.filter((q) => q.section === s).length;
    expect(out).toHaveLength(7); // the count stays exact
    expect([by("A"), by("B"), by("C"), by("D")]).toEqual([3, 1, 2, 1]);
  });

  it("CONTROL: one short section is still filled from its neighbour, as before", () => {
    const pools = new Map([["t", [...Array.from({ length: 5 }, (_, i) => row(`A${i}`, "A")), row("B0", "B")]]]);
    const spec: DrawSpec = {
      mode: "shaped",
      sections: ["A", "B"],
      sectionTargets: { A: 2, B: 3 },
      cells: [
        { topic: "t", section: "A", n: 2, cbq: 0 },
        { topic: "t", section: "B", n: 3, cbq: 0 },
      ],
      aiCap: 1,
      aiOverCap: 0,
      cbqTarget: 0,
      cbqUnder: 0,
      reallocations: [],
    };
    const out = drawFromSpec(spec, pools, tools);
    expect(out).toHaveLength(5);
    expect(out.filter((q) => q.section === "B")).toHaveLength(1);
  });
});

describe("(e) an un-shaped sheet with an MI boost keeps the AI cap and the stem dedupe", () => {
  const mkPlan = (pool: PracticeQuestion[], allocated: number): WorksheetPlan =>
    ({
      rows: [{ key: "t", allocated }],
      requested: allocated,
      totalAvailable: pool.length,
      totalAllocated: allocated,
      pools: new Map([["t", pool]]),
      sectionBoosts: { C: 3 },
      draw: {
        mode: "free",
        sections: ["*"],
        sectionTargets: {},
        cells: [{ topic: "t", section: "*", n: allocated, cbq: 0 }],
        aiCap: aiCapFor(allocated),
        aiOverCap: 0,
        cbqTarget: 0,
        cbqUnder: 0,
        reallocations: [],
      },
    }) as unknown as WorksheetPlan;
  const isAi = (q: PracticeQuestion) => String(q.id).startsWith("AI-");

  // the boosted section C is ALL AI rows, so an uncapped skewed draw would be mostly AI
  const pool = [
    ...Array.from({ length: 8 }, (_, i) => row(`AI-C${i}`, "C")),
    ...Array.from({ length: 12 }, (_, i) => row(`V-A${i}`, "A")),
  ];

  it.each([
    ["a plan that carries a free-mode draw spec", () => mkPlan(pool, 8)],
    ["the plan planWorksheet really gives an un-shaped boosted sheet (no draw spec)", () => ({ ...mkPlan(pool, 8), draw: null }) as WorksheetPlan],
  ])("8 rows drawn from %s: at most floor(0.3 x 8) = 2 are AI-pack, over many draws", (_n, make) => {
    for (let k = 0; k < 20; k += 1) {
      const out = generateFromPlan(make());
      expect(out).toHaveLength(8);
      expect(out.filter(isAi).length).toBeLessThanOrEqual(aiCapFor(8));
    }
  });

  it("CONTROL: a plan with NO draw spec and NO boost (an older caller) is not capped: the original draw is unchanged", () => {
    const old = { ...mkPlan(pool, 8), draw: null, sectionBoosts: null } as WorksheetPlan;
    const aiCounts = Array.from({ length: 40 }, () => generateFromPlan(old).filter(isAi).length);
    expect(Math.max(...aiCounts)).toBeGreaterThan(aiCapFor(8)); // the cap really is what limits the guarded draw
  });

  it("a repeated long stem is drawn once", () => {
    const stem = "Two tangents are drawn from an external point to a circle of radius 5 cm and the angle between them is 60 degrees. Find the length of each tangent.";
    const dupPool = [
      row("V1", "C", { questionText: stem }),
      row("V2", "C", { questionText: stem }),
      row("V3", "C", { questionText: stem }),
      ...Array.from({ length: 10 }, (_, i) => row(`V-A${i}`, "A")),
    ];
    expect(stemKey(dupPool[0])).not.toBeNull();
    const out = generateFromPlan(mkPlan(dupPool, 6));
    expect(out).toHaveLength(6);
    expect(out.filter((q) => q.questionText === stem)).toHaveLength(1);
  });
});

describe("(f) the section tilt is weighted by what the boosted topics supply, not averaged over every topic", () => {
  const poolsFor = (topics: Array<{ key: string }>) =>
    new Map(topics.map((t) => [t.key, SECS.flatMap((s) => Array.from({ length: 12 }, (_, i) => row(`${t.key}-${s}${i}`, s)))]));

  it("2 weak topics that supply 30 of 40 rows lean a full-subject sheet toward the weak section E; the count is unchanged", () => {
    const topics = [
      ...Array.from({ length: 10 }, (_, i) => ({ key: `o${i}`, allocated: 1 })),
      { key: "w1", allocated: 15 },
      { key: "w2", allocated: 15 },
    ];
    const pools = poolsFor(topics);
    const input = { pools, topics, sections: SECS, requested: 40, cbqOnly: false, tools };
    const base = planDraw(input);
    const boosted = planDraw({ ...input, boosts: { w1: { E: 3 }, w2: { E: 3 } } });
    // the old plain mean over the 12 topics gave a tilt of (10 + 2 x 3) / 12 = 1.33, which moved E by about one row
    expect(boosted.spec.sectionTargets.E).toBeGreaterThanOrEqual(base.spec.sectionTargets.E + 3);
    const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
    expect(sum(boosted.spec.sectionTargets)).toBe(sum(base.spec.sectionTargets));
  });

  it("CONTROL: when EVERY topic carries the same boost the tilt is that boost, and E still rises", () => {
    const topics = Array.from({ length: 4 }, (_, i) => ({ key: `t${i}`, allocated: 10 }));
    const pools = poolsFor(topics);
    const input = { pools, topics, sections: SECS, requested: 40, cbqOnly: false, tools };
    const all = Object.fromEntries(topics.map((t) => [t.key, { E: 3 }]));
    const one = planDraw({ ...input, boosts: all });
    const base = planDraw(input);
    expect(one.spec.sectionTargets.E).toBeGreaterThan(base.spec.sectionTargets.E);
  });
});

import { readyShortfallText } from "./worksheetShape";

describe("(b) the ready card repeats the preview's honest 'only N available' line", () => {
  it("a sheet shorter than the request says so, with both numbers", () => {
    expect(readyShortfallText(47, 50)).toBe("Only 47 unique questions were available for this scope (you asked for 50), so this worksheet has 47 — honest counts, no padding.");
    expect(readyShortfallText(1, 5)).toContain("Only 1 unique question was available");
  });
  it("CONTROLS: a complete sheet, an unknown request (re-opened from history) and a bad count show nothing", () => {
    expect(readyShortfallText(50, 50)).toBeNull();
    expect(readyShortfallText(25, null)).toBeNull();
    expect(readyShortfallText(-1, 5)).toBeNull();
  });
});
