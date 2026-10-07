/**
 * cbqMathsC2C.test.ts — CBQ-1 C2 Maths C: Surface Areas and Volumes competency pack.
 * Pins: every pack row is SERVED and isCbq; the chapter serves >= 100 CBQs;
 * no duplicate stems; every MCQ / AR answer is one of its options; every 1-mark row is
 * MCQ or Assertion-Reasoning; no excluded-topic (frustum / melting-and-recasting) text.
 * Owner rulings (2026-10-07): single-solid questions only at 1–2 marks, so every 3+ mark row is a
 * combination of solids. SAV-250/259 (a solid dropped into water) are SERVED: C1 DECISION 11:35Z under the
 * standing rule — CBSE Class X Maths Standard board exam 2025, set 30/3/1, Q35 asks water displacement, so it is IN
 * (withheld earlier at 05:47Z; restored after an Opus blind re-solve, 2/2 agree).
 * Reads no clock.
 */
import { describe, it, expect } from "vitest";

import { canonicalQuestionBank, WITHHELD_QUESTION_IDS } from "../canonicalQuestionBank";
import { isCbq } from "../../lib/cbq/cbqClassification";
import { SURFACE_AREAS_AND_VOLUMES_CBQ_LT_GENERATED as ROWS } from "../questionBanks/class10/maths/surface-areas-and-volumes.cbq.ltgen";

const SLUG = "surface-areas-and-volumes";
const DISPLACEMENT_RESTORED = ["LTG-M-SAV-250", "LTG-M-SAV-259"] as const;
const COMBINED = /^(Surface Area of Combined Solids|Volume of Combined Solids|Combination of Solids)$/;

describe("CBQ-1 C2 Maths C pack (Surface Areas and Volumes)", () => {
  const served = new Map(canonicalQuestionBank.map((q) => [q.id, q]));

  it("C1 DECISION 11:35Z: SAV-250 and SAV-259 (water displacement, CBSE 2025 30/3/1 Q35) are served", () => {
    for (const id of DISPLACEMENT_RESTORED) {
      expect(ROWS.some((q) => q.id === id), `${id} in the pack`).toBe(true);
      expect(WITHHELD_QUESTION_IDS.has(id), id).toBe(false);
      expect(served.has(id), id).toBe(true);
    }
  });

  it("owner ruling: every 3+ mark row combines solids (single solids only at 1-2 marks)", () => {
    const big = ROWS.filter((q) => q.marks >= 3);
    expect(big.length).toBeGreaterThan(40);
    for (const q of big) expect(q.subtopic, q.id).toMatch(COMBINED);
    // control: a single-solid label would fail
    expect("Volume of Solids").not.toMatch(COMBINED);
  });

  it("every served pack row is isCbq and in its own chapter", () => {
    expect(ROWS.length).toBeGreaterThan(0);
    for (const q of ROWS) {
      const s = served.get(q.id);
      expect(s, `${q.id} not served`).toBeDefined();
      expect(isCbq(s), `${q.id} not isCbq`).toBe(true);
      expect(q.topicKey, q.id).toBe(SLUG);
    }
  });

  it("the chapter serves at least 100 CBQs", () => {
    const n = canonicalQuestionBank.filter((q) => q.topicKey === SLUG && isCbq(q)).length;
    expect(n).toBeGreaterThanOrEqual(100);
  });

  it("no duplicate stems", () => {
    const stems = ROWS.map((q) => q.questionText.trim().toLowerCase().replace(/\s+/g, " "));
    expect(new Set(stems).size).toBe(stems.length);
  });

  it("every MCQ / Assertion-Reasoning answer is one of its four options", () => {
    for (const q of ROWS) {
      if (q.format !== "MCQ" && q.format !== "Assertion-Reasoning") continue;
      expect(q.options?.length, q.id).toBe(4);
      expect(q.options, q.id).toContain(q.answer);
    }
  });

  it("every 1-mark row is MCQ or Assertion-Reasoning", () => {
    for (const q of ROWS.filter((r) => r.marks === 1)) {
      expect(["MCQ", "Assertion-Reasoning"], q.id).toContain(q.format);
    }
  });

  it("no frustum or melting-and-recasting text (excluded from 2026-27)", () => {
    for (const q of ROWS) {
      const text = [q.questionText, q.answer, q.finalAnswer, ...(q.options ?? []), ...(q.solutionSteps ?? [])].join(" ");
      expect(text, q.id).not.toMatch(/frustum|melted|melting|recast/i);
    }
  });
});
