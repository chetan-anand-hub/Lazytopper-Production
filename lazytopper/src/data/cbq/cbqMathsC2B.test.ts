/**
 * cbqMathsC2B.test.ts — CBQ-1 C2 Maths batch B: Probability, Polynomials, Real Numbers (second pack).
 * Pins: every pack row is served and a CBQ; each chapter serves >= 100 CBQs; no duplicate stems;
 * every MCQ answer is one of its options; every 1-mark row is an MCQ or an Assertion-Reasoning item.
 * Reads no clock.
 */
import { describe, it, expect } from "vitest";

import { canonicalQuestionBank } from "../canonicalQuestionBank";
import { isCbq } from "../../lib/cbq/cbqClassification";
import { PROBABILITY_CBQ_LT_GENERATED } from "../questionBanks/class10/maths/probability.cbq.ltgen";
import { POLYNOMIALS_CBQ_LT_GENERATED } from "../questionBanks/class10/maths/polynomials.cbq.ltgen";
import { REAL_NUMBERS_C3_CBQ_LT_GENERATED } from "../questionBanks/class10/maths/real-numbers.c3.cbq.ltgen";

const PACKS = [
  { slug: "probability", rows: PROBABILITY_CBQ_LT_GENERATED },
  { slug: "polynomials", rows: POLYNOMIALS_CBQ_LT_GENERATED },
  { slug: "real-numbers", rows: REAL_NUMBERS_C3_CBQ_LT_GENERATED },
] as const;

const stemKey = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

describe("CBQ-1 C2 Maths batch B packs", () => {
  it("every pack row is served and counted as a CBQ", () => {
    const served = new Map(canonicalQuestionBank.map((q) => [q.id, q]));
    for (const p of PACKS) {
      expect(p.rows.length, p.slug).toBeGreaterThan(0);
      for (const r of p.rows) {
        const q = served.get(r.id);
        expect(q, `${r.id} not served`).toBeDefined();
        expect(isCbq(q), `${r.id} not a CBQ`).toBe(true);
        expect(q?.topicKey, r.id).toBe(p.slug);
      }
    }
  });

  it("each chapter serves at least 100 CBQs", () => {
    for (const p of PACKS) {
      const n = canonicalQuestionBank.filter((q) => q.topicKey === p.slug && isCbq(q)).length;
      expect(n, p.slug).toBeGreaterThanOrEqual(100);
    }
  });

  it("no duplicate stems inside or across the three packs", () => {
    const seen = new Map<string, string>();
    for (const p of PACKS) {
      for (const r of p.rows) {
        const k = `${r.topicKey}|${stemKey(r.questionText)}`;
        expect(seen.has(k), `${r.id} duplicates ${seen.get(k)}`).toBe(false);
        seen.set(k, r.id);
      }
    }
  });

  it("every MCQ answer is one of its options", () => {
    for (const p of PACKS) {
      for (const r of p.rows) {
        if (r.format !== "MCQ") continue;
        expect(r.options ?? [], r.id).toContain(r.answer);
      }
    }
  });

  it("every 1-mark row is an MCQ or an Assertion-Reasoning item", () => {
    for (const p of PACKS) {
      for (const r of p.rows) {
        if (r.marks !== 1) continue;
        expect(["MCQ", "Assertion-Reasoning"], r.id).toContain(r.format);
      }
    }
  });
});
