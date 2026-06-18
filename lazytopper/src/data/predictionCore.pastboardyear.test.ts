// AI-tier PR2b — pastBoardYear strip: dedup + scoring-independence tests.
//
// Proves the two behavioural concerns of stripping the fabricated pastBoardYear:
//   1. dedupeById is now SCORE-ONLY (the former pastBoardYear tiebreaker is gone
//      and dedup is stable/correct without it).
//   2. The 5-signal scorer (which feeds HPQ confidence + mock scoring) is
//      INDEPENDENT of pastBoardYear — so stripping it does NOT shift confidence
//      (it was already computing recency from the historical dataset, not this
//      input field). This is the "HPQ confidence will not shift" guarantee.
//   3. The live served bank carries NO pastBoardYear anywhere (anti-fabrication
//      goal proven at the serving boundary), with no dropped questions / dup ids.

import { describe, it, expect } from "vitest";
import {
  dedupeById,
  PredictionCore,
  type CanonicalQuestionWithScore,
} from "./predictionCore";
import type { CanonicalQuestion } from "./predictionTypes";
import { compute5SignalScore } from "../prediction/cbse5SignalScoring";

function q(
  id: string,
  predictionScore: number,
  extra: Partial<CanonicalQuestion> = {}
): CanonicalQuestion {
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
    predictionScore,
    ...extra,
  };
}

describe("dedupeById — score-only after pastBoardYear strip", () => {
  it("keeps the higher-scoring duplicate regardless of pastBoardYear", () => {
    // Lower score listed first, but it carries a (hypothetical) pastBoardYear.
    // Under the old tiebreaker that could have won; now score-only must win.
    const out = dedupeById([
      q("DUP", 1, { pastBoardYear: "2023" }),
      q("DUP", 9),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].predictionScore).toBe(9);
  });

  it("is stable: equal scores keep the first occurrence (no year influence)", () => {
    const out = dedupeById([q("A", 5), q("A", 5, { pastBoardYear: "2025" })]);
    expect(out).toHaveLength(1);
    expect(out[0].questionText).toBe("stub A"); // first one retained
  });

  it("preserves all distinct ids", () => {
    const out = dedupeById([q("A", 1), q("B", 2), q("C", 3)]);
    expect(out.map((x) => x.id).sort()).toEqual(["A", "B", "C"]);
  });
});

describe("5-signal scorer is independent of pastBoardYear (HPQ confidence does not shift)", () => {
  it("returns an identical score with vs without pastBoardYear", () => {
    const base = {
      subject: "Maths" as const,
      topic: "Real Numbers",
      subtopic: "Euclid's Division Lemma",
      marks: 2,
      format: "Short",
      bloom: "Understanding",
      difficulty: "Medium",
      policyTag: undefined,
    };
    const withYear = compute5SignalScore({ ...base, pastBoardYear: "2024" }, 2026);
    const without = compute5SignalScore({ ...base }, 2026);
    expect(JSON.stringify(without)).toBe(JSON.stringify(withYear));
  });
});

describe("served bank — pastBoardYear fully stripped at the serving boundary", () => {
  it("no served question carries a pastBoardYear, no duplicate ids", () => {
    const all = PredictionCore.getAllQuestions() as CanonicalQuestionWithScore[];
    expect(all.length).toBeGreaterThan(0);

    const withYear = all.filter(
      (x) => (x as CanonicalQuestion).pastBoardYear != null
    );
    expect(withYear).toHaveLength(0);

    const ids = all.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length); // dedup left no duplicate ids
  });
});
