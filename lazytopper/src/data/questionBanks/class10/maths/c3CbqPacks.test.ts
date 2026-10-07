/**
 * c3CbqPacks.test.ts — CBQ-1 C3 PR-1: the Trigonometry + Triangles competency packs.
 *
 * Pins what this PR ships, as FLOORS (a later PR may add rows; none may silently vanish):
 *   - per chapter × marks counts of competency-verified rows in the SERVED bank;
 *   - every row registered in the served bank (a dropped spread turns this red);
 *   - a full CBSE step scheme on every row (leading [N mark] steps summing to marks;
 *     case studies 1 + 1 + 2 as four one-mark steps);
 *   - ids LTG-M-TRIG-/TRI- numbered 2NN and up — never -1NN, which the GEN-THIN-1 PR-2
 *     pin (`pr2.length === 94` in ltGenerated.guard.test.ts) owns.
 * Reads no clock: it imports only the two packs and the assembled bank.
 */

import { describe, it, expect } from "vitest";

import type { CanonicalQuestion } from "../../../predictionTypes";
import { canonicalQuestionBank } from "../../../canonicalQuestionBank";
import { TRIGONOMETRY_CBQ_LT_GENERATED } from "./trigonometry.cbq.ltgen";
import { TRIANGLES_CBQ_LT_GENERATED } from "./triangles.cbq.ltgen";

const PACKS = [
  { slug: "trigonometry", code: "TRIG", rows: TRIGONOMETRY_CBQ_LT_GENERATED, floor: { 1: 32, 2: 17, 3: 14, 4: 29, 5: 11 } },
  { slug: "triangles", code: "TRI", rows: TRIANGLES_CBQ_LT_GENERATED, floor: { 1: 32, 2: 16, 3: 17, 4: 31, 5: 10 } },
] as const;

const STEP = /^\[(\d+(?:\.5)?|½) marks?\]\s/;
const stepValue = (s: string) => {
  const m = STEP.exec(s);
  return m ? (m[1] === "½" ? 0.5 : Number(m[1])) : NaN;
};

describe("CBQ-1 C3 PR-1 · Trigonometry + Triangles competency packs", () => {
  it("every pack row is served, and served competency-verified counts per marks meet the shipped floor", () => {
    const served = new Map(canonicalQuestionBank.map((q) => [q.id, q]));
    for (const p of PACKS) {
      for (const q of p.rows) expect(served.has(q.id), `${q.id} is not in the served bank`).toBe(true);
      const cv = canonicalQuestionBank.filter((q: CanonicalQuestion) => q.topicKey === p.slug && q.competencyVerified === true);
      for (const marks of [1, 2, 3, 4, 5] as const) {
        expect(cv.filter((q) => q.marks === marks).length, `${p.slug} ${marks}-mark`).toBeGreaterThanOrEqual(p.floor[marks]);
      }
      expect(cv.length, `${p.slug} total`).toBeGreaterThanOrEqual(100);
    }
  });

  it("ids follow the LTG scheme for the chapter and never use the -1NN range", () => {
    for (const p of PACKS) {
      for (const q of p.rows) {
        expect(q.id, q.id).toMatch(new RegExp(`^LTG-M-${p.code}-[2-9]\\d\\d$`));
        expect(q.topicKey, q.id).toBe(p.slug);
      }
      expect(new Set(p.rows.map((q) => q.id)).size, `${p.slug} unique ids`).toBe(p.rows.length);
    }
  });

  it("every row carries a full step scheme that sums to its marks; case studies split 1 + 1 + 2", () => {
    for (const p of PACKS) {
      for (const q of p.rows) {
        const marks = (q.solutionSteps ?? []).map(stepValue);
        expect(marks.length, q.id).toBeGreaterThan(0);
        expect(marks.reduce((s, x) => s + x, 0), `${q.id} step marks`).toBe(q.marks);
        expect(q.competencyVerified, q.id).toBe(true);
        expect(q.isCompetencyBased, q.id).toBe(true);
        if (q.format === "Case-Based") {
          expect(marks, `${q.id} case split`).toEqual([1, 1, 1, 1]);
          for (const part of ["(i)", "(ii)", "(iii)"]) expect(q.questionText.includes(part), `${q.id} ${part}`).toBe(true);
        }
      }
    }
  });
});
