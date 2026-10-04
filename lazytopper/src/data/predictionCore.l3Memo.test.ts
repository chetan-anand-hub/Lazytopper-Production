// LOW-END-1 PR-1 (L3) — the shared recurrence memo returns EXACTLY what scoring each row from
// scratch returns, for every row of every bank chapter.
//
// getBayesianMultiplier now shares one scoreTopicRecurrenceConfidence result between all
// questions with the same (year, subject, topic, format, bloom [, deleted sub-topic]). That is
// correct only while probabilisticScoring.ts reads no other input field. This suite is the
// tripwire: for every row it asks the MEMO for a multiplier (a probe id that misses the per-id
// cache, so the shared-input memo answers — usually with a value another row computed) and
// requires it to equal computeBayesianMultiplierUncached (no cache of any kind).

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import "../test/preloadBankChapters";
import { BANK_CHAPTER_SLUGS } from "./bankChapters/loader";
import {
  PredictionCore,
  computeBayesianMultiplierUncached,
  getBayesianMultiplier,
  type CanonicalQuestionWithScore,
} from "./predictionCore";

describe("L3 — the recurrence memo equals the uncached score for every bank row", () => {
  beforeAll(() => vi.stubEnv("VITE_PREDICTION_TARGET_YEAR", "2026"));
  afterAll(() => vi.unstubAllEnvs());

  it("every row of all 26 chapters: memo answer === uncached answer", () => {
    let rows = 0;
    let shared = 0;
    const distinct = new Set<number>();
    const mismatches: string[] = [];
    for (const slug of BANK_CHAPTER_SLUGS) {
      const chapter = PredictionCore.getLikelyQuestionsForConcept(slug) as CanonicalQuestionWithScore[];
      for (const q of chapter) {
        const uncached = computeBayesianMultiplierUncached(q);
        const probe = { ...q, id: `${q.id}::l3-memo-probe` };
        const memo = getBayesianMultiplier(probe);
        if (memo !== uncached) mismatches.push(`${slug} ${q.id}: memo ${memo} vs uncached ${uncached}`);
        rows += 1;
        distinct.add(uncached);
      }
      shared += chapter.length;
    }
    expect(mismatches.slice(0, 10)).toEqual([]);
    // The comparison covered something real.
    expect(rows).toBeGreaterThan(5000);
    expect(shared).toBe(rows);
    expect(distinct.size).toBeGreaterThan(10);
  });

  it("a field the scorer ignores (marks, policyTag) does not change the value; a field it reads (format) does", () => {
    const [q] = PredictionCore.getLikelyQuestionsForConcept("trigonometry") as CanonicalQuestionWithScore[];
    const a = { ...q, id: "l3-control-a", marks: 1, policyTag: "x" };
    const b = { ...q, id: "l3-control-b", marks: 5, policyTag: "y" };
    expect(getBayesianMultiplier(a)).toBe(getBayesianMultiplier(b));
    // …and a field it DOES read (format) is part of the key: a different format is scored afresh.
    const c: CanonicalQuestionWithScore = { ...q, id: "l3-control-c", format: q.format === "Case-Based" ? "MCQ" : "Case-Based" };
    expect(getBayesianMultiplier(c)).toBe(computeBayesianMultiplierUncached(c));
  });
});
