import { describe, it, expect } from "vitest";
import type { WorksheetGradeResponse } from "../../ai/aiClient";
import { withPaperTutorAsks, type ScorecardVariant, type ScorecardTutorAsk } from "./scorecardVariants";

// FOLLOWUPS-1 B — the CT/FM decorator: a button only on a GRADED question that lost marks and has
// a hop; nothing else in the variant changes; no hop source -> the SAME object back.
const g = (qNumber: number, totalMarks: number, marksAwarded: number, extra: object = {}) => ({
  qNumber, couldNotRead: false, ok: true, totalMarks, marksAwarded, percentage: 0, ...extra,
});
const response = {
  results: [g(1, 1, 1), g(2, 3, 1), g(3, 2, 0, { couldNotRead: true }), g(4, 2, 0)],
} as unknown as WorksheetGradeResponse;
const base: ScorecardVariant = {
  surface: "chapter-test",
  title: "T",
  subtitle: "S",
  score: { kind: "marks", awarded: 1, total: 8 },
  actions: [],
};
const ask: ScorecardTutorAsk = { onAsk: () => undefined };

describe("withPaperTutorAsks", () => {
  it("★★ reopened (no sheet): 'Where marks slipped' rows for the graded lost-marks questions only", () => {
    const v = withPaperTutorAsks(base, response, () => ask);
    expect(v.wrongAnswers?.map((r) => r.label)).toEqual(["Question 2", "Question 4"]); // Q1 full, Q3 unread
    expect(v.wrongAnswers?.every((r) => r.tutorAsk === ask && r.yourAnswer === null && r.steps.length === 0)).toBe(true);
    expect({ ...v, wrongAnswers: undefined }).toEqual({ ...base, wrongAnswers: undefined });
  });

  it("★★ live (graded sheet): the button attaches to the matching sheet answer that lost marks, nothing else changes", () => {
    const sheet = { ...base, gradedAnswers: [1, 2, 3, 4].map((n) => ({ label: `Question ${n}`, awarded: 0, available: 1 })) };
    const v = withPaperTutorAsks(sheet, response, (n) => (n === 2 ? ask : null));
    expect(v.gradedAnswers?.map((a) => Boolean(a.tutorAsk))).toEqual([false, true, false, false]);
    expect(v.wrongAnswers).toBeUndefined();
  });

  it("★ no hop for any question / no tutorAskFor / no response -> the SAME variant object (byte-identical)", () => {
    expect(withPaperTutorAsks(base, response, () => null)).toBe(base);
    expect(withPaperTutorAsks(base, response, undefined)).toBe(base);
    expect(withPaperTutorAsks(base, null, () => ask)).toBe(base);
  });
});
