// @vitest-environment jsdom
//
// RESULT-LIST-BACKFILL-1 - Home's "Waiting for your answers" list for a Chapter Test written BEFORE #1802
// (no `writtenGraded`) whose written sheet WAS graded: its own stored payload proves it, so it is not
// listed as waiting. Uses only the existing public reader (readPendingPapersLocal) and the device mirror.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));

import { readPendingPapersLocal } from "./pendingPapers";

const UID = "student-legacy";

const record = (id: string, ws: string) => ({
  id,
  worksheetId: ws,
  surface: "chapter-test",
  title: `Light · ${id}`,
  subject: "science",
  topicKeys: ["light-reflection-refraction"],
  questionIds: ["q1", "q2"],
  marksAwarded: 3,
  marksTotal: 4,
  status: "partial",
  fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  sectionBreakdown: null,
  gradedAt: Date.UTC(2026, 10, 15),
  perQuestionRef: `ct:${id}`,
  dedupKey: `${UID}::${id}`,
});
// Q1 = Section A scored on submit (the objective scorer's shape); Q2 = written.
const objectiveRow = { qNumber: 1, couldNotRead: false, ok: true, totalMarks: 1, marksAwarded: 1, percentage: 100, annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "" };
const gradedWritten = { qNumber: 2, couldNotRead: false, ok: true, totalMarks: 3, marksAwarded: 2, percentage: 67, annotatedSteps: [{ description: "Mirror formula", status: "correct", marksAwarded: 1 }], teacherNote: "Unit missing." };
const pendingWritten = { qNumber: 2, couldNotRead: true, totalMarks: 3, note: "Written answer not uploaded yet." };
const payload = (id: string, ws: string, rows: object[]) => ({
  ref: `ct:${id}`,
  code: id,
  worksheetId: ws,
  surface: "chapter-test",
  gradedAt: Date.UTC(2026, 10, 15),
  response: { ok: true, results: rows, totalQuestions: 2, gradedCount: rows.filter((r) => !(r as { couldNotRead?: boolean }).couldNotRead).length, pendingCount: 0, gradedMarksAwarded: 3, gradedMarksTotal: 4, worksheetTotalMarks: 4 },
});

beforeEach(() => {
  window.localStorage.clear();
});

describe("Home waiting list - pre-#1802 Chapter Test records", () => {
  it("a partial whose stored payload shows a graded written answer is NOT waiting; one with only the objective section still is", () => {
    window.localStorage.setItem(
      `lazytopper.user.${UID}.sessionRecords.v1`,
      JSON.stringify([record("CT-S-LIGH-01", "ws-a"), record("CT-S-LIGH-02", "ws-b")]),
    );
    window.localStorage.setItem(
      `lazytopper.user.${UID}.sessionPerQuestion.v1`,
      JSON.stringify({
        "ct:CT-S-LIGH-01": payload("CT-S-LIGH-01", "ws-a", [objectiveRow, gradedWritten]),
        "ct:CT-S-LIGH-02": payload("CT-S-LIGH-02", "ws-b", [objectiveRow, pendingWritten]),
      }),
    );
    expect(readPendingPapersLocal(UID).map((p) => p.code)).toEqual(["CT-S-LIGH-02"]);
  });
  it("a payload belonging to another paper proves nothing", () => {
    window.localStorage.setItem(`lazytopper.user.${UID}.sessionRecords.v1`, JSON.stringify([record("CT-S-LIGH-01", "ws-a")]));
    window.localStorage.setItem(
      `lazytopper.user.${UID}.sessionPerQuestion.v1`,
      JSON.stringify({ "ct:CT-S-LIGH-01": payload("CT-S-LIGH-01", "ws-OTHER", [objectiveRow, gradedWritten]) }),
    );
    expect(readPendingPapersLocal(UID).map((p) => p.code)).toEqual(["CT-S-LIGH-01"]);
  });
});
