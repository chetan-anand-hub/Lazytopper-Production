import { describe, it, expect } from "vitest";
import {
  buildChapterTestSessionRecord,
  buildFullMockSessionRecord,
  isGradedPaperRecord,
  responseHasGradedWritten,
} from "./sessionRecords";
import type { PersistedWorksheet } from "./worksheetSessionStore";
import type { WorksheetGradeResponse } from "../ai/aiClient";

// RESULT-LIST-HONEST-1 - `writtenGraded` is data (never a status): true when >=1 GRADED non-objective question.
const q = (id: string, section: string) => ({ id, section, topicKey: "quadratic-equations" });
const paper = { worksheetId: "ws-1", title: "T", name: "N", questions: [q("a1", "A"), q("a2", "A"), q("b1", "B"), q("b2", "B")] } as unknown as PersistedWorksheet;
const g = (qNumber: number, total: number, awarded: number, extra: object = {}) => ({ qNumber, couldNotRead: false, ok: true, totalMarks: total, marksAwarded: awarded, percentage: 0, ...extra });
const nr = (qNumber: number, total: number) => ({ qNumber, couldNotRead: true, totalMarks: total });
const resp = (results: object[], gradedCount: number, pendingCount: number) =>
  ({ results, gradedCount, pendingCount, gradedMarksAwarded: 3, gradedMarksTotal: 6 }) as unknown as WorksheetGradeResponse;

const written = resp([g(1, 1, 1), g(2, 1, 0), g(3, 2, 1.5), nr(4, 2)], 3, 1); // sheet graded, Q4 pending
const objOnly = resp([g(1, 1, 1), g(2, 1, 0), nr(3, 2), nr(4, 2)], 2, 2); // objective only

describe("writtenGraded on the CT / FM record", () => {
  it("CT: true when a written question is graded (status stays partial), false for objective-only", () => {
    const a = buildChapterTestSessionRecord({ paper, code: "CT-M-QE-04", subject: "maths", topicKey: "quadratic-equations", response: written, uid: "u" });
    expect(a.status).toBe("partial");
    expect(a.writtenGraded).toBe(true);
    const b = buildChapterTestSessionRecord({ paper, code: "CT-M-QE-05", subject: "maths", topicKey: "quadratic-equations", response: objOnly, uid: "u" });
    expect(b.status).toBe("partial");
    expect(b.writtenGraded).toBe(false);
  });
  it("FM: true / false the same way", () => {
    const a = buildFullMockSessionRecord({ paper, code: "FM-M-01", subject: "maths", response: written, uid: "u" });
    expect(a.status).toBe("partial");
    expect(a.writtenGraded).toBe(true);
    const b = buildFullMockSessionRecord({ paper, code: "FM-M-02", subject: "maths", response: objOnly, uid: "u" });
    expect(b.writtenGraded).toBe(false);
  });
  it("section comes from the paper by qNumber, else the stamped section; unknown counts as written", () => {
    expect(responseHasGradedWritten({ questions: [] } as never, resp([g(1, 1, 1, { section: "A" })], 1, 0))).toBe(false);
    expect(responseHasGradedWritten({ questions: [] } as never, resp([g(1, 2, 1, { section: "C" })], 1, 0))).toBe(true);
  });
  it("isGradedPaperRecord: graded, partial+writtenGraded read as graded; legacy / objective-only partial do not", () => {
    expect(isGradedPaperRecord({ status: "graded" })).toBe(true);
    expect(isGradedPaperRecord({ status: "partial", writtenGraded: true })).toBe(true);
    expect(isGradedPaperRecord({ status: "partial", writtenGraded: false })).toBe(false);
    expect(isGradedPaperRecord({ status: "partial" })).toBe(false);
    expect(isGradedPaperRecord({ status: "pending-upload", writtenGraded: true })).toBe(false);
  });
});
