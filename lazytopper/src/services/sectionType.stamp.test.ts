// SCORECARD-SECTION-TYPE-1 - the services stamp each graded row with its bank section and question type, so the
// live card, the device cache and the stored payload carry the SAME lens data. Display only: marks untouched.
import { describe, expect, it } from "vitest";
import "../test/preloadBankChapters";
import { bankRowMeta } from "../data/bankChapters/bankIdIndex";
import { drawChapterTest } from "../components/chaptertest/chapterTestBlueprint";
import { drawFullMock } from "../components/fullmock/fullMockBlueprint";
import { buildChapterTestResponse, scoreObjectiveSection } from "./chapterTestGradeService";
import { buildFullMockResponse } from "./fullMockGradeService";
import type { PersistedWorksheet, PersistedWorksheetQuestion } from "./worksheetSessionStore";
import { worksheetQuestionFromBankRow } from "./paperRebuild";
import type { CanonicalQuestion } from "../data/predictionTypes";
import { deriveSectionLens } from "../components/results/sectionTypeLens";

const q = (qNumber: number, section: string, marks: number, over: Partial<PersistedWorksheetQuestion> = {}): PersistedWorksheetQuestion => ({
  qNumber,
  id: `x-${qNumber}`,
  subject: "Maths",
  topicKey: "real-numbers",
  topicLabel: "Real Numbers",
  section,
  marks,
  questionText: `Q${qNumber}`,
  ...over,
});
const paperOf = (questions: PersistedWorksheetQuestion[]): PersistedWorksheet => ({
  worksheetId: "w",
  createdAt: "x",
  title: "t",
  subject: "Maths",
  grade: "10",
  sectionFilter: "All",
  totalMarks: questions.reduce((s, x) => s + x.marks, 0),
  questions,
});
const subjRow = (qNumber: number, total: number, awarded: number) => ({
  qNumber,
  couldNotRead: false,
  ok: true,
  totalMarks: total,
  marksAwarded: awarded,
  annotatedSteps: [],
  mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  teacherNote: "",
});
const sub = (rows: ReturnType<typeof subjRow>[]) => ({
  ok: true,
  results: rows,
  totalQuestions: rows.length,
  gradedCount: rows.length,
  pendingCount: 0,
  gradedMarksAwarded: rows.reduce((s, r) => s + r.marksAwarded, 0),
  gradedMarksTotal: rows.reduce((s, r) => s + r.totalMarks, 0),
  worksheetTotalMarks: rows.reduce((s, r) => s + r.totalMarks, 0),
});

describe("buildChapterTestResponse / buildFullMockResponse stamp the rows", () => {
  const MCQ = q(1, "A", 1, { bankSection: "A", format: "MCQ", options: ["a", "b"], answer: "a" });
  const CASE = q(2, "D", 4, { bankSection: "E", format: "Case-Based" }); // CT slots a 4-mark case row in D
  const LONG = q(3, "D", 5, { bankSection: "D", format: "Long" });
  const paper = paperOf([MCQ, CASE, LONG]);
  const objective = scoreObjectiveSection([MCQ], { 1: "a" });

  it("Chapter Test: objective AND written rows carry the bank section (E stays E) and format; marks are the grader's", () => {
    const r = buildChapterTestResponse({ paper, objective, subjectiveQuestions: [CASE, LONG], subjectiveResponse: sub([subjRow(2, 4, 3), subjRow(3, 5, 5)]) });
    expect(r.results.map((x) => [x.qNumber, x.section, x.sectionBasis, x.format])).toEqual([
      [1, "A", "bank", "MCQ"],
      [2, "E", "bank", "Case-Based"],
      [3, "D", "bank", "Long"],
    ]);
    expect(r.results.map((x) => x.marksAwarded)).toEqual([1, 3, 5]);
    expect(deriveSectionLens(r)!.rows.map((x) => x.section)).toEqual(["A", "D", "E"]);
    expect(r.gradedMarksAwarded).toBe(9);
  });

  it("Chapter Test: a paper drawn before the bank fields existed gets NO section from its blueprint slot (no marks-band guess)", () => {
    const old = paperOf([q(1, "A", 1), q(2, "D", 4), q(3, "D", 5)]);
    const r = buildChapterTestResponse({ paper: old, objective: scoreObjectiveSection([old.questions[0]], {}), subjectiveQuestions: old.questions.slice(1), subjectiveResponse: sub([subjRow(2, 4, 3), subjRow(3, 5, 5)]) });
    expect(r.results.every((x) => x.section === undefined)).toBe(true);
  });

  it("Full Mock: the same stamps; an older mock paper falls back to its blueprint slot", () => {
    const r = buildFullMockResponse({ paper, objective, subjectiveQuestions: [CASE, LONG], subjectiveResponse: sub([subjRow(2, 4, 3), subjRow(3, 5, 5)]) });
    expect(r.results.map((x) => x.section)).toEqual(["A", "E", "D"]);
    const old = paperOf([q(1, "A", 1), q(2, "E", 4)]);
    const o = buildFullMockResponse({ paper: old, objective: scoreObjectiveSection([old.questions[0]], {}), subjectiveQuestions: [old.questions[1]], subjectiveResponse: sub([subjRow(2, 4, 3)]) });
    expect(o.results.map((x) => x.section)).toEqual(["A", "E"]);
  });

  it("an awaiting-sheet (partial) response stamps the pending rows too, and a pending row is not in the lens", () => {
    const r = buildChapterTestResponse({ paper, objective, subjectiveQuestions: [CASE, LONG], subjectiveResponse: null });
    expect(deriveSectionLens(r)!.rows.map((x) => x.section)).toEqual(["A"]);
  });
});

describe("drawn papers carry the bank row's own section and format", () => {
  it("Chapter Test: every question's bankSection is the id index's section; format is set; the blueprint slot is untouched", () => {
    const d = drawChapterTest({ subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", worksheetId: "ct-stamp", createdAt: "fixed", seed: 7 });
    expect(d.paper.questions.length).toBeGreaterThan(0);
    for (const x of d.paper.questions) {
      expect(x.bankSection, x.id).toBe(String(bankRowMeta(x.id)?.section ?? "").toUpperCase());
      expect(x.format, x.id).toBeTruthy();
      expect(["A", "B", "C", "D"]).toContain(x.section);
    }
  });

  it("Full Mock: bankSection and format ride every question (canonical rows match the id index)", () => {
    const d = drawFullMock({ subject: "Maths", worksheetId: "fm-stamp", code: "FM-M-01", name: "m", createdAt: "fixed", seed: 5 });
    for (const x of d.paper.questions) {
      expect(x.format, x.id).toBeTruthy();
      expect(x.bankSection, x.id).toBeTruthy();
      const meta = bankRowMeta(x.id);
      if (meta) expect(x.bankSection).toBe(meta.section);
    }
  });

  it("Worksheet: worksheetQuestionFromBankRow keeps the bank format beside the bank section", () => {
    const row = { id: "r", subject: "maths", topicKey: "real-numbers", section: "e", marks: 4, format: "Case-Based", questionText: "t" } as unknown as CanonicalQuestion;
    expect(worksheetQuestionFromBankRow(row, 1, "Real Numbers")).toMatchObject({ section: "E", format: "Case-Based" });
  });
});
