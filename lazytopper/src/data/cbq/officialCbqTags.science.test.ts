/**
 * officialCbqTags.science.test.ts — CBQ-1 (C2 PR-1): the OFFICIAL Science rows tagged as CBQs.
 *
 * ★ WHY (owner rulings 1 + 4, 2026-10-07). A question is a CBQ iff `competencyVerified === true`
 * (one flag, read by the CBQ classification module). Official CBSE-origin rows are tagged FIRST,
 * but only rows that (a) a classifier judged competency-based under ruling 1 (application /
 * analysis in a real-life, data, experimental, source or novel context — not recall), (b) already
 * carry a full CBSE step scheme summing to the marks, with any needed figure bound, and (c) an
 * INDEPENDENT BLIND SOLVER reproduced — same answer for every part, same marks per part.
 * Disagreements were left untagged (listed in the PR report), never silently "fixed".
 *
 * This pin makes the tag deliberate: the set of tagged official Science rows must EQUAL the list,
 * in both directions, so a stray tag or a dropped one turns the suite red.
 */

import "../../test/preloadBankChapters";

import { describe, it, expect } from "vitest";

import { canonicalQuestionBank, AI_GENERATED_QUESTION_IDS } from "../canonicalQuestionBank";
import { getFiguresForQuestion } from "../visualConceptRegistry";
import { OFFICIAL_CBQ_SCIENCE_IDS } from "./officialCbqTags.science";

const STEP = /^\[(\d+(?:\.5)?|½) marks?\]/;
const stepSum = (steps: readonly string[]) =>
  steps.reduce((a, s) => {
    const m = STEP.exec(s.trim());
    return m ? a + (m[1] === "½" ? 0.5 : Number(m[1])) : Number.NaN;
  }, 0);
const OFFICIAL_ID = /^(CFPQ|CBE|APQ|SQP|SP-|PYQ)|ncert|exem|exmplr|-n-/i;

describe("CBQ-1 · official Science CBQ tags", () => {
  const byId = new Map(canonicalQuestionBank.map((q) => [q.id, q]));
  const tagged = canonicalQuestionBank.filter(
    (q) => q.subject === "Science" && q.competencyVerified === true && q.origin !== "lt-generated",
  );

  it("the tagged official Science set equals the pinned list exactly (no stray tag, none dropped)", () => {
    expect(new Set(OFFICIAL_CBQ_SCIENCE_IDS).size).toBe(OFFICIAL_CBQ_SCIENCE_IDS.length);
    expect(tagged.map((q) => q.id).sort()).toEqual([...OFFICIAL_CBQ_SCIENCE_IDS].sort());
  });

  it("every listed row is served, Science, official (or pyqYear), not AI, step-marked to its marks, figure bound if needed", () => {
    for (const id of OFFICIAL_CBQ_SCIENCE_IDS) {
      const q = byId.get(id);
      expect(q, `${id} is not a served bank row`).toBeTruthy();
      if (!q) continue;
      expect(q.subject, id).toBe("Science");
      expect(Boolean(q.pyqYear) || OFFICIAL_ID.test(q.id), `${id} is not an official-origin row`).toBe(true);
      expect(AI_GENERATED_QUESTION_IDS.has(id), `${id} is an AI-pack row`).toBe(false);
      expect(q.origin, id).toBeUndefined();
      expect(stepSum(q.solutionSteps ?? []), `${id} step marks`).toBe(q.marks);
      if (q.requiresDiagram) expect(getFiguresForQuestion(id).length, `${id} needs a figure`).toBeGreaterThan(0);
    }
  });

  it("CONTROL — the equality pin fails when one tag is dropped or one stray id is added", () => {
    const ids = tagged.map((q) => q.id).sort();
    expect(ids.length).toBeGreaterThan(1);
    expect(ids.slice(1)).not.toEqual([...OFFICIAL_CBQ_SCIENCE_IDS].sort());
    expect([...ids, "CBE-S-NOT-A-ROW"].sort()).not.toEqual([...OFFICIAL_CBQ_SCIENCE_IDS].sort());
  });
});
