// src/prediction/historicalAppearanceIndex.canonical.test.ts
//
// Canonicalisation: what `resolveCanonicalSlug` buys, what it costs, and why the
// LIVE frequency signal is not switched to it in this PR.
//
// Everything here is an ASSERTION rather than a comment, because the decision it
// documents is an owner decision and the numbers behind it must stay true.

import { describe, it, expect } from "vitest";
import { highlyProbableQuestions } from "../data/highlyProbableQuestions";
import { getCanonicalHistoricalDataset } from "./historicalDataset";
import {
  getSubtopicAppearance,
  legacyFuzzyMatch,
  canonicalLabelMatch,
  LEGACY_FUZZY_STRATEGY,
  CANONICAL_TOPIC_STRATEGY,
  CANONICAL_STRICT_STRATEGY,
} from "./historicalAppearanceIndex";

describe("resolveCanonicalSlug is load-bearing, not decorative", () => {
  it("★ matches machine topic spellings where the raw fuzzy matcher MISSES", () => {
    // camelCase / concatenated topic keys genuinely reach this code — see the
    // camelCase branch and the compacted TOPIC_KEY_TO_LABEL table in
    // `cbse5SignalScoring.normalizeTopicKey`. The fuzzy matcher collapses
    // "RealNumbers" to the single token "realnumbers", and its word-overlap arm
    // requires >=2 words on BOTH sides, so it cannot match "real numbers".
    const cases: Array<[string, string]> = [
      ["Real Numbers", "RealNumbers"],
      ["Quadratic Equations", "QuadraticEquations"],
      ["Coordinate Geometry", "CoordinateGeometry"],
      ["Life Processes", "LifeProcesses"],
      ["Chemical Reactions & Equations", "ChemicalReactions&Equations"],
      ["Carbon & its Compounds", "Carbon&itsCompounds"],
    ];
    for (const [corpusLabel, machineQuery] of cases) {
      expect(
        legacyFuzzyMatch(corpusLabel, machineQuery),
        `fuzzy unexpectedly matched "${corpusLabel}" ~ "${machineQuery}"`
      ).toBe(false);
      expect(
        canonicalLabelMatch(corpusLabel, machineQuery),
        `canonical failed to match "${corpusLabel}" ~ "${machineQuery}"`
      ).toBe(true);
    }
    // Guard against a vacuous pass.
    expect(cases.length).toBeGreaterThan(0);
  });

  it("★ separates two DISTINCT chapters that the fuzzy matcher conflates", () => {
    // "Circles" and "Areas Related to Circles" are separate CBSE chapters. The
    // fuzzy matcher's substring arm treats them as the same topic, which inflates
    // the topic-appearance term for both. Canonical resolution keeps them apart.
    expect(legacyFuzzyMatch("Circles", "Areas Related to Circles")).toBe(true); // the defect
    expect(canonicalLabelMatch("Circles", "Areas Related to Circles")).toBe(false); // the fix
  });

  it("CONTROL: canonical matching still agrees with fuzzy on plainly identical labels", () => {
    // Without this, the two assertions above could pass simply because canonical
    // matching never matches anything.
    for (const label of ["Real Numbers", "Trigonometry", "Statistics", "Life Processes"]) {
      expect(canonicalLabelMatch(label, label)).toBe(true);
      expect(legacyFuzzyMatch(label, label)).toBe(true);
    }
  });

  it("changes real appearance counts — it is wired into the primitive, not just exported", () => {
    // Proves the strategy actually reaches `getSubtopicAppearance`.
    const fuzzy = getSubtopicAppearance("Maths", "Circles", "Tangent Properties", {
      strategy: LEGACY_FUZZY_STRATEGY,
    });
    const canon = getSubtopicAppearance("Maths", "Circles", "Tangent Properties", {
      strategy: CANONICAL_TOPIC_STRATEGY,
    });
    expect(fuzzy.strategyId).toBe("legacy-fuzzy");
    expect(canon.strategyId).toBe("canonical-topic");
    // The Circles / Areas-Related-to-Circles conflation shows up as a strictly
    // larger topic-appearance pool under fuzzy matching.
    expect(fuzzy.topicMarks.length).toBeGreaterThan(canon.topicMarks.length);
  });
});

describe("why the LIVE signal keeps the legacy matcher — measured, not asserted by opinion", () => {
  // Re-derives the divergence over the REAL live HPQ dataset. If this number
  // ever changes, the owner decision below is being made on stale evidence.
  function divergence(strategy: typeof CANONICAL_TOPIC_STRATEGY): number {
    let moved = 0;
    for (const bucket of highlyProbableQuestions) {
      const subject = (bucket.subject ?? "Maths") as "Maths" | "Science";
      for (const q of bucket.questions) {
        const sub = q.subtopic || q.concept || "general";
        const a = getSubtopicAppearance(subject, bucket.topic, sub, {
          strategy: LEGACY_FUZZY_STRATEGY,
        });
        const b = getSubtopicAppearance(subject, bucket.topic, sub, { strategy });
        if (
          a.yearsWithSubtopic.length !== b.yearsWithSubtopic.length ||
          a.yearsWithTopic.length !== b.yearsWithTopic.length
        ) {
          moved++;
        }
      }
    }
    return moved;
  }

  it("the live HPQ set is 140 questions", () => {
    const total = highlyProbableQuestions.reduce((n, b) => n + b.questions.length, 0);
    expect(total).toBe(140);
  });

  it("★ canonicalising BOTH dimensions moves a large share of the live HPQ set", () => {
    const moved = divergence(CANONICAL_STRICT_STRATEGY);
    // Measured on trunk 6c94d8f0. Asserted as a floor rather than an exact value
    // so corpus growth does not turn this red for the wrong reason — the point is
    // that the number is large, not that it is exactly 52.
    expect(moved).toBeGreaterThanOrEqual(40);
    // ... and it is emphatically not zero, which is what "behaviour-preserving"
    // would have required.
    expect(moved).toBeGreaterThan(0);
  });

  it("canonicalising the TOPIC dimension alone still moves the live set", () => {
    const moved = divergence(CANONICAL_TOPIC_STRATEGY);
    expect(moved).toBeGreaterThan(0);
  });

  it("the corpus carries subtopic labels the canonical authority cannot resolve", () => {
    // The mechanism behind the divergence: `resolveCanonicalSlug` is a CHAPTER
    // authority. Below chapter level it degrades to a slugifier, and slug
    // equality is far stricter than substring matching.
    expect(legacyFuzzyMatch("Nature of Roots (Discriminant)", "Discriminant")).toBe(true);
    expect(canonicalLabelMatch("Nature of Roots (Discriminant)", "Discriminant")).toBe(false);
    // And the corpus really does use such compound subtopic labels.
    const subtopics = new Set(getCanonicalHistoricalDataset().items.map((i) => i.subtopic));
    expect(subtopics.has("Nature of Roots (Discriminant)")).toBe(true);
    expect(subtopics.size).toBeGreaterThan(50);
  });

  it("the DEFAULT strategy is the legacy matcher, so HPQ is unaffected by this module", () => {
    const explicit = getSubtopicAppearance("Maths", "Trigonometry", "Trig Ratios/Values", {
      strategy: LEGACY_FUZZY_STRATEGY,
    });
    const byDefault = getSubtopicAppearance("Maths", "Trigonometry", "Trig Ratios/Values");
    expect(byDefault.strategyId).toBe("legacy-fuzzy");
    expect(byDefault.yearsWithSubtopic).toEqual(explicit.yearsWithSubtopic);
    expect(byDefault.yearsWithTopic).toEqual(explicit.yearsWithTopic);
  });
});
