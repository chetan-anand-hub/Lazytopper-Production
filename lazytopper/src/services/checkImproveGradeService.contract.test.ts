// @vitest-environment node
/**
 * checkImproveGradeService — CONTRACT (SCORECARD-MI-1 PR-2, H4/H9). THE REPLACEMENT PROTECTION
 * for the lifted blanket bans on `checkImproveGradeService.ts` in
 * `check_improve_convergence_acceptance.mjs` AND `check_improve_overlay_additive_acceptance.mjs`
 * (owner ruling 2026-10-05: "taxonomy and wording", "marks not counts").
 *
 * What the bans were buying, and what this file now pins on the file's NEW behaviour:
 *   - ONE persist = ONE record + ONE per-question payload (the double-write hazard), and nothing
 *     graded → no record (the honest gate);
 *   - the single-question ADAPTER carries what the grade says, through ONE path (the caller-side
 *     echo patches are retired): GA-38's `objective` flag, the GRADER-CORE-1 v2 fields, and an
 *     honest "nothing graded, one pending" paper for an answer that was NOT graded — never a
 *     graded 0 — so the stored record, the scorecard and the tutor's in-hand response agree;
 *   - a legacy (v1) grade's adapted shape is unchanged: no v2 key is added, nothing invented.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const writeSessionRecord = vi.fn();
const writeSessionPerQuestion = vi.fn();
vi.mock("./sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./sessionRecords")>();
  return {
    ...actual,
    writeSessionRecord: (...a: unknown[]) => writeSessionRecord(...a),
    writeSessionPerQuestion: (...a: unknown[]) => writeSessionPerQuestion(...a),
  };
});
vi.mock("./firebaseClient", () => ({ firestoreDb: null }));
vi.mock("./studentProgressStore", () => ({ getActiveProgressUser: () => null }));

import { persistCheckImproveSession, singleCheckToWorksheetResponse } from "./checkImproveGradeService";
import { ANSWER_MISMATCH_COPY, gradeStateCopy } from "../lib/mistakeDisplay";
import type { CheckSolutionResponse } from "../ai/aiClient";

const USER = { uid: "u1", isLocalSession: false } as never;
const grade = (over: Record<string, unknown> = {}): CheckSolutionResponse =>
  ({
    ok: true,
    totalMarks: 3,
    marksAwarded: 2,
    percentage: 67,
    annotatedSteps: [],
    mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: "Good working.",
    ...over,
  }) as unknown as CheckSolutionResponse;
const V2_MARKS = { conceptual: 1, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0 };

beforeEach(() => {
  writeSessionRecord.mockClear();
  writeSessionPerQuestion.mockClear();
});

describe("H4/H9 — the adapter carries the grade's own fields (one path)", () => {
  it("★ GA-38 — objective:true survives into the adapted response", () => {
    expect(singleCheckToWorksheetResponse(grade({ objective: true })).results[0].objective).toBe(true);
  });

  it("★ the v2 fields are carried: marksLostByType, rubric, answerMismatch:false, objectiveResolved", () => {
    const rubric = [{ point: "Method", marks: 2 }];
    const r = singleCheckToWorksheetResponse(
      grade({ marksLostByType: V2_MARKS, rubric, answerMismatch: false, objectiveResolved: null }),
    ).results[0] as unknown as Record<string, unknown>;
    expect(r.marksLostByType).toEqual(V2_MARKS);
    expect(r.rubric).toEqual(rubric);
    expect(r.answerMismatch).toBe(false);
    expect(r.objectiveResolved).toBeNull();
  });

  it("★ an answer that was NOT graded makes the paper say so — nothing graded, one pending, never a graded 0", () => {
    const resp = singleCheckToWorksheetResponse(grade({ answerMismatch: true, marksAwarded: 0, marksLostByType: { ...V2_MARKS, conceptual: 0 } }));
    expect(resp.gradedCount).toBe(0);
    expect(resp.pendingCount).toBe(1);
    expect(resp.gradedMarksAwarded).toBe(0);
    expect(resp.gradedMarksTotal).toBe(0);
    expect(resp.worksheetTotalMarks).toBe(3);
    expect(gradeStateCopy(resp.results[0])).toBe(ANSWER_MISMATCH_COPY);
  });

  it("CONTROL — a legacy (v1) grade adapts exactly as before: no v2 key, no objective, one graded", () => {
    const resp = singleCheckToWorksheetResponse(grade());
    const keys = Object.keys(resp.results[0]).sort();
    expect(keys).toEqual(
      ["annotatedSteps", "couldNotRead", "marksAwarded", "mistakeSummary", "ok", "percentage", "qNumber", "teacherNote", "totalMarks"].sort(),
    );
    expect(resp.gradedCount).toBe(1);
    expect(resp.gradedMarksAwarded).toBe(2);
  });
});

describe("the persist seam — ONE record + ONE payload, and the honest gate", () => {
  it("★ one graded persist writes exactly ONE record and ONE payload (the double-write hazard)", () => {
    const out = persistCheckImproveSession({
      user: USER, code: "CI-M-REAL-01", title: "T", subject: "maths", topicSlug: "real-numbers",
      topicSource: "confirmed", response: singleCheckToWorksheetResponse(grade({ marksLostByType: V2_MARKS })),
    });
    expect(out).toBe("recorded");
    expect(writeSessionRecord).toHaveBeenCalledTimes(1);
    expect(writeSessionPerQuestion).toHaveBeenCalledTimes(1);
  });

  it("CONTROL — an answer that was not graded writes NOTHING (no grade → no history entry)", () => {
    const out = persistCheckImproveSession({
      user: USER, code: "CI-M-REAL-02", title: "T", subject: "maths", topicSlug: "real-numbers",
      topicSource: "confirmed", response: singleCheckToWorksheetResponse(grade({ couldNotRead: true, marksAwarded: 0 })),
    });
    expect(out).toBe("skipped-nothing-graded");
    expect(writeSessionRecord).not.toHaveBeenCalled();
    expect(writeSessionPerQuestion).not.toHaveBeenCalled();
  });
});
