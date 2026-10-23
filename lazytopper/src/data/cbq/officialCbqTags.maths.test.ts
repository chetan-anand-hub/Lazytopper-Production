/**
 * officialCbqTags.maths.test.ts — CBQ-1 (C3 PR-T): the OFFICIAL Maths rows tagged as CBQs.
 *
 * ★ WHY (owner rulings 1 + 4, 2026-10-07). A question is a CBQ iff `competencyVerified === true`
 * (one flag, read by the CBQ classification module). Official CBSE-origin rows are tagged only
 * when (a) a classifier judged them competency-based under ruling 1, (b) they already carry a full
 * CBSE step scheme summing to the marks, with any needed figure bound, and (c) an INDEPENDENT BLIND
 * SOLVER reproduced them — same answer for every part, same marks per part — on the row as it
 * stands on trunk. Disagreements were left untagged (listed in the PR report), never "fixed".
 * Every tagged 1-mark row must be an MCQ or assertion-reason item (owner ruling).
 *
 * Mirrors officialCbqTags.science.test.ts: the set of tagged official Maths rows must EQUAL the
 * list, in both directions, so a stray tag or a dropped one turns the suite red.
 */

import "../../test/preloadBankChapters";

import { describe, it, expect } from "vitest";

import { canonicalQuestionBank, AI_GENERATED_QUESTION_IDS, RAW_CANONICAL_QUESTION_BANK, WITHHELD_QUESTION_IDS } from "../canonicalQuestionBank";
import { getFiguresForQuestion } from "../visualConceptRegistry";
import { OFFICIAL_CBQ_MATHS_IDS } from "./officialCbqTags.maths";

const STEP = /^\[(\d+(?:\.5)?|½) marks?\]/;
const stepSum = (steps: readonly string[]) =>
  steps.reduce((a, s) => {
    const m = STEP.exec(s.trim());
    return m ? a + (m[1] === "½" ? 0.5 : Number(m[1])) : Number.NaN;
  }, 0);
const OFFICIAL_ID = /^(CFPQ|CBE|APQ|SQP|SP-|PYQ)|ncert|exem|exmplr|-n-/i;

// GARBLE-1 (D171, 14 Oct 2026): withheld rows that keep `competencyVerified: true` but are out of the pinned list until a REPAIR PR serves them again.
// PYQ-RESTORE-A part 1 (22 Oct 2026): both rows were repaired and served again, and are back in OFFICIAL_CBQ_MATHS_IDS (RESTORED_ON_REPAIR below).
const RESTORE_ON_REPAIR: readonly string[] = [];
const RESTORED_ON_REPAIR: readonly string[] = ["PYQ-M-2025-STAT-006", "PYQ-M-2025-TRIG-005"];

describe("CBQ-1 · official Maths CBQ tags", () => {
  const byId = new Map(canonicalQuestionBank.map((q) => [q.id, q]));
  const tagged = canonicalQuestionBank.filter(
    (q) => q.subject === "Maths" && q.competencyVerified === true && q.origin !== "lt-generated",
  );

  it("the tagged official Maths set equals the pinned list exactly (no stray tag, none dropped)", () => {
    expect(new Set(OFFICIAL_CBQ_MATHS_IDS).size).toBe(OFFICIAL_CBQ_MATHS_IDS.length);
    expect(tagged.map((q) => q.id).sort()).toEqual([...OFFICIAL_CBQ_MATHS_IDS].sort());
  });

  it("RESTORE_ON_REPAIR: each is withheld, still tagged in the raw bank, and absent from the pinned list; re-serving one would be RED (mutation)", () => {
    const raw = new Map(RAW_CANONICAL_QUESTION_BANK.map((q) => [q.id, q]));
    for (const id of RESTORE_ON_REPAIR) {
      expect(WITHHELD_QUESTION_IDS.has(id), `${id} must be withheld`).toBe(true);
      expect(raw.get(id)?.competencyVerified, `${id} keeps its tag`).toBe(true);
      expect(OFFICIAL_CBQ_MATHS_IDS.includes(id), `${id} is not in the pinned list`).toBe(false);
    }
    // the repaired rows are served, still tagged, and listed
    for (const id of RESTORED_ON_REPAIR) {
      expect(WITHHELD_QUESTION_IDS.has(id), `${id} is served again`).toBe(false);
      expect(byId.get(id)?.competencyVerified, `${id} keeps its tag`).toBe(true);
      expect(OFFICIAL_CBQ_MATHS_IDS.includes(id), `${id} is back in the pinned list`).toBe(true);
    }
    // mutation: drop STAT-006 from the served tagged set and the tagged-set pin must go RED
    const served = tagged.map((q) => q.id).filter((id) => id !== "PYQ-M-2025-STAT-006").sort();
    expect(served).not.toEqual([...OFFICIAL_CBQ_MATHS_IDS].sort());
  });

  it("every listed row is served, Maths, official (or pyqYear), not AI, step-marked to its marks, figure bound if needed", () => {
    for (const id of OFFICIAL_CBQ_MATHS_IDS) {
      const q = byId.get(id);
      expect(q, `${id} is not a served bank row`).toBeTruthy();
      if (!q) continue;
      expect(q.subject, id).toBe("Maths");
      expect(Boolean(q.pyqYear) || OFFICIAL_ID.test(q.id), `${id} is not an official-origin row`).toBe(true);
      expect(AI_GENERATED_QUESTION_IDS.has(id), `${id} is an AI-pack row`).toBe(false);
      expect(q.origin, id).toBeUndefined();
      expect(stepSum(q.solutionSteps ?? []), `${id} step marks`).toBe(q.marks);
      if (q.requiresDiagram) expect(getFiguresForQuestion(id).length, `${id} needs a figure`).toBeGreaterThan(0);
    }
  });

  it("every listed 1-mark row is an MCQ or assertion-reason item with four options (owner ruling)", () => {
    const oneMark = OFFICIAL_CBQ_MATHS_IDS.map((id) => byId.get(id)).filter((q) => q?.marks === 1);
    expect(oneMark.length).toBeGreaterThan(0);
    for (const q of oneMark) {
      if (!q) continue;
      expect(["MCQ", "Assertion-Reasoning"], `${q.id} format`).toContain(q.format);
      expect(q.options?.length, `${q.id} options`).toBe(4);
    }
  });

  it("CONTROL — the equality pin fails when one tag is dropped or one stray id is added", () => {
    const ids = tagged.map((q) => q.id).sort();
    expect(ids.length).toBeGreaterThan(1);
    expect(ids.slice(1)).not.toEqual([...OFFICIAL_CBQ_MATHS_IDS].sort());
    expect([...ids, "CBE-M-NOT-A-ROW"].sort()).not.toEqual([...OFFICIAL_CBQ_MATHS_IDS].sort());
  });
});
