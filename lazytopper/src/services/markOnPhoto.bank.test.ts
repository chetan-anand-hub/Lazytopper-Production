// MARK-ON-PHOTO-2 (owner rulings 25 Nov 2026) — "Mark it on your photo" on Chapter Test, Full Mock and Worksheet.
// The pure half (which rows, how a marked row is adopted) and the three grade services' mark calls: ONE question, the SAME
// fields the paper sent, the paper's OWN worksheetId + paper pass (surface + paperKey) + X-Lazytopper-Mark-Q, synchronous, MI
// once on the question's stable id, the paper re-saved through its own save path.
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../ai/aiClient";

const gradeWorksheet = vi.fn();
vi.mock("../ai/aiClient", async (orig) => ({ ...(await orig<typeof import("../ai/aiClient")>()), gradeWorksheet: (...a: unknown[]) => gradeWorksheet(...a) }));
const recordMistake = vi.fn(async () => ({ outcome: "logged", bridged: false }));
vi.mock("./mistakeIntelligence", async (orig) => ({ ...(await orig<typeof import("./mistakeIntelligence")>()), recordMistake: (...a: unknown[]) => recordMistake(...(a as [])) }));
const recordAttempt = vi.fn();
vi.mock("./practiceInsights", async (orig) => ({ ...(await orig<typeof import("./practiceInsights")>()), recordAttempt: (...a: unknown[]) => recordAttempt(...(a as [])) }));
const saveWorksheetGrade = vi.fn();
vi.mock("./worksheetSessionStore", async (orig) => ({ ...(await orig<typeof import("./worksheetSessionStore")>()), saveWorksheetGrade: (...a: unknown[]) => saveWorksheetGrade(...(a as [])) }));

import {
  MARK_FAILED_COPY,
  adoptBankMark,
  bankMarkableRows,
  isBankMarkableRow,
  markErrorMessage,
  uploadedPhotoPages,
} from "./markOnPhoto";
import { MARK_LIMIT_COPY } from "../ai/aiClient";
import { asNotFoundNotAttempted } from "../lib/notFoundNotAttempted";
import { markChapterTestQuestion } from "./chapterTestGradeService";
import { markFullMockQuestion } from "./fullMockGradeService";
import { markWorksheetQuestion } from "./worksheetGradeService";
import { withMarkOnPhoto } from "../components/results/scorecardVariants";
import type { PersistedWorksheet } from "./worksheetSessionStore";

const graded = (qNumber: number, awarded: number, total: number): WorksheetQuestionGrade => ({
  qNumber, couldNotRead: false, ok: true, totalMarks: total, marksAwarded: awarded, percentage: Math.round((awarded / total) * 100),
  annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 }, teacherNote: "",
});
const unread = (qNumber: number, total: number, note = "We couldn't read this answer."): WorksheetQuestionGrade =>
  ({ qNumber, couldNotRead: true, totalMarks: total, note }) as WorksheetQuestionGrade;
const notFound = (qNumber: number, total: number) => unread(qNumber, total, "Answer not found on the uploaded pages.");

const PAPER: PersistedWorksheet = {
  worksheetId: "ct-1-quadratic-equations--abc",
  createdAt: "2026-11-25T10:00:00.000Z",
  title: "Quadratic Equations",
  subject: "Maths",
  grade: "10",
  sectionFilter: "All",
  totalMarks: 10,
  questions: [
    { qNumber: 1, id: "qe-a-1", subject: "Maths", topicKey: "quadratic-equations", topicLabel: "Quadratic Equations", section: "A", marks: 1, questionText: "MCQ", options: ["1", "2"], answer: "2" },
    { qNumber: 2, id: "qe-c-4", subject: "Maths", topicKey: "quadratic-equations", topicLabel: "Quadratic Equations", section: "C", marks: 3, questionText: "Solve x^2 - 5x + 6 = 0.", solutionSteps: ["Factor", "Roots"], finalAnswer: "2, 3" },
    { qNumber: 3, id: "qe-c-5", subject: "Maths", topicKey: "quadratic-equations", topicLabel: "Quadratic Equations", section: "C", marks: 3, questionText: "Find k.", solutionSteps: ["D = 0"], finalAnswer: "k = 4" },
    { qNumber: 4, id: "qe-c-6", subject: "Maths", topicKey: "quadratic-equations", topicLabel: "Quadratic Equations", section: "C", marks: 3, questionText: "Find the roots.", solutionSteps: ["Formula"], finalAnswer: "1" },
  ],
} as unknown as PersistedWorksheet;

const paperResponse = (rows: WorksheetQuestionGrade[]): WorksheetGradeResponse => ({
  ok: true, worksheetId: PAPER.worksheetId, results: rows, totalQuestions: rows.length,
  gradedCount: rows.filter((r) => !r.couldNotRead).length, pendingCount: rows.filter((r) => r.couldNotRead).length,
  gradedMarksAwarded: 0, gradedMarksTotal: 0, worksheetTotalMarks: 10, summary: "Q3 was not found.",
});
const IMG = { imageBase64: "Q1JPUA==", imageMimeType: "image/jpeg" };

beforeEach(() => {
  gradeWorksheet.mockReset();
  recordMistake.mockClear();
  recordAttempt.mockClear();
  saveWorksheetGrade.mockClear();
});

describe("which rows can be marked", () => {
  it("unreadable, another question's answer, and a not-found row counted 'Not attempted · 0' — never a graded or objective row", () => {
    const mismatch = { ...graded(4, 0, 3), answerMismatch: true } as WorksheetQuestionGrade;
    const rows = [graded(1, 1, 1), unread(2, 3), asNotFoundNotAttempted(notFound(3, 3)), mismatch];
    expect(rows.map(isBankMarkableRow)).toEqual([false, true, true, true]);
    expect(bankMarkableRows(paperResponse(rows))).toEqual([{ index: 1, qNumber: 2 }, { index: 2, qNumber: 3 }, { index: 3, qNumber: 4 }]);
    expect(bankMarkableRows(null)).toEqual([]);
  });

  it("the scorecard row lists them (Q-labels, by index) and is absent with no handler or nothing to mark", () => {
    const resp = paperResponse([graded(1, 1, 1), unread(2, 3)]);
    const onMark = vi.fn();
    const v = withMarkOnPhoto({ surface: "chapter-test" } as never, resp, onMark, true) as { markOnPhoto?: { items: unknown; busy?: boolean } };
    expect(v.markOnPhoto?.items).toEqual([{ index: 1, label: "Q2" }]);
    expect(v.markOnPhoto?.busy).toBe(true);
    expect((withMarkOnPhoto({ surface: "chapter-test" } as never, resp, null) as { markOnPhoto?: unknown }).markOnPhoto).toBeUndefined();
    expect((withMarkOnPhoto({ surface: "chapter-test" } as never, paperResponse([graded(1, 1, 1)]), onMark) as { markOnPhoto?: unknown }).markOnPhoto).toBeUndefined();
  });
});

describe("adoptBankMark", () => {
  it("replaces ONLY that row, recomputes counts, keeps the paper's own full marks, drops the stale summary", () => {
    const resp = paperResponse([graded(1, 1, 1), unread(2, 3), graded(3, 2, 3)]);
    const merged = adoptBankMark(resp, 1, paperResponse([graded(2, 2.5, 3)]))!;
    expect(merged.results[1].marksAwarded).toBe(2.5);
    expect(merged.results[0]).toMatchObject({ qNumber: 1, marksAwarded: 1, totalMarks: 1 });
    expect(merged.results[2]).toMatchObject({ qNumber: 3, marksAwarded: 2, totalMarks: 3 });
    expect([merged.gradedCount, merged.pendingCount, merged.gradedMarksAwarded, merged.gradedMarksTotal]).toEqual([3, 0, 5.5, 7]);
    expect(merged.worksheetTotalMarks).toBe(10);
    expect(merged.summary).toBe("");
  });
  it("a reply that is still not graded, refused, or for another question changes nothing", () => {
    const resp = paperResponse([unread(2, 3)]);
    expect(adoptBankMark(resp, 0, paperResponse([unread(2, 3)]))).toBeNull();
    expect(adoptBankMark(resp, 0, { ...paperResponse([graded(2, 1, 3)]), ok: false })).toBeNull();
    expect(adoptBankMark(resp, 0, paperResponse([graded(5, 1, 3)]))).toBeNull();
    expect(adoptBankMark(resp, 0, null)).toBeNull();
  });
});

describe("dialog helpers", () => {
  it("one uploaded photo is a page to box; a PDF (several photos are assembled into one) is not", () => {
    expect(uploadedPhotoPages({ imageBase64: "AAA", imageMimeType: "image/png" })).toEqual([
      { id: "uploaded-page", prepared: { base64: "AAA", mimeType: "image/png" }, thumbUrl: "data:image/png;base64,AAA" },
    ]);
    expect(uploadedPhotoPages({ imageBase64: "JVBER", imageMimeType: "application/pdf" })).toEqual([]);
    expect(uploadedPhotoPages(null)).toEqual([]);
  });
  it("a refusal reads its own sentence (the 4th mark included); anything else is a plain retry line", () => {
    expect(markErrorMessage(new Error(MARK_LIMIT_COPY))).toBe(MARK_LIMIT_COPY);
    const pr = Object.assign(new Error("This paper's 2 checks are used."), { name: "PremiumRequiredError" });
    expect(markErrorMessage(pr)).toBe("This paper's 2 checks are used.");
    expect(markErrorMessage(new Error("Failed to fetch"))).toBe(MARK_FAILED_COPY);
    expect(markErrorMessage(null)).toBe(MARK_FAILED_COPY);
  });
});

describe.each([
  ["chapter-test", (resp: WorksheetGradeResponse) => markChapterTestQuestion({ user: null, paper: PAPER, code: "CT-M-QE-01", subject: "maths", topicKey: "quadratic-equations", response: resp, index: 2, image: IMG }), "ct:"],
  ["full-mock", (resp: WorksheetGradeResponse) => markFullMockQuestion({ user: null, paper: PAPER, code: "FM-M-01", subject: "maths", response: resp, index: 2, image: IMG }), "fm:"],
  ["worksheet", (resp: WorksheetGradeResponse) => markWorksheetQuestion({ user: null, worksheet: PAPER, response: resp, index: 2, image: IMG }), "ws:"],
] as const)("%s: the mark call", (surface, run, idPrefix) => {
  const resp = () => paperResponse([graded(1, 1, 1), graded(2, 3, 3), asNotFoundNotAttempted(notFound(3, 3)), unread(4, 3)]);

  it("sends ONE question with the paper's own fields, ONE photo, under the paper's OWN id, paper pass and the mark header; never a job", async () => {
    gradeWorksheet.mockResolvedValueOnce(paperResponse([graded(3, 2, 3)]));
    const out = await run(resp());
    expect(gradeWorksheet).toHaveBeenCalledTimes(1);
    const [body, opts] = gradeWorksheet.mock.calls[0] as [Record<string, unknown>, Record<string, unknown>];
    expect(body.worksheetId).toBe(PAPER.worksheetId);
    expect(body.imageBase64).toBeUndefined();
    expect(body.uploads).toEqual([{ qNumber: 3, imageBase64: IMG.imageBase64, imageMimeType: IMG.imageMimeType }]);
    const qs = body.questions as Array<Record<string, unknown>>;
    expect(qs).toHaveLength(1);
    expect(qs[0]).toMatchObject({ qNumber: 3, marks: 3, questionText: "Find k.", solutionSteps: ["D = 0"], finalAnswer: "k = 4", section: "C" });
    // Chapter Test / Full Mock send the bank id (a Test Series paper is verified on it); a Worksheet never did.
    if (surface === "worksheet") expect(qs[0].questionId).toBeUndefined();
    else expect(qs[0].questionId).toBe("qe-c-5");
    expect(opts).toEqual({ surface, paperKey: PAPER.worksheetId, markQ: 3 });
    expect(out.kind).toBe("marked");
    if (out.kind !== "marked") return;
    expect(out.response.results[2].marksAwarded).toBe(2);
    expect(out.response.results[3]).toMatchObject({ qNumber: 4, couldNotRead: true, totalMarks: 3 });
    // MI once, on the question's stable id; the device copy rewritten
    expect(recordMistake).toHaveBeenCalledTimes(1);
    expect((recordMistake.mock.calls[0] as unknown[])[2]).toMatchObject({ questionId: `${idPrefix}${PAPER.worksheetId}:q3`, submissionId: PAPER.worksheetId });
    expect(recordAttempt).toHaveBeenCalledTimes(1);
    expect(saveWorksheetGrade).toHaveBeenCalledWith(PAPER.worksheetId, out.response);
  });

  it("a mark that comes back unread changes nothing and records nothing", async () => {
    gradeWorksheet.mockResolvedValueOnce(paperResponse([unread(3, 3)]));
    expect((await run(resp())).kind).toBe("unread");
    expect(recordMistake).not.toHaveBeenCalled();
    expect(saveWorksheetGrade).not.toHaveBeenCalled();
  });

  it("a refusal is thrown to the page (its dialog shows it)", async () => {
    gradeWorksheet.mockRejectedValueOnce(new Error(MARK_LIMIT_COPY));
    await expect(run(resp())).rejects.toThrow(MARK_LIMIT_COPY);
    expect(saveWorksheetGrade).not.toHaveBeenCalled();
  });
});

describe("page wiring (source guard)", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readFileSync } = require("node:fs") as typeof import("node:fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { join } = require("node:path") as typeof import("node:path");
  const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");
  it.each([
    ["pages/ChapterTestPage.tsx", "markChapterTestQuestion"],
    ["pages/FullMockPage.tsx", "markFullMockQuestion"],
    ["components/worksheet/WorksheetGradePanel.tsx", "markWorksheetQuestion"],
  ])("%s: the dialog is its own lazy chunk, opened from the scorecard and the result, and calls %s", (file, fn) => {
    const src = read(file);
    expect(src).toMatch(/const MarkOnPhotoDialog = lazy\(\(\) => import\("[./]+components\/checkimprove\/MarkOnPhoto"\)|const MarkOnPhotoDialog = lazy\(\(\) => import\("\.\.\/checkimprove\/MarkOnPhoto"\)/);
    expect(src).not.toMatch(/^import [^;]*from "[./]*(components\/)?checkimprove\/MarkOnPhoto";/m);
    expect(src).toContain(`await ${fn}(`);
    expect(src).toMatch(/withMarkOnPhoto\(/);
    expect(src).toMatch(/<MarkOnPhotoDialog\s+onTop/);
    expect(src).toContain("fairUse.handleRefusal(e)");
  });
  it("Chapter Test and Full Mock say a Test Series mark uses one of the paper's checks (as 'Upload all pages again' does)", () => {
    for (const f of ["pages/ChapterTestPage.tsx", "pages/FullMockPage.tsx"]) {
      expect(read(f)).toMatch(/!boardPassHolder && seriesPaperKeyOfWorksheetId\(markContext\(mark\.where\)!\.paper\.worksheetId\) !== null \? \(\s*<p className="lt-mop-sub" data-testid="mark-uses-check">\{ADD_PAGES_USES_CHECK_LINE\}<\/p>/);
    }
  });
});
