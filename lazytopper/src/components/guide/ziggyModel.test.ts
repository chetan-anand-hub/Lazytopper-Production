import { describe, it, expect } from "vitest";
import { quickPracticeScorecardVariant, type ScorecardScore } from "../results/scorecardVariants";
import { ziggyReactionFor } from "./ziggyModel";

/** GUIDE-1 §3D — Ziggy's band, from the scorecard's OWN score (built by the real variant builder). */

const noop = () => {};
const qp = (correct: number, answered = 5) =>
  quickPracticeScorecardVariant({
    attempted: answered,
    totalInSet: answered,
    mcqAnswered: answered,
    mcqCorrect: correct,
    allDone: true,
    onFreshSet: noop,
    onChapterTest: noop,
    onPredicted: noop,
    onStudy: noop,
  }).score;

describe("GUIDE-1 · Ziggy's band (real Quick Practice scorecard data)", () => {
  it("full marks → excited", () => {
    const r = ziggyReactionFor(qp(5))!;
    expect(r.band).toBe("full");
    expect(r.pose).toBe("excited");
    expect(r.line).toBe("Full marks! Did you see that?");
  });

  it("≥ 50% → determined, with the scorecard's own numbers", () => {
    const s = qp(3);
    const r = ziggyReactionFor(s)!;
    expect(r.band).toBe("half_plus");
    expect(r.pose).toBe("determined");
    // The numbers are exactly what the score hero shows.
    const shown = s.kind === "marks" ? [s.awarded, s.total] : [s.mcqCorrect, s.mcqAnswered];
    expect(r.line.startsWith(`${shown[0]} out of ${shown[1]}.`)).toBe(true);
    expect(r.line).toContain("to fix. I've got this.");
    expect(r.after).toBeUndefined();
  });

  it("< 50% → sad (melts), then bounces back to determined", () => {
    const r = ziggyReactionFor(qp(1))!;
    expect(r.band).toBe("under_half");
    expect(r.pose).toBe("sad");
    expect(r.line).toBe("Oh no... 1 out of 5.");
    expect(r.after).toEqual({ pose: "determined", line: "Okay. Let's fix them one by one." });
  });

  it("exactly 50% is the ≥ 50% band; half marks print as the scorecard prints them", () => {
    const marks: ScorecardScore = { kind: "marks", awarded: 2.5, total: 5 };
    const r = ziggyReactionFor(marks)!;
    expect(r.band).toBe("half_plus");
    expect(r.line).toBe("2.5 out of 5. 2.5 marks to fix. I've got this.");
    expect(ziggyReactionFor({ kind: "marks", awarded: 7, total: 8 })!.line).toBe("7 out of 8. 1 mark to fix. I've got this.");
  });

  it("an attempts score uses the MCQ counts; a set with no checked MCQ or no total gets NO reaction", () => {
    const a: ScorecardScore = { kind: "attempts", attempted: 5, ofN: 5, mcqAnswered: 4, mcqCorrect: 1 };
    expect(ziggyReactionFor(a)!.line).toBe("Oh no... 1 out of 4.");
    expect(ziggyReactionFor({ kind: "attempts", attempted: 3, ofN: 5, mcqAnswered: 0, mcqCorrect: 0 })).toBeNull();
    expect(ziggyReactionFor({ kind: "marks", awarded: 0, total: 0 })).toBeNull();
    expect(ziggyReactionFor({ kind: "marks", awarded: Number.NaN, total: 10 })).toBeNull();
  });
});
