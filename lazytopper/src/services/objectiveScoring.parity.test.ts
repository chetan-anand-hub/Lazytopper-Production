// @vitest-environment node
//
// PARITY GUARD: the client twin `src/lib/objectiveScoring.ts` (used by Quick Practice
// to grade MCQs in the browser) MUST behave identically to the server module
// `server/routes/objectiveScoring.cjs` (used by both graders). If they ever diverge a
// surface could score the same MCQ differently. This test locks them together across a
// case table — normaliseOption, resolveOptionIndex, and scoreObjective — and across the
// SHARED fixture table `server/grading/objectiveParity.fixtures.json` (GRADER-CORE-1 PR-2,
// C5), which the server suite `server/grading/core.test.cjs` reads too.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as CJS from "../../server/routes/objectiveScoring.cjs";
import * as TS from "../lib/objectiveScoring";

const OPTIONS_CASES: Array<readonly string[]> = [
  ["0", "7", "14", "1"],
  ["Basic solution", "Acidic solution", "Neutral solution", "Salt solution"],
  ["A", "B", "C", "D"],
  [],
];

const PICKS = [
  "7", "14", "(a)", "(b)", "A", "b", "Acidic solution", "acidic solution",
  "1 : 2", "a) 1 1", "xyz", "", "Both A and R are true, and R is the correct explanation of A.",
  // Every punctuation class BOTH twins strip must be represented, or a divergence in
  // the strip set passes unnoticed: brackets/braces, terminal dot, quotes, whitespace.
  "[b]", "{c}", "d.", "\"A\"", "  B  ", "1.5", "Basic solution!",
];

describe("client twin ↔ server module parity", () => {
  it("normaliseOption matches on every pick", () => {
    for (const p of PICKS) {
      expect(TS.normaliseOption(p)).toBe(CJS.normaliseOption(p));
    }
  });

  it("resolveOptionIndex matches on every (pick, options) pair", () => {
    for (const opts of OPTIONS_CASES) {
      for (const p of PICKS) {
        expect(TS.resolveOptionIndex(p, opts)).toBe(CJS.resolveOptionIndex(p, opts));
      }
    }
  });

  it("scoreObjective matches on every (answerKey, studentPick, options) triple", () => {
    for (const opts of OPTIONS_CASES) {
      for (const answerKey of PICKS) {
        for (const studentPick of PICKS) {
          const a = TS.scoreObjective({ answerKey, studentPick, options: opts, totalMarks: 1 });
          const b = CJS.scoreObjective({ answerKey, studentPick, options: opts, totalMarks: 1 });
          expect(a).toEqual(b);
        }
      }
    }
  });
});

// The shared table. `expect` on each row is the owner ruling for that row (C5): compare
// case-sensitively only when two options differ only by case, case-folded otherwise.
interface FixtureRow {
  id: string;
  options: string[];
  answerKey: string;
  studentPick: string;
  expect: { marksAwarded: number; correct: boolean; resolved: boolean };
}
interface FixtureTable {
  rows: FixtureRow[];
  optionSets: Array<{ options: string[]; differOnlyByCase: boolean }>;
}
const FIXTURES = JSON.parse(
  readFileSync(new URL("../../server/grading/objectiveParity.fixtures.json", import.meta.url), "utf8"),
) as FixtureTable;

describe("client twin ↔ server module parity — the shared fixture table (C5)", () => {
  it("the table is loaded and carries the case-collision and case-fold rows", () => {
    expect(FIXTURES.rows.length).toBeGreaterThanOrEqual(15);
    const ids = FIXTURES.rows.map((r) => r.id);
    expect(ids).toContain("genotype-wrong-case-variant");
    expect(ids).toContain("coincident-case-folded");
  });

  it("scoreObjective: TS === CJS on every row, and both return the row's ruled verdict", () => {
    for (const row of FIXTURES.rows) {
      const args = { answerKey: row.answerKey, studentPick: row.studentPick, options: row.options, totalMarks: 1 };
      const ts = TS.scoreObjective(args);
      expect(ts, row.id).toEqual(CJS.scoreObjective(args));
      expect(ts, row.id).toEqual(row.expect);
    }
  });

  it("resolveOptionIndex: TS === CJS for the key and the pick of every row", () => {
    for (const row of FIXTURES.rows) {
      for (const value of [row.answerKey, row.studentPick]) {
        expect(TS.resolveOptionIndex(value, row.options), `${row.id}: ${value}`).toBe(
          CJS.resolveOptionIndex(value, row.options),
        );
      }
    }
  });

  it("optionsDifferOnlyByCase: TS === CJS on every option set, and both match the ruled value", () => {
    const sets: Array<{ options: string[]; differOnlyByCase: boolean | null }> = [
      ...FIXTURES.optionSets,
      ...FIXTURES.rows.map((r) => ({ options: r.options, differOnlyByCase: null })),
    ];
    for (const set of sets) {
      const ts = TS.optionsDifferOnlyByCase(set.options);
      expect(ts, JSON.stringify(set.options)).toBe(CJS.optionsDifferOnlyByCase(set.options));
      if (set.differOnlyByCase !== null) expect(ts, JSON.stringify(set.options)).toBe(set.differOnlyByCase);
    }
  });

  it("CONTROL: on the genotype options the case-sensitive compare is what separates the variants", () => {
    const genotypes = ["TTWW", "TTww", "TtWW", "TtWw"];
    // Folded, the four genotypes are one string (the defect C5 removes) ...
    expect(new Set(genotypes.map((g) => TS.normaliseOption(g))).size).toBe(1);
    // ... yet each resolves to its own index, on both sides.
    expect(genotypes.map((g) => TS.resolveOptionIndex(g, genotypes))).toEqual([0, 1, 2, 3]);
    expect(genotypes.map((g) => CJS.resolveOptionIndex(g, genotypes))).toEqual([0, 1, 2, 3]);
  });
});
