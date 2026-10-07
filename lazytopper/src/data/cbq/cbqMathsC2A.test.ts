/**
 * cbqMathsC2A.test.ts — CBQ-1 C2 Maths A: Arithmetic Progression, Circles (second pack),
 * Areas Related to Circles competency packs.
 * Pins: every pack row is SERVED and isCbq; each chapter serves >= 100 CBQs;
 * no duplicate stems inside a chapter; every MCQ / AR answer is one of its options.
 * Reads no clock.
 */
import { describe, it, expect } from "vitest";

import { canonicalQuestionBank } from "../canonicalQuestionBank";
import { isCbq } from "../../lib/cbq/cbqClassification";
import { ARITHMETIC_PROGRESSION_CBQ_LT_GENERATED } from "../questionBanks/class10/maths/arithmetic-progression.cbq.ltgen";
import { CIRCLES_C3_CBQ_LT_GENERATED } from "../questionBanks/class10/maths/circles.c3.cbq.ltgen";
import { AREAS_RELATED_TO_CIRCLES_CBQ_LT_GENERATED } from "../questionBanks/class10/maths/areas-related-to-circles.cbq.ltgen";

const PACKS = [
  { slug: "arithmetic-progression", rows: ARITHMETIC_PROGRESSION_CBQ_LT_GENERATED },
  { slug: "circles", rows: CIRCLES_C3_CBQ_LT_GENERATED },
  { slug: "areas-related-to-circles", rows: AREAS_RELATED_TO_CIRCLES_CBQ_LT_GENERATED },
] as const;

describe("CBQ-1 C2 Maths A packs", () => {
  const served = new Map(canonicalQuestionBank.map((q) => [q.id, q]));

  it("every pack row is served, isCbq, and in its own chapter", () => {
    for (const p of PACKS) {
      expect(p.rows.length, p.slug).toBeGreaterThan(0);
      for (const q of p.rows) {
        const s = served.get(q.id);
        expect(s, `${q.id} not served`).toBeDefined();
        expect(isCbq(s), `${q.id} not isCbq`).toBe(true);
        expect(q.topicKey, q.id).toBe(p.slug);
      }
    }
  });

  it("each chapter serves at least 100 CBQs", () => {
    for (const p of PACKS) {
      const n = canonicalQuestionBank.filter((q) => q.topicKey === p.slug && isCbq(q)).length;
      expect(n, p.slug).toBeGreaterThanOrEqual(100);
    }
  });

  it("no duplicate stems within a chapter's pack", () => {
    for (const p of PACKS) {
      const stems = p.rows.map((q) => q.questionText.trim().toLowerCase().replace(/\s+/g, " "));
      expect(new Set(stems).size, p.slug).toBe(stems.length);
    }
  });

  it("every MCQ / Assertion-Reasoning answer is one of its four options", () => {
    for (const p of PACKS) {
      for (const q of p.rows) {
        if (q.format !== "MCQ" && q.format !== "Assertion-Reasoning") continue;
        expect(q.options?.length, q.id).toBe(4);
        expect(q.options, q.id).toContain(q.answer);
      }
    }
  });
});
