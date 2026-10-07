/**
 * cbqMathsC2C.test.ts — CBQ-1 C2 Maths C: Surface Areas and Volumes competency pack.
 * Pins: every pack row is SERVED and isCbq; the chapter serves >= 100 CBQs;
 * no duplicate stems; every MCQ / AR answer is one of its options; every 1-mark row is
 * MCQ or Assertion-Reasoning; no excluded-topic (frustum / melting-and-recasting) text.
 * Reads no clock.
 */
import { describe, it, expect } from "vitest";

import { canonicalQuestionBank } from "../canonicalQuestionBank";
import { isCbq } from "../../lib/cbq/cbqClassification";
import { SURFACE_AREAS_AND_VOLUMES_CBQ_LT_GENERATED as ROWS } from "../questionBanks/class10/maths/surface-areas-and-volumes.cbq.ltgen";

const SLUG = "surface-areas-and-volumes";

describe("CBQ-1 C2 Maths C pack (Surface Areas and Volumes)", () => {
  const served = new Map(canonicalQuestionBank.map((q) => [q.id, q]));

  it("every pack row is served, isCbq, and in its own chapter", () => {
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
