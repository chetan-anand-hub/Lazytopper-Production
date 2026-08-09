// src/prediction/cbse5SignalScoring.hpqPin.test.ts
//
// ⚠⚠ THE PIN. `computeHistoricalFrequencySignal` ranks Highly Probable Questions
// for live students. This suite freezes its output — and the composite score
// built on it — across the ENTIRE real HPQ dataset, so that any refactor which
// moves a student's ranking by even one place turns red instead of shipping.
//
// The snapshot below was captured from trunk `6c94d8f0` BEFORE the appearance
// primitive was extracted, and re-verified byte-identical after.
//
// ⚠ IF THIS SUITE GOES RED, DO NOT REGENERATE THE SNAPSHOT. A moved ranking is
// the finding. Report it.

import { describe, it, expect } from "vitest";
import { highlyProbableQuestions } from "../data/highlyProbableQuestions";
import { compute5SignalScore } from "./cbse5SignalScoring";

// Fixed, not `new Date().getFullYear()` — a pin that drifts with the wall clock
// is not a pin.
const TARGET_YEAR = 2026;

function currentRanking(): string[] {
  const rows: string[] = [];
  for (const bucket of highlyProbableQuestions) {
    const subject = (bucket.subject ?? "Maths") as "Maths" | "Science";
    for (const q of bucket.questions) {
      const r = compute5SignalScore(
        {
          subject,
          topic: bucket.topic,
          subtopic: q.subtopic || q.concept || "general",
          marks: q.marks ?? 1,
          format: q.type || "Short",
          bloom: "Understanding",
          difficulty: q.difficulty || "Medium",
          policyTag: q.tier,
        },
        TARGET_YEAR
      );
      rows.push(
        `${q.id}|${r.signals.historicalFrequency.toFixed(10)}|${r.compositeScore.toFixed(10)}`
      );
    }
  }
  rows.sort();
  return rows;
}

const FROZEN_HPQ_RANKING: string[] = [
  "2026-MNM-01b|0.3222222222|0.4741666667",
  "2026-MNM-02|0.3222222222|0.4741666667",
  "2026-MNM-03|0.9111111111|0.6858333333",
  "2026-MNM-04|0.3222222222|0.4841666667",
  "2026-MNM-05|0.9111111111|0.6683333333",
  "ap-comp-01|0.8555555556|0.8691666667",
  "ap-comp-02|0.5888888889|0.5966666667",
  "ap-comp-03|0.8555555556|0.8666666667",
  "arc-comp-01|0.9111111111|0.6858333333",
  "cg-comp-01|0.9111111111|0.8858333333",
  "cg-comp-02|0.8555555556|0.6766666667",
  "cg-comp-03|0.8555555556|0.6666666667",
  "circ-comp-01|0.7000000000|0.6225000000",
  "circ-comp-02|0.7000000000|0.6200000000",
  "le-comp-01|0.3222222222|0.5216666667",
  "le-comp-02|0.3222222222|0.5041666667",
  "lp-hpq-101|0.3222222222|0.4816666667",
  "lp-hpq-102|0.3222222222|0.4916666667",
  "lp-hpq-103|0.3222222222|0.5216666667",
  "lp-hpq-104|0.9111111111|0.6633333333",
  "lp-hpq-105|0.3222222222|0.5291666667",
  "math-ap-hpq-1|0.3222222222|0.4816666667",
  "math-ap-hpq-2|0.8555555556|0.6216666667",
  "math-ap-hpq-3|0.8555555556|0.8366666667",
  "math-real-hpq-3|0.9111111111|0.8533333333",
  "math-tri-hpq-1|0.9111111111|0.6283333333",
  "math-tri-hpq-2|0.9111111111|0.8633333333",
  "math-tri-hpq-3|0.5888888889|0.5616666667",
  "mnm-hpq-101|0.9111111111|0.7533333333",
  "mnm-hpq-102|0.9111111111|0.6383333333",
  "mnm-hpq-103|0.3222222222|0.5216666667",
  "mnm-hpq-104|0.3222222222|0.4916666667",
  "mnm-hpq-105|0.3222222222|0.5291666667",
  "ple-hpq-101|0.3222222222|0.4816666667",
  "ple-hpq-102|0.9111111111|0.6633333333",
  "ple-hpq-103|0.3222222222|0.5216666667",
  "ple-hpq-104|0.9111111111|0.6633333333",
  "ple-hpq-105|0.9111111111|0.7008333333",
  "ple-hpq-1|0.9111111111|0.7633333333",
  "poly-comp-01|0.9111111111|0.6858333333",
  "poly-comp-02|0.8000000000|0.6600000000",
  "poly-hpq-1|0.8000000000|0.6125000000",
  "poly-hpq-2|0.9111111111|0.6558333333",
  "prob-comp-01|0.3222222222|0.5291666667",
  "prob-comp-02|0.3222222222|0.5116666667",
  "prob-hpq-101|0.9111111111|0.9533333333",
  "prob-hpq-102|0.9111111111|0.8633333333",
  "prob-hpq-103|0.3222222222|0.5216666667",
  "prob-hpq-104|0.3222222222|0.4916666667",
  "prob-hpq-105|0.3222222222|0.5291666667",
  "qe-comp-01|0.9111111111|0.9008333333",
  "qe-hpq-101|0.9111111111|0.9533333333",
  "qe-hpq-102|0.9111111111|0.6583333333",
  "qe-hpq-103|0.9111111111|0.8933333333",
  "qe-hpq-104|0.8555555556|0.6466666667",
  "qe-hpq-105|0.8555555556|0.6841666667",
  "qe-hpq-1|0.9111111111|0.6583333333",
  "rn-comp-01|0.9111111111|0.9008333333",
  "rn-comp-02|0.3222222222|0.5116666667",
  "rn-hpq-2|0.9111111111|0.8633333333",
  "rn-hpq-3|0.3222222222|0.4916666667",
  "rn-hpq-4|0.3222222222|0.4916666667",
  "rn-hpq-5|0.3222222222|0.5291666667",
  "sav-comp-01|0.8555555556|0.6766666667",
  "sav-comp-02|0.9111111111|0.8858333333",
  "sav-comp-03|0.3222222222|0.5291666667",
  "sci-abs-comp-01|0.9111111111|0.9008333333",
  "sci-abs-comp-02|0.3222222222|0.5291666667",
  "sci-abs-hpq-1|0.9111111111|0.9458333333",
  "sci-abs-hpq-2|0.3222222222|0.4841666667",
  "sci-abs-hpq-3|0.3222222222|0.5216666667",
  "sci-carbon-comp-02|0.9111111111|0.6933333333",
  "sci-cc-bio-comp-01|0.9111111111|0.6933333333",
  "sci-cc-bio-comp-02|0.9111111111|0.6858333333",
  "sci-cc-comp-01|0.9111111111|0.6933333333",
  "sci-cc-comp-02|0.3222222222|0.5216666667",
  "sci-cc-hpq-1|0.9111111111|0.7533333333",
  "sci-cc-hpq-2|0.3222222222|0.4916666667",
  "sci-cc-hpq-3|0.3222222222|0.4816666667",
  "sci-chem-comp-02|0.9111111111|0.8833333333",
  "sci-cic-hpq-1|0.3222222222|0.4816666667",
  "sci-cic-hpq-2|0.9111111111|0.6633333333",
  "sci-cic-hpq-3|0.9111111111|0.6633333333",
  "sci-cic-hpq-4|0.3222222222|0.5291666667",
  "sci-cre-comp-01|0.9111111111|0.9008333333",
  "sci-cre-hpq-1|0.9111111111|0.9533333333",
  "sci-cre-hpq-2|0.9111111111|0.8633333333",
  "sci-cre-hpq-3|0.3222222222|0.5291666667",
  "sci-elec-comp-01|0.9111111111|0.9008333333",
  "sci-elec-comp-02|0.3222222222|0.5291666667",
  "sci-elec-hpq-1|0.3222222222|0.4816666667",
  "sci-elec-hpq-2|0.3222222222|0.4916666667",
  "sci-elec-hpq-3|0.3222222222|0.4916666667",
  "sci-elec-hpq-4|0.9111111111|0.7008333333",
  "sci-env-comp-01|0.3222222222|0.5141666667",
  "sci-eye-comp-01|0.9111111111|0.6933333333",
  "sci-eye-hpq-1|0.3222222222|0.4741666667",
  "sci-eye-hpq-2|0.3222222222|0.4841666667",
  "sci-eye-hpq-3|0.3222222222|0.5216666667",
  "sci-hdor-hpq-1|0.9111111111|0.7458333333",
  "sci-hdor-hpq-2|0.3222222222|0.4841666667",
  "sci-he-comp-01|0.9111111111|0.8933333333",
  "sci-he-hpq-1|0.9111111111|0.8458333333",
  "sci-he-hpq-2|0.3222222222|0.4841666667",
  "sci-hered-comp-02|0.3222222222|0.5191666667",
  "sci-light-hpq-1|0.9111111111|0.9533333333",
  "sci-light-hpq-2|0.9111111111|0.8633333333",
  "sci-light-hpq-3|0.3222222222|0.4916666667",
  "sci-lp-comp-02|0.9111111111|0.8933333333",
  "sci-lp-comp-03|0.3222222222|0.5291666667",
  "sci-lp-hpq-1|0.9111111111|0.9533333333",
  "sci-lp-hpq-2|0.9111111111|0.8633333333",
  "sci-lp-hpq-3|0.3222222222|0.4916666667",
  "sci-lrr-comp-01|0.9111111111|0.9008333333",
  "sci-lrr-comp-02|0.9111111111|0.6883333333",
  "sci-lrr-comp-03|0.9111111111|0.8933333333",
  "sci-mec-hpq-1|0.9111111111|0.7458333333",
  "sci-mec-hpq-2|0.3222222222|0.4841666667",
  "sci-metals-comp-02|0.9111111111|0.6933333333",
  "sci-mnm-comp-01|0.9111111111|0.6933333333",
  "sci-repr-comp-01|0.9111111111|0.9008333333",
  "stat-hpq-101|0.7555555556|0.6116666667",
  "stat-hpq-102|0.9111111111|0.8633333333",
  "stat-hpq-103|0.9111111111|0.8933333333",
  "stat-hpq-104|0.7555555556|0.6216666667",
  "stat-hpq-105|0.8555555556|0.6841666667",
  "stats-comp-01|0.3222222222|0.5291666667",
  "tri-comp-01|0.5888888889|0.6091666667",
  "tri-comp-02|0.5888888889|0.5916666667",
  "tri-hpq-101|0.9111111111|0.6283333333",
  "tri-hpq-102|0.9111111111|0.8633333333",
  "tri-hpq-105|0.9111111111|0.6758333333",
  "trig-comp-01|0.3222222222|0.5291666667",
  "trig-comp-02|0.3222222222|0.5116666667",
  "trig-hpq-101|0.9111111111|0.7533333333",
  "trig-hpq-102|0.9111111111|0.8633333333",
  "trig-hpq-103|0.3222222222|0.5216666667",
  "trig-hpq-104|0.3222222222|0.4916666667",
  "trig-hpq-105|0.3222222222|0.5291666667",
  "trig-hpq-1|0.9111111111|0.6458333333",
];

describe("HPQ ranking pin", () => {
  it("scores every HPQ question exactly as trunk 6c94d8f0 did", () => {
    expect(currentRanking()).toEqual(FROZEN_HPQ_RANKING);
  });

  it("pins the SIZE of the dataset too, so a dropped question cannot pass silently", () => {
    // A snapshot compared with toEqual already catches a drop, but only if the
    // snapshot itself is non-trivial. Assert the corpus is actually populated —
    // an empty ranking compared against an empty frozen list is a green test
    // that asserts nothing.
    expect(FROZEN_HPQ_RANKING.length).toBe(140);
    expect(currentRanking().length).toBe(140);
  });

  it("CONTROL: the frozen snapshot is discriminating, not uniform", () => {
    // If every row carried the same score the pin would pass under almost any
    // mutation. Prove the pinned values actually vary.
    const histValues = new Set(FROZEN_HPQ_RANKING.map((r) => r.split("|")[1]));
    const compValues = new Set(FROZEN_HPQ_RANKING.map((r) => r.split("|")[2]));
    expect(histValues.size).toBeGreaterThan(1);
    expect(compValues.size).toBeGreaterThan(10);
  });

  it("CONTROL: a deliberately altered row does NOT match the pin", () => {
    // Proves `toEqual` on this shape can actually fail — a pin nobody has seen
    // fail is indistinguishable from a pin that cannot fail.
    const tampered = [...FROZEN_HPQ_RANKING];
    tampered[0] = tampered[0].replace(/\|[\d.]+$/, "|9.9999999999");
    expect(tampered).not.toEqual(FROZEN_HPQ_RANKING);
  });
});
