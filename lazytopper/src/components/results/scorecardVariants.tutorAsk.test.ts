import { describe, it, expect, vi } from "vitest";
import type { WorksheetGradeResponse } from "../../ai/aiClient";
import { checkImproveScorecardVariant } from "./scorecardVariants";

// START-HERE-1 — the Check & Improve scorecard lists "Where marks slipped" rows (a tutor button
// each) for GRADED questions that lost marks, and only when the host supplied a hop.
const q = (qNumber: number, total: number, awarded: number, extra: Record<string, unknown> = {}) =>
  ({ qNumber, couldNotRead: false, ok: true, totalMarks: total, marksAwarded: awarded, percentage: 0, ...extra });
const response = {
  ok: true,
  results: [q(1, 3, 3), q(2, 3, 1), q(3, 2, 0), q(4, 1, 0, { couldNotRead: true, ok: false })],
  totalQuestions: 4, gradedCount: 3, pendingCount: 1, gradedMarksAwarded: 4, gradedMarksTotal: 8, worksheetTotalMarks: 9,
} as unknown as WorksheetGradeResponse;
const base = {
  topicName: "Electricity", code: "CI-S-ELE-01", topicSource: "confirmed" as const, response,
  saved: true, onReadSheet: () => undefined,
};

describe("checkImproveScorecardVariant · tutorAskFor", () => {
  it("★ one row per graded question that lost marks; full-mark and unreadable ones get none", () => {
    const ask = vi.fn((_n: number) => ({ onAsk: () => undefined }));
    const v = checkImproveScorecardVariant({ ...base, tutorAskFor: ask });
    expect(v.wrongAnswers?.map((r) => r.label)).toEqual(["Question 2", "Question 3"]);
    expect(ask.mock.calls.map((c) => c[0])).toEqual([2, 3]);
    expect(v.wrongAnswers?.every((r) => r.yourAnswer === null && r.correctAnswer === null && r.steps.length === 0)).toBe(true);
  });
  it("a question the host has no hop for is left out; no hop at all -> no block", () => {
    const v = checkImproveScorecardVariant({ ...base, tutorAskFor: (n) => (n === 3 ? { onAsk: () => undefined } : null) });
    expect(v.wrongAnswers?.map((r) => r.label)).toEqual(["Question 3"]);
    expect(checkImproveScorecardVariant({ ...base, tutorAskFor: () => null }).wrongAnswers).toBeNull();
  });
  it("★ CONTROL: with no tutorAskFor the variant has no wrongAnswers (byte-identical to before)", () => {
    expect(checkImproveScorecardVariant(base).wrongAnswers ?? null).toBeNull();
  });
});
