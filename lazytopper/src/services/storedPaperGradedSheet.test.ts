// TUTOR-RETURN-SHEET-1 - the restored CT/FM sheet's header total is the scorecard's, not the graded rows' sum.
import { describe, it, expect, vi, beforeEach } from "vitest";

const exp = vi.hoisted(() => ({ run: vi.fn(async () => "x.pdf") }));
vi.mock("../components/worksheet/worksheetPdfExport", () => ({ exportGradedWorksheetPdf: exp.run }));

import { downloadStoredPaperGradedSheet } from "./storedPaperGradedSheet";
import type { SessionRecord } from "./sessionRecords";

const row = (qNumber: number, totalMarks: number, marksAwarded: number) => ({
  qNumber, couldNotRead: false, ok: true, totalMarks, marksAwarded, percentage: 50,
});
const record = { id: "CT-M-X-01", surface: "chapter-test", title: "T", subject: "maths", questionIds: ["a", "b", "c"], marksTotal: 6, gradedAt: 1 } as unknown as SessionRecord;
// Q3 (2 marks) was never attempted: only two rows are on the response.
const response = (over: Record<string, unknown> = {}) =>
  ({ ok: true, results: [row(1, 1, 1), row(2, 3, 1)], gradedMarksAwarded: 2, gradedMarksTotal: 4, gradedCount: 2, totalQuestions: 3, pendingCount: 0, worksheetTotalMarks: 6, ...over }) as never;
const sent = () => (exp.run.mock.calls[0] as unknown as [{ ws: { totalMarks: number }; response: { worksheetTotalMarks: number } }])[0];

beforeEach(() => exp.run.mockClear());

describe("downloadStoredPaperGradedSheet - header total", () => {
  it("uses the stored paper total even when a row is unattempted (6, not the rows' 4)", async () => {
    await downloadStoredPaperGradedSheet(record, response());
    expect(sent().ws.totalMarks).toBe(6);
    expect(sent().response.worksheetTotalMarks).toBe(6);
  });
  it("falls back to the record's total when the response carries none", async () => {
    await downloadStoredPaperGradedSheet(record, response({ worksheetTotalMarks: undefined }));
    expect(sent().ws.totalMarks).toBe(6);
    expect(sent().response.worksheetTotalMarks).toBe(6);
  });
});
