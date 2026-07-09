// @vitest-environment node
//
// PARITY GUARD: the client twin `src/lib/objectiveScoring.ts` (used by Quick Practice
// to grade MCQs in the browser) MUST behave identically to the server module
// `server/routes/objectiveScoring.cjs` (used by both graders). If they ever diverge a
// surface could score the same MCQ differently. This test locks them together across a
// case table — normaliseOption, resolveOptionIndex, and scoreObjective.
import { describe, expect, it } from "vitest";
import * as CJS from "../../server/routes/objectiveScoring.cjs";
import * as TS from "../../lib/objectiveScoring";

const OPTIONS_CASES: Array<readonly string[]> = [
  ["0", "7", "14", "1"],
  ["Basic solution", "Acidic solution", "Neutral solution", "Salt solution"],
  ["A", "B", "C", "D"],
  [],
];

const PICKS = [
  "7", "14", "(a)", "(b)", "A", "b", "Acidic solution", "acidic solution",
  "1 : 2", "a) 1 1", "xyz", "", "Both A and R are true, and R is the correct explanation of A.",
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
