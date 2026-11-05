// SCORECARD-SECTION-TYPE-1 - the section + type lenses on ALL SIX grading surfaces, live AND restored.
// For each surface: correct numbers from the real data, no data -> no lens, and the restored card carries the
// SAME lens as the live one (the #1555 / #1576 lesson).
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../../ai/aiClient";
import type { SessionRecord } from "../../services/sessionRecords";
import { bankIndexEntries } from "../../data/bankChapters/bankIdIndex";
import {
  checkImproveScorecardVariant,
  fullMockScorecardVariant,
  quickPracticeGradedScorecardVariant,
  quickPracticeScorecardVariant,
  reopenedQuickPracticeScorecardVariant,
  storedCheckImproveScorecardVariant,
  storedWorksheetScorecardVariant,
  worksheetScorecardVariant,
  type ScorecardVariant,
} from "./scorecardVariants";
import { chapterTestScorecardVariant, storedChapterTestScorecardVariant, storedFullMockScorecardVariant } from "./scorecardBankLenses";
import { stampFromPaper, stampLens } from "./sectionTypeLens";
import { buildQuickPracticeResponse } from "../../services/quickPracticeSessionService";
import ResultsScorecard from "./ResultsScorecard";

afterEach(() => cleanup());
const noop = () => {};

const row = (qNumber: number, total: number, awarded: number, extra: Partial<WorksheetQuestionGrade> = {}): WorksheetQuestionGrade => ({
  qNumber,
  couldNotRead: false,
  ok: true,
  totalMarks: total,
  marksAwarded: awarded,
  ...extra,
});
const resp = (results: WorksheetQuestionGrade[]): WorksheetGradeResponse => {
  const graded = results.filter((r) => !r.couldNotRead);
  return {
    ok: true,
    results,
    totalQuestions: results.length,
    gradedCount: graded.length,
    pendingCount: results.length - graded.length,
    gradedMarksAwarded: graded.reduce((s, r) => s + (r.marksAwarded ?? 0), 0),
    gradedMarksTotal: graded.reduce((s, r) => s + r.totalMarks, 0),
    worksheetTotalMarks: results.reduce((s, r) => s + r.totalMarks, 0),
  };
};

const record = (over: Partial<SessionRecord> = {}): SessionRecord => ({
  id: "X-1",
  surface: "worksheet",
  worksheetId: "w1",
  code: "X-1",
  title: "T",
  subject: "maths",
  topicKeys: ["real-numbers"],
  questionIds: [],
  marksAwarded: 0,
  marksTotal: 0,
  status: "graded",
  fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  sectionBreakdown: null,
  gradedAt: 1,
  perQuestionRef: "ref",
  dedupKey: "u::X-1",
  ...over,
} as unknown as SessionRecord);

/** Two real served bank ids: one whose bank section is "E", one whose is "A". */
function bankIds(): { e: string; a: string } {
  let e = "";
  let a = "";
  for (const [id, meta] of bankIndexEntries()) {
    if (!e && meta.section === "E") e = id;
    if (!a && meta.section === "A") a = id;
    if (e && a) break;
  }
  return { e, a };
}

const lensOf = (v: ScorecardVariant) => ({
  sectionLens: v.sectionLens ?? null,
  sectionLensNote: v.sectionLensNote ?? null,
  typeLens: v.typeLens ?? null,
  typeLensNote: v.typeLensNote ?? null,
});

describe("Worksheet (live and restored)", () => {
  const paper = [
    { qNumber: 1, section: "A", format: "MCQ" },
    { qNumber: 2, section: "A", format: "Assertion-Reasoning" },
    { qNumber: 3, section: "C", format: "Short" },
    { qNumber: 4, section: "E", format: "Case-Based" },
  ];
  const graded = resp([row(1, 1, 0, { objective: true }), row(2, 1, 1), row(3, 3, 2), row(4, 4, 4)]);

  it("live: section rows and type rows carry the real numbers", () => {
    const v = worksheetScorecardVariant({ name: "WS", code: "WS-M-01", response: graded, questions: paper, downloading: false, onRead: noop, onDownload: noop });
    expect(v.sectionLens!.map((r) => [r.section, r.awarded, r.total, r.lost])).toEqual([
      ["A", 1, 2, 1],
      ["C", 2, 3, 1],
      ["E", 4, 4, 0],
    ]);
    expect(v.typeLens!.map((r) => [r.key, r.awarded, r.total])).toEqual([
      ["mcq", 0, 1],
      ["ar", 1, 1],
      ["short", 2, 3],
      ["case", 4, 4],
    ]);
  });

  it("restored from the STORED rows equals live (no paper needed once the rows are stamped)", () => {
    const live = worksheetScorecardVariant({ name: "WS", code: "WS-M-01", response: graded, questions: paper, downloading: false, onRead: noop, onDownload: noop });
    const stamped = stampFromPaper(graded, paper, { blueprintFallback: true });
    const restored = storedWorksheetScorecardVariant(record({ marksAwarded: 7, marksTotal: 9 }), {
      gradedDateLabel: "1 Nov",
      onDone: noop,
      response: stamped,
    });
    expect(lensOf(restored)).toEqual(lensOf(live));
  });

  it("no section and no type on any question -> no lens at all", () => {
    const v = worksheetScorecardVariant({ name: "WS", code: "WS-M-01", response: graded, downloading: false, onRead: noop, onDownload: noop });
    expect(v.sectionLens ?? null).toBeNull();
    expect(v.typeLens ?? null).toBeNull();
    const r = storedWorksheetScorecardVariant(record(), { gradedDateLabel: "1 Nov", onDone: noop });
    expect(r.sectionLens).toBeUndefined();
  });
});

describe("Chapter Test (live and restored)", () => {
  it("live: uses the bank's REAL section; a 4-mark case row in slot D shows under E, not folded into D", () => {
    const response = resp([row(1, 1, 1), row(2, 5, 4), row(3, 4, 3)]);
    const v = chapterTestScorecardVariant({
      name: "CT",
      code: "CT-M-01",
      phase: "full",
      response,
      questions: [
        { qNumber: 1, id: "none-1", bankSection: "A", format: "MCQ" },
        { qNumber: 2, id: "none-2", bankSection: "D", format: "Long" },
        { qNumber: 3, id: "none-3", bankSection: "E", format: "Case-Based" },
      ],
    });
    expect(v.sectionLens!.map((r) => r.section)).toEqual(["A", "D", "E"]);
    expect(v.sectionLens!.find((r) => r.section === "E")).toMatchObject({ awarded: 3, total: 4, lost: 1 });
    expect(v.sectionLens!.find((r) => r.section === "D")).toMatchObject({ awarded: 4, total: 5 });
  });

  it("live: a paper drawn before the bank fields existed gets its section from the bank id index, never a marks band", () => {
    const { e, a } = bankIds();
    expect(e && a).toBeTruthy();
    const response = resp([row(1, 1, 1), row(2, 4, 2)]);
    const v = chapterTestScorecardVariant({
      name: "CT",
      code: "CT-M-01",
      phase: "full",
      response,
      questions: [
        { qNumber: 1, id: a },
        { qNumber: 2, id: e },
      ],
    });
    expect(v.sectionLens!.map((r) => r.section)).toEqual(["A", "E"]);
    // a question whose id is not a bank row is left out (and said so), not placed by its marks
    const v2 = chapterTestScorecardVariant({ name: "CT", code: "CT-M-01", phase: "full", response, questions: [{ qNumber: 1, id: a }, { qNumber: 2, id: "gone" }] });
    expect(v2.sectionLens!.map((r) => r.section)).toEqual(["A"]);
    expect(v2.sectionLensNote).toContain("no section on record");
  });

  it("restored: stamped rows (new record) and the id index (old record) both match the live card", () => {
    const { e, a } = bankIds();
    const response = resp([row(1, 1, 1), row(2, 4, 2)]);
    const live = chapterTestScorecardVariant({ name: "CT", code: "CT-M-01", phase: "full", response, questions: [{ qNumber: 1, id: a }, { qNumber: 2, id: e }] });
    const rec = record({ surface: "chapter-test", questionIds: [a, e], marksAwarded: 3, marksTotal: 5 });
    const oldRecord = storedChapterTestScorecardVariant(rec, { gradedDateLabel: "1 Nov", response, onDone: noop });
    expect(lensOf(oldRecord).sectionLens).toEqual(lensOf(live).sectionLens);
    const stamped = stampFromPaper(response, [{ qNumber: 1, section: "A", bankSection: "A", format: "MCQ" }, { qNumber: 2, section: "D", bankSection: "E", format: "Case-Based" }], { blueprintFallback: false });
    const newRecord = storedChapterTestScorecardVariant(record({ surface: "chapter-test", questionIds: [], marksAwarded: 3, marksTotal: 5 }), { gradedDateLabel: "1 Nov", response: stamped, onDone: noop });
    expect(newRecord.sectionLens!.map((r) => r.section)).toEqual(["A", "E"]);
    expect(newRecord.typeLens!.map((r) => r.key)).toEqual(["mcq", "case"]);
  });

  it("partial (awaiting sheet) shows no lens", () => {
    const v = chapterTestScorecardVariant({ name: "CT", code: "CT-M-01", phase: "partial", response: resp([row(1, 1, 1)]) });
    expect(v.sectionLens ?? null).toBeNull();
  });
});

describe("Full Mock (live and restored)", () => {
  it("live: bank section + type from the paper; restored from the persisted rows is identical (no marks-band fallback on reopen)", () => {
    const response = resp([row(1, 1, 1), row(2, 3, 1), row(3, 4, 4)]);
    const questions = [
      { qNumber: 1, section: "A", bankSection: "A", format: "MCQ" },
      { qNumber: 2, section: "C", bankSection: "C", format: "Short" },
      { qNumber: 3, section: "E", bankSection: "E", format: "Case-Based" },
    ];
    const live = fullMockScorecardVariant({ name: "FM", code: "FM-M-01", phase: "full", response, questions });
    expect(live.sectionLens!.map((r) => [r.section, r.lost])).toEqual([["A", 0], ["C", 2], ["E", 0]]);
    const stored = storedFullMockScorecardVariant(record({ surface: "full-mock", questionIds: [], marksAwarded: 6, marksTotal: 8 }), {
      gradedDateLabel: "1 Nov",
      response: stampFromPaper(response, questions, { blueprintFallback: true }),
      onDone: noop,
    });
    expect(lensOf(stored)).toEqual(lensOf(live));
  });

  it("restored with NO persisted section and no bank id: the mark value is never used to guess (no lens)", () => {
    const response = resp([row(1, 1, 1), row(2, 2, 2), row(3, 5, 3)]);
    const stored = storedFullMockScorecardVariant(record({ surface: "full-mock", questionIds: [], marksAwarded: 6, marksTotal: 8 }), {
      gradedDateLabel: "1 Nov",
      response,
      onDone: noop,
    });
    expect(stored.sectionLens ?? null).toBeNull();
  });
});

describe("Quick Practice (live graded, tap-only, restored)", () => {
  const entries = [
    { questionId: "q1", marks: 1, mcq: "wrong" as const, section: "A", format: "MCQ" },
    { questionId: "q2", marks: 1, mcq: "correct" as const, section: "A", format: "Assertion-Reasoning" },
    { questionId: "q3", marks: 3, mcq: "correct" as const, section: "C", format: "Short" },
  ];

  it("buildQuickPracticeResponse stamps each result with its question's section and format", () => {
    const r = buildQuickPracticeResponse(entries);
    expect(r.results.map((x) => [x.section, x.format])).toEqual([["A", "MCQ"], ["A", "Assertion-Reasoning"], ["C", "Short"]]);
  });

  it("an entry with no section / format adds none (older sessions stay silent)", () => {
    const r = buildQuickPracticeResponse([{ questionId: "q1", marks: 1, mcq: "wrong" }]);
    expect(r.results[0].section).toBeUndefined();
  });

  it("graded, tap-only and reopened cards show the same lens", () => {
    const response = buildQuickPracticeResponse(entries);
    const graded = quickPracticeGradedScorecardVariant({ marksAwarded: 4, marksTotal: 5, gradedCount: 3, totalQuestions: 3, response });
    const tap = quickPracticeScorecardVariant({
      response,
      attempted: 3,
      totalInSet: 3,
      mcqAnswered: 3,
      mcqCorrect: 2,
      allDone: true,
      onKeepPracticing: noop,
      onFreshSet: noop,
      onChapterTest: noop,
      onPredicted: noop,
      onStudy: noop,
    });
    const reopened = reopenedQuickPracticeScorecardVariant(record({ surface: "quick-practice", questionIds: ["q1", "q2", "q3"], marksAwarded: 4, marksTotal: 5 }), {
      gradedDateLabel: "1 Nov",
      response,
      menu: { onFreshSet: noop, onChapterTest: noop, onPredicted: noop, onStudy: noop },
    });
    expect(graded.sectionLens!.map((r) => [r.section, r.awarded, r.total])).toEqual([["A", 1, 2], ["C", 3, 3]]);
    expect(graded.typeLens!.map((r) => r.key)).toEqual(["mcq", "ar", "short"]);
    expect(lensOf(tap)).toEqual(lensOf(graded));
    expect(lensOf(reopened)).toEqual(lensOf(graded));
  });
});

describe("Answer Checker (multi and single, live and restored)", () => {
  const readRows = [
    row(1, 1, 0, { objective: true, section: "A", sectionBasis: "read", format: "objective" }),
    row(2, 3, 2, { section: "C", sectionBasis: "check", format: "written" }),
    row(3, 5, 5, { section: "D", sectionBasis: "read", format: "written" }),
  ];
  const base = { topicName: "Real Numbers", code: "CI-M-01", topicSource: "inferred" as const, saved: true, onReadSheet: noop };

  it("multi live: sections labelled as read from the paper, an inferred one flagged check; type is objective vs written only", () => {
    const v = checkImproveScorecardVariant({ ...base, response: resp(readRows) });
    expect(v.sectionLens!.map((r) => [r.section, r.check])).toEqual([["A", false], ["C", true], ["D", false]]);
    expect(v.sectionLensNote).toContain("as read from your paper");
    expect(v.typeLens!.map((r) => r.label)).toEqual(["MCQ / Assertion-Reason", "Written"]);
    expect(v.typeLensNote).toContain("As read from your paper");
  });

  it("multi restored: the persisted (stamped) rows give the SAME lens", () => {
    const response = resp(readRows);
    const live = checkImproveScorecardVariant({ ...base, response });
    const restored = storedCheckImproveScorecardVariant(record({ surface: "check-improve", marksAwarded: 7, marksTotal: 9 }), { gradedDateLabel: "1 Nov", response, onDone: noop });
    expect(lensOf(restored)).toEqual(lensOf(live));
  });

  it("a read that found no section shows no section lens (and no type lens when nothing was read)", () => {
    const v = checkImproveScorecardVariant({ ...base, response: resp([row(1, 3, 2), row(2, 5, 4)]) });
    expect(v.sectionLens ?? null).toBeNull();
    expect(v.typeLens ?? null).toBeNull();
  });

  it("single question: no section lens and no type lens", () => {
    const v = checkImproveScorecardVariant({ ...base, response: resp([row(1, 5, 3)]) });
    expect(v.sectionLens ?? null).toBeNull();
    expect(v.typeLens ?? null).toBeNull();
  });

  it("stamping a row never changes a mark or a mistake type", () => {
    const before = resp([row(1, 3, 2, { mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 } })]);
    const after = stampLens(before, () => ({ section: "C", sectionBasis: "read", format: "written" }));
    const { section, sectionBasis, format, ...rest } = after.results[0];
    expect([section, sectionBasis, format]).toEqual(["C", "read", "written"]);
    expect(rest).toEqual(before.results[0]);
    expect(after.gradedMarksAwarded).toBe(before.gradedMarksAwarded);
  });
});

describe("the shared shell renders one lens everywhere", () => {
  const variant = (over: Partial<ScorecardVariant>): ScorecardVariant => ({
    surface: "worksheet",
    title: "T",
    subtitle: "S",
    score: { kind: "marks", awarded: 5, total: 9 },
    actions: [],
    ...over,
  });

  it("renders a Scored / Out of / Lost table, the check chip and the note; nothing inline-styled", async () => {
    render(
      <ResultsScorecard
        variant={variant({
          sectionLens: [
            { section: "A", label: "A · Objective", awarded: 1, total: 2, lost: 1, count: 2, check: false },
            { section: "C", label: "C · Short", awarded: 2, total: 3, lost: 1, count: 1, check: true },
          ],
          sectionLensNote: "Sections as read from your paper.",
          typeLens: [
            { key: "mcq", label: "MCQ", awarded: 1, total: 2, lost: 1, count: 2 },
            { key: "short", label: "Short answer", awarded: 2, total: 3, lost: 1, count: 1 },
          ],
        })}
        onClose={noop}
      />,
    );
    const section = await screen.findByTestId("sc-section-lens");
    expect(within(section).getByText("By section")).toBeInTheDocument();
    expect(within(section).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Section", "Scored", "Out of", "Lost"]);
    const rowC = section.querySelector('[data-row="C"]')!;
    expect(rowC.textContent).toContain("C · Short");
    expect(rowC.textContent).toContain("check");
    expect(section.querySelector('[data-row="A"]')!.getAttribute("data-lost")).toBe("1");
    expect(within(section).getByText("Sections as read from your paper.")).toBeInTheDocument();
    const type = await screen.findByTestId("sc-type-lens");
    expect(within(type).getByText("By question type")).toBeInTheDocument();
    expect(type.querySelector('[data-row="short"]')!.textContent).toContain("Short answer");
    expect(section.querySelector("[style]")).toBeNull();
    expect(type.querySelector("[style]")).toBeNull();
  });

  it("no rows -> no lens block", () => {
    render(<ResultsScorecard variant={variant({ sectionLens: [], typeLens: [] })} onClose={noop} />);
    expect(screen.queryByTestId("sc-section-lens")).toBeNull();
    expect(screen.queryByTestId("sc-type-lens")).toBeNull();
  });

  it("360px layout is class-driven: a fixed-layout table with narrow number columns, and a phone breakpoint", () => {
    const css = readFileSync(resolve(__dirname, "SectionTypeLens.css"), "utf8");
    expect(css).toMatch(/\.lt-stl__tbl\s*\{[^}]*table-layout:\s*fixed/);
    expect(css).toMatch(/\.lt-stl__tbl\s*\{[^}]*width:\s*100%/);
    expect(css).toMatch(/\.lt-stl__c--num\s*\{[^}]*width:\s*3\.6rem/);
    expect(css).toMatch(/@media \(max-width: 420px\)/);
    expect(css).toMatch(/overflow-wrap:\s*anywhere/);
    // three number columns + a label column: even at 360px minus gutters the label keeps most of the row
    expect(3 * 2.9 * 16).toBeLessThan(360 - 2 * 16 - 140);
  });
});
