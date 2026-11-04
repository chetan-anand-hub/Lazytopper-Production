/**
 * GRADE-MARKS-1 — the paper summary is built from the FINAL (clamped) marks: a model sentence that
 * states a score is replaced; prose without a number is kept word for word.
 */
import { describe, it, expect } from "vitest";
import { claimsAScore, finalMarksSummary } from "./finalMarksSummary";

const row = (marksAwarded: number, totalMarks: number, objective = false) => ({ marksAwarded, totalMarks, objective, couldNotRead: false });
// 13 objective 1-mark questions, 7 right after the clamp; plus two written questions (3 + 5 marks).
const OBJ = [...Array.from({ length: 7 }, () => row(1, 1, true)), ...Array.from({ length: 6 }, () => row(0, 1, true))];
const RESULTS = [...OBJ, row(2, 3), row(4, 5)];

describe("finalMarksSummary", () => {
  it("★ live 4 Nov: model says '4 out of 7' on the objective questions, clamped marks are 7/13 → 7 out of 13 is rendered", () => {
    const out = finalMarksSummary({
      summary: "You scored 4 out of 7 marks on these objective questions. Write the formula before substituting values.",
      results: RESULTS,
      gradedMarksAwarded: 13,
      gradedMarksTotal: 21,
    });
    expect(out).toContain("On the objective questions: 7 out of 13 marks.");
    expect(out).toContain("You scored 13 out of 21 marks on the questions we graded.");
    expect(out).not.toMatch(/4 out of 7/);
    expect(out).toContain("Write the formula before substituting values.");
  });

  it("a summary with no score claim is returned exactly as written", () => {
    const s = "Good attempt. Show every step and box your final answer.";
    expect(finalMarksSummary({ summary: s, results: RESULTS, gradedMarksAwarded: 13, gradedMarksTotal: 21 })).toBe(s);
  });

  it("half marks and a paper with no objective question", () => {
    const out = finalMarksSummary({ summary: "You got 3 marks.", results: [row(2.5, 3)], gradedMarksAwarded: 2.5, gradedMarksTotal: 3 });
    expect(out).toBe("You scored 2.5 out of 3 marks on the questions we graded.");
  });

  it("an ungraded objective question is not counted in the objective line", () => {
    const out = finalMarksSummary({
      summary: "You answered all the MCQs correctly.",
      results: [row(1, 1, true), { ...row(0, 1, true), couldNotRead: true }],
      gradedMarksAwarded: 1,
      gradedMarksTotal: 1,
    });
    expect(out).toContain("On the objective questions: 1 out of 1 mark.");
  });

  it("claimsAScore: numbers with a score cue, not formula tips or plain prose", () => {
    expect(claimsAScore("You scored 4 out of 7 marks.")).toBe(true);
    expect(claimsAScore("Two of your answers were wrong.")).toBe(true);
    expect(claimsAScore("That is 60% of the paper.")).toBe(true);
    expect(claimsAScore("Remember that the HCF of two co-primes is 1.")).toBe(false);
    expect(claimsAScore("Write units with every answer.")).toBe(false);
  });
});
