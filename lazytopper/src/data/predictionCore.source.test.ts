// AI-tier PR2a — source-provenance ranking tests.
//
// Proves the soft AI-lower ranking added to getAdjustedScore:
//   1. With equal base scores and otherwise-identical fields, EVERY authentic
//      question ranks above EVERY ai-generated question (soft demotion works).
//   2. The demotion is SOFT, not a hard partition: a strong AI question can
//      still outrank a weak authentic one (AI surfaces when authentic is thin).
//   3. Tier ordering authentic > predicted > ai, and no tier is zeroed out.
//   4. The live pool still classifies every served question and AI's pool
//      share is materially below parity (drift guard for the AI-pack id list).

import { describe, it, expect } from "vitest";
import {
  getAdjustedScore,
  PredictionCore,
  type CanonicalQuestionWithScore,
  type QuestionSource,
} from "./predictionCore";

// A scoring-identical question differing only in id + tier, so the source
// multiplier is the only term that can change the adjusted score.
function makeQ(
  id: string,
  source: QuestionSource,
  base: number
): CanonicalQuestionWithScore {
  return {
    id,
    subject: "Maths",
    topicKey: "Real Numbers",
    subtopic: "Euclid's Division Lemma",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText: `stub ${id}`,
    _adjustedScore: base,
    _source: source,
  };
}

describe("getAdjustedScore — soft AI-lower ranking", () => {
  it("ranks all authentic above all ai when base scores are equal", () => {
    const BASE = 100;
    const authentic = ["a1", "a2", "a3"].map((id) => makeQ(id, "authentic", BASE));
    const ai = ["x1", "x2", "x3"].map((id) => makeQ(id, "ai-generated", BASE));

    const sorted = [...authentic, ...ai].sort(
      (p, q) => getAdjustedScore(q) - getAdjustedScore(p)
    );

    // The first half must be every authentic id; the back half every ai id.
    const order = sorted.map((q) => q._source);
    expect(order.slice(0, 3)).toEqual(["authentic", "authentic", "authentic"]);
    expect(order.slice(3)).toEqual(["ai-generated", "ai-generated", "ai-generated"]);

    const minAuthentic = Math.min(...authentic.map(getAdjustedScore));
    const maxAi = Math.max(...ai.map(getAdjustedScore));
    expect(minAuthentic).toBeGreaterThan(maxAi);
  });

  it("is soft, not hard: a strong AI question still outranks a weak authentic one", () => {
    const weakAuthentic = makeQ("a-weak", "authentic", 10);
    const strongAi = makeQ("x-strong", "ai-generated", 200);

    // 200 * 0.3 = 60  >  10 * 1.0 = 10  → AI surfaces (not excluded).
    expect(getAdjustedScore(strongAi)).toBeGreaterThan(getAdjustedScore(weakAuthentic));
  });

  it("orders tiers authentic > predicted > ai and never zeroes a tier", () => {
    const BASE = 100;
    const a = getAdjustedScore(makeQ("a", "authentic", BASE));
    const p = getAdjustedScore(makeQ("p", "predicted", BASE));
    const x = getAdjustedScore(makeQ("x", "ai-generated", BASE));

    expect(a).toBeGreaterThan(p);
    expect(p).toBeGreaterThan(x);
    expect(x).toBeGreaterThan(0); // soft demotion — AI is never hard-excluded
  });
});

describe("live pool provenance", () => {
  it("classifies every served question and keeps AI materially below parity", () => {
    const all = PredictionCore.getAllQuestions() as CanonicalQuestionWithScore[];
    expect(all.length).toBeGreaterThan(0);

    const counts: Record<string, number> = {
      authentic: 0,
      "ai-generated": 0,
      predicted: 0,
      unstamped: 0,
    };
    for (const q of all) counts[q._source ?? "unstamped"] += 1;

    // Every question must carry a tier — no silent unstamped items.
    expect(counts.unstamped).toBe(0);

    // AI must form a real-but-minority slice (drift guard: if the pack id list
    // silently drops out, this share collapses toward 0 and fails).
    const aiShare = counts["ai-generated"] / all.length;
    expect(counts["ai-generated"]).toBeGreaterThan(0);
    expect(aiShare).toBeLessThan(0.6);
    expect(counts.authentic).toBeGreaterThan(counts["ai-generated"]);
  });
});
