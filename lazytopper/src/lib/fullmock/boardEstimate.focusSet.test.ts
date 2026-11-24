/**
 * TS-THEMES-1 x TS-BOARDSCORE-1 - a Test Series FOCUS SET runs on the Full Mock page (a `full-mock` record) but is a short one-type
 * paper: it NEVER feeds the full-test trend or the board estimate, and its own scorecard reads out of the SET's full marks (X / 20),
 * with no board view. Real pinned sets, built by the page's own builder.
 */
import { describe, expect, it } from "vitest";
import { buildBoardScoreView, fullTestScores, isFullyGradedFullPaper } from "./boardEstimate";
import { focusSetWorksheetId, focusSets } from "../testSeries/focusSets";
import { buildFocusSet } from "../testSeries/pinnedFocusSet";
import { ensureBankSubject } from "../../data/bankChapters/loader";
import { fullMockScorecardVariant } from "../../components/results/scorecardVariants";
import { buildFullMockResponse } from "../../services/fullMockGradeService";
import { scoreObjectiveSection } from "../../services/chapterTestGradeService";
import { fullMockObjectiveQuestions, fullMockSubjectiveQuestions } from "../../components/fullmock/fullMockBlueprint";

const rec = (id: string, worksheetId: string, awarded: number, total: number, gradedAt: number) => ({
  id, worksheetId, surface: "full-mock", subject: "maths", status: "graded", marksAwarded: awarded, marksTotal: total, gradedAt,
});

describe("TS-THEMES-1: focus sets never count as full tests", () => {
  const fs = focusSets()[0];
  it("a graded focus-set record is not a full paper - even if its total were 80; a real 80-mark series / fresh mock still is", () => {
    expect(isFullyGradedFullPaper(rec("FM-M-01", focusSetWorksheetId("fm-a-1", fs), 15, 20, 1))).toBe(false);
    expect(isFullyGradedFullPaper(rec("FM-M-02", focusSetWorksheetId("fm-a-2", fs), 60, 80, 2))).toBe(false);
    expect(isFullyGradedFullPaper(rec("FM-M-03", "fm-ts1-m3--a", 60, 80, 3))).toBe(true);
    expect(isFullyGradedFullPaper(rec("FM-M-04", "fm-lq2-9k", 50, 80, 4))).toBe(true);
    expect(isFullyGradedFullPaper({ ...rec("FM-M-05", "x", 50, 80, 5), worksheetId: undefined })).toBe(true);
  });

  it("the trend / estimate inputs leave focus sets out (2 full tests + 3 focus sets -> exactly the 2 full tests)", () => {
    const records = [
      rec("FM-M-01", "fm-ts1-m1--a", 50, 80, 1),
      rec("FM-M-02", focusSetWorksheetId("fm-b", focusSets()[1]), 18, 20, 2),
      rec("FM-M-03", focusSetWorksheetId("fm-c", focusSets()[2]), 20, 20, 3),
      rec("FM-M-04", "fm-lq2-9k", 60, 80, 4),
      rec("FM-M-05", focusSetWorksheetId("fm-d", focusSets()[3]), 80, 80, 5),
    ];
    expect(fullTestScores(records, "maths").map((s) => s.id)).toEqual(["FM-M-01", "FM-M-04"]);
  });

  it("a focus set's own result has no board view (not an 80-mark paper)", () => {
    expect(buildBoardScoreView({ paper: { awarded: 14, total: 20, pendingCount: 0 }, scores: [{ id: "a", score: 50, gradedAt: 1 }, { id: "b", score: 60, gradedAt: 2 }] })).toBeNull();
  });
});

describe("TS-THEMES-1: a focus set's scorecard reads out of the set's FULL marks", () => {
  it("awaiting sheet: 0 / <set marks>, the written marks waiting, no 0/0, no MCQ line; full: X / <set marks>", async () => {
    await ensureBankSubject("Maths");
    const f = focusSets().find((x) => x.code === "FS-M-SA-2")!;
    const built = await buildFocusSet(f, { worksheetId: focusSetWorksheetId("fm-t-1", f), code: "FM-M-01", name: "Maths · Mock #1", createdAt: "2026-01-01T00:00:00.000Z" });
    const paper = built!.drawn.paper;
    const total = built!.drawn.totalMarks;
    const objective = scoreObjectiveSection(fullMockObjectiveQuestions(paper), {});
    const response = buildFullMockResponse({ paper, objective, subjectiveQuestions: fullMockSubjectiveQuestions(paper), subjectiveResponse: null });
    const partial = fullMockScorecardVariant({ name: "Maths · Mock #1", code: "FM-M-01", phase: "partial", response });
    expect(partial.score).toMatchObject({ kind: "marks", awarded: 0, total });
    expect((partial.score as { notMarked?: { marks: number; line: string } }).notMarked?.marks).toBe(total);
    expect((partial.score as { notMarked?: { line: string } }).notMarked?.line).toContain("waiting for your answer sheet");
    expect(partial.message).toBe(`Upload your written answers (${total} marks) for your score — with a chapter-wise breakdown and mistake analysis.`);
    expect(`${partial.message} ${partial.footnote}`).not.toMatch(/0\/0|MCQ|Objective section/);
    const free = fullMockScorecardVariant({ name: "Maths · Mock #1", code: "FM-M-01", phase: "partial", response, uploadNotAllowed: true });
    expect(free.message).toBe(`Your written answers (${total} marks) are checked with the Test Series or the Board Pass.`);
    expect(free.score).toMatchObject({ awarded: 0, total });
    // Fully graded: still out of the set's own marks (never 80).
    const sub = fullMockSubjectiveQuestions(paper);
    const graded = buildFullMockResponse({
      paper,
      objective,
      subjectiveQuestions: sub,
      subjectiveResponse: {
        ok: true,
        results: sub.map((q) => ({ qNumber: q.qNumber, marksAwarded: Math.floor(Number(q.marks) / 2), maxMarks: Number(q.marks), status: "graded" })),
      } as never,
    });
    const full = fullMockScorecardVariant({ name: "Maths · Mock #1", code: "FM-M-01", phase: "full", response: graded, questions: paper.questions });
    expect((full.score as { total: number }).total).toBe(total);
  }, 120_000);
});
