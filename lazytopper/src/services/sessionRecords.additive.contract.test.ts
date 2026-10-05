// @vitest-environment jsdom
/**
 * sessionRecords — ADDITIVE CONTRACT (SCORECARD-MI-1 PR-2, H5/H10). THE REPLACEMENT PROTECTION
 * for the narrowed ("import-only" → "additive-only") entry on `sessionRecords.ts` in BOTH overlay
 * gates (`check_improve_overlay_additive_acceptance.mjs`, `quick_practice_overlay_additive_acceptance.mjs`;
 * owner ruling 2026-10-05: "marks not counts", "taxonomy and wording").
 *
 * The entry protected "the SessionRecord shape / read". The gates now let the file change ONLY
 * additively (every existing member byte-identical, new members optional, the read predicate
 * unchanged); this file pins what the additions DO:
 *   - OLD RECORDS READ UNCHANGED: a pre-PR-2 record comes back from the store exactly as written,
 *     and every new reader falls back to its old fields (`sessionRecordSubjects` → its subject);
 *   - H10 marks: written ONLY from a v2 response, VERSIONED; a count-only response gets none;
 *   - H10 four-type: a question that was NOT graded, or whose every lost mark was NOT ATTEMPTED,
 *     adds no type — the same rule as the MI front door;
 *   - H5: a Check & Improve paper records each question's own subject and chapter, so a mixed
 *     Maths + Science paper is listed under both subjects.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./firebaseClient", () => ({ firestoreDb: null }));
vi.mock("./studentProgressStore", () => ({ getActiveProgressUser: () => "u1" }));

import {
  buildCheckImproveSessionRecord,
  loadLocalSessionRecords,
  recordFourTypeAndMarks,
  sessionRecordSubjects,
  type SessionRecord,
} from "./sessionRecords";
import type { WorksheetGradeResponse } from "../ai/aiClient";

type Q = WorksheetGradeResponse["results"][number];
const m = (x: Record<string, number>) => ({ conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0, ...x });
const q = (n: number, total: number, awarded: number, extra: Record<string, unknown> = {}): Q =>
  ({ qNumber: n, couldNotRead: false, ok: true, totalMarks: total, marksAwarded: awarded, percentage: 0, annotatedSteps: [], ...extra }) as unknown as Q;
const paper = (results: Q[], graded: { awarded: number; total: number; count: number; pending: number }): WorksheetGradeResponse =>
  ({
    ok: true, results, totalQuestions: results.length, gradedCount: graded.count, pendingCount: graded.pending,
    gradedMarksAwarded: graded.awarded, gradedMarksTotal: graded.total, worksheetTotalMarks: results.reduce((s, r) => s + r.totalMarks, 0),
  }) as WorksheetGradeResponse;

const OLD_RECORD: SessionRecord = {
  id: "CI-M-REAL-01", worksheetId: "ci:CI-M-REAL-01", surface: "check-improve", title: "Real Numbers · Paper #1",
  subject: "maths", topicKeys: ["real-numbers"], questionIds: [], marksAwarded: 4, marksTotal: 6, status: "graded",
  fourType: { conceptual: 1, calculation: 1, silly: 0, presentation: 0 }, sectionBreakdown: null, gradedAt: 1_700_000_000_000,
  perQuestionRef: "ci:CI-M-REAL-01", dedupKey: "u1::CI-M-REAL-01", topicSource: "confirmed",
};

beforeEach(() => localStorage.clear());

describe("OLD RECORDS READ UNCHANGED", () => {
  it("★ a pre-PR-2 record comes back from the store exactly as written (no field added, none converted)", () => {
    localStorage.setItem("lazytopper.user.u1.sessionRecords.v1", JSON.stringify([OLD_RECORD]));
    expect(loadLocalSessionRecords("u1")).toEqual([OLD_RECORD]);
  });
  it("its subjects are its one subject — exactly as before", () => {
    expect(sessionRecordSubjects(OLD_RECORD)).toEqual(["maths"]);
  });
});

describe("H10 — marks are recorded ONLY from a v2 response, versioned", () => {
  it("★ a v2 paper records marksLostByType + version 1, summing to what the graded questions lost", () => {
    const { marks } = recordFourTypeAndMarks([q(1, 3, 2, { marksLostByType: m({ silly: 1 }) }), q(2, 2, 0, { marksLostByType: m({ unattempted: 2 }) })]);
    expect(marks.marksLostByTypeVersion).toBe(1);
    expect(marks.marksLostByType).toEqual(m({ silly: 1, unattempted: 2 }));
  });
  it("CONTROL — a count-only (v1) paper records NO marks (never converted, never invented)", () => {
    const rec = buildCheckImproveSessionRecord({
      code: "CI-M-REAL-02", title: "T", subject: "maths", topicSlug: "real-numbers", topicSource: "confirmed", uid: "u1",
      response: paper([q(1, 3, 2, { mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 } })], { awarded: 2, total: 3, count: 1, pending: 0 }),
    });
    expect("marksLostByType" in rec).toBe(false);
    expect("marksLostByTypeVersion" in rec).toBe(false);
    expect(rec.fourType).toEqual({ conceptual: 1, calculation: 0, silly: 0, presentation: 0 });
  });
});

describe("H10 — the four-type skips every question that was not graded or not attempted", () => {
  it("★ answerMismatch / couldNotRead / wholly not attempted add NO type; a graded loss does", () => {
    const { fourType } = recordFourTypeAndMarks([
      q(1, 3, 0, { answerMismatch: true, mistakeSummary: { conceptual: 2, calculation: 0, silly: 0, presentation: 0 } }),
      q(2, 3, 0, { couldNotRead: true, mistakeSummary: { conceptual: 0, calculation: 2, silly: 0, presentation: 0 } }),
      q(3, 2, 0, { annotatedSteps: [{ status: "missing", mistakeType: "presentation" }], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 1 } }),
      q(4, 3, 2, { mistakeSummary: { conceptual: 0, calculation: 0, silly: 1, presentation: 0 } }),
    ]);
    expect(fourType).toEqual({ conceptual: 0, calculation: 0, silly: 1, presentation: 0 });
  });
});

describe("H5 — each C&I question's own subject and chapter (a mixed paper under both subjects)", () => {
  it("★ a Maths + Science paper is listed under both subjects", () => {
    const rec = buildCheckImproveSessionRecord({
      code: "CI-M-MIX-01", title: "Maths + Science", subject: "maths", topicSlug: "", topicSource: "mixed", uid: "u1",
      response: paper(
        [q(1, 3, 3, { topicSubject: "Maths", topicSlug: "real-numbers" }), q(2, 2, 2, { topicSubject: "Science", topicSlug: "electricity" })],
        { awarded: 5, total: 5, count: 2, pending: 0 },
      ),
    });
    expect(rec.questionTopics?.map((t) => t.subject)).toEqual(["maths", "science"]);
    expect(sessionRecordSubjects(rec).sort()).toEqual(["maths", "science"]);
  });
  it("CONTROL — a single-question paper with no per-question read adds no breakdown (falls back)", () => {
    const rec = buildCheckImproveSessionRecord({
      code: "CI-M-REAL-03", title: "T", subject: "science", topicSlug: "electricity", topicSource: "confirmed", uid: "u1",
      response: paper([q(1, 3, 3)], { awarded: 3, total: 3, count: 1, pending: 0 }),
    });
    expect("questionTopics" in rec).toBe(false);
    expect(sessionRecordSubjects(rec)).toEqual(["science"]);
  });
});
