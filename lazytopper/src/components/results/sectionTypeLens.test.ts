// SCORECARD-SECTION-TYPE-1 - the shared by-section / by-type lens (pure).
import { describe, expect, it } from "vitest";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../../ai/aiClient";
import {
  deriveSectionLens,
  deriveTypeLens,
  stampFromPaper,
  stampLens,
  typeKeyOf,
  readTypeOf,
} from "./sectionTypeLens";

const row = (qNumber: number, total: number, awarded: number, extra: Partial<WorksheetQuestionGrade> = {}): WorksheetQuestionGrade => ({
  qNumber,
  couldNotRead: false,
  ok: true,
  totalMarks: total,
  marksAwarded: awarded,
  ...extra,
});
const resp = (results: WorksheetQuestionGrade[]): WorksheetGradeResponse => ({
  ok: true,
  results,
  totalQuestions: results.length,
  gradedCount: results.filter((r) => !r.couldNotRead).length,
  pendingCount: results.filter((r) => r.couldNotRead).length,
  gradedMarksAwarded: results.filter((r) => !r.couldNotRead).reduce((s, r) => s + (r.marksAwarded ?? 0), 0),
  gradedMarksTotal: results.filter((r) => !r.couldNotRead).reduce((s, r) => s + r.totalMarks, 0),
  worksheetTotalMarks: results.reduce((s, r) => s + r.totalMarks, 0),
});

describe("deriveSectionLens", () => {
  it("adds scored / out of / lost per section from the stamped sections, A-E order", () => {
    const lens = deriveSectionLens(
      resp([
        row(1, 1, 0, { section: "A", sectionBasis: "bank" }),
        row(2, 1, 1, { section: "A", sectionBasis: "bank" }),
        row(3, 4, 2.5, { section: "E", sectionBasis: "bank" }),
        row(4, 5, 4, { section: "D", sectionBasis: "bank" }),
      ]),
    )!;
    expect(lens.rows.map((r) => r.section)).toEqual(["A", "D", "E"]);
    expect(lens.rows[0]).toMatchObject({ awarded: 1, total: 2, lost: 1, count: 2, check: false });
    expect(lens.rows[1]).toMatchObject({ awarded: 4, total: 5, lost: 1 });
    expect(lens.rows[2]).toMatchObject({ awarded: 2.5, total: 4, lost: 1.5 });
    expect(lens.note).toBeNull(); // every question placed, all from the bank: nothing to caveat
  });

  it("E is its own row - never folded into D", () => {
    const lens = deriveSectionLens(resp([row(1, 5, 5, { section: "D" }), row(2, 4, 4, { section: "E" })]))!;
    expect(lens.rows.map((r) => r.section)).toEqual(["D", "E"]);
  });

  it("no section on any question -> no lens (never guessed from the marks)", () => {
    expect(deriveSectionLens(resp([row(1, 1, 1), row(2, 5, 3), row(3, 3, 3)]))).toBeNull();
    expect(deriveSectionLens(null)).toBeNull();
  });

  it("a question without a section stays out of the table and the note says so; not-graded rows are skipped", () => {
    const lens = deriveSectionLens(
      resp([row(1, 2, 1, { section: "B" }), row(2, 3, 3), { qNumber: 3, couldNotRead: true, totalMarks: 5, section: "D" }]),
    )!;
    expect(lens.rows.map((r) => r.section)).toEqual(["B"]);
    expect(lens.note).toContain("1 question has no section on record");
  });

  it("a paper-read section says so; an inferred one carries the check flag and its explanation", () => {
    const lens = deriveSectionLens(
      resp([
        row(1, 1, 1, { section: "A", sectionBasis: "read" }),
        row(2, 3, 2, { section: "C", sectionBasis: "check" }),
      ]),
    )!;
    expect(lens.rows.find((r) => r.section === "A")!.check).toBe(false);
    expect(lens.rows.find((r) => r.section === "C")!.check).toBe(true);
    expect(lens.note).toContain("Sections as read from your paper.");
    expect(lens.note).toContain("check");
  });
});

describe("deriveTypeLens", () => {
  it("uses the bank format, in a fixed order, and only where the type is known", () => {
    const lens = deriveTypeLens(
      resp([
        row(1, 1, 1, { format: "MCQ" }),
        row(2, 1, 0, { format: "Assertion-Reasoning" }),
        row(3, 4, 3, { format: "Case-Based" }),
        row(4, 3, 3, { format: "Short" }),
        row(5, 2, 2), // no type on record
      ]),
    )!;
    expect(lens.rows.map((r) => r.key)).toEqual(["mcq", "ar", "short", "case"]);
    expect(lens.rows[1]).toMatchObject({ label: "Assertion-Reason", awarded: 0, total: 1, lost: 1 });
    expect(lens.note).toContain("1 question has no type on record");
  });

  it("Answer Checker: only MCQ / A-R vs Written, labelled as read from the paper", () => {
    const lens = deriveTypeLens(resp([row(1, 1, 0, { format: "objective" }), row(2, 3, 2, { format: "written" })]))!;
    expect(lens.rows.map((r) => r.label)).toEqual(["MCQ / Assertion-Reason", "Written"]);
    expect(lens.note).toContain("As read from your paper");
  });

  it("is omitted for a single question, one type, or no known type (a breakdown of one is not a breakdown)", () => {
    expect(deriveTypeLens(resp([row(1, 3, 2, { format: "written" })]))).toBeNull();
    expect(deriveTypeLens(resp([row(1, 3, 2, { format: "Short" }), row(2, 3, 3, { format: "Short" })]))).toBeNull();
    expect(deriveTypeLens(resp([row(1, 3, 2), row(2, 3, 3)]))).toBeNull();
  });

  it("never invents a type: an unknown format string is not a type", () => {
    expect(typeKeyOf("Proof")).toBeNull();
    expect(typeKeyOf(undefined)).toBeNull();
    expect(readTypeOf(undefined)).toBeNull();
    expect(readTypeOf(true)).toBe("objective");
    expect(readTypeOf(false)).toBe("written");
  });
});

describe("stampLens / stampFromPaper", () => {
  it("fills gaps only: a row's own stamp wins, marks and steps are untouched", () => {
    const base = resp([row(1, 1, 1, { section: "B", sectionBasis: "read" }), row(2, 3, 2)]);
    const out = stampLens(base, () => ({ section: "A", sectionBasis: "bank", format: "MCQ" }));
    expect(out.results[0].section).toBe("B");
    expect(out.results[0].sectionBasis).toBe("read");
    expect(out.results[1]).toMatchObject({ section: "A", sectionBasis: "bank", format: "MCQ", marksAwarded: 2, totalMarks: 3 });
    expect(base.results[1].section).toBeUndefined(); // pure: the input is not mutated
  });

  it("returns the SAME object when nothing is stamped", () => {
    const base = resp([row(1, 1, 1)]);
    expect(stampLens(base, () => null)).toBe(base);
  });

  it("the paper's BANK section wins over its blueprint slot; the slot is a fallback only when allowed", () => {
    const base = resp([row(1, 4, 4), row(2, 5, 5)]);
    const qs = [
      { qNumber: 1, section: "D", bankSection: "E", format: "Case-Based" }, // CT slots a 4-mark case row in D
      { qNumber: 2, section: "D" },
    ];
    const strict = stampFromPaper(base, qs, { blueprintFallback: false });
    expect(strict.results[0]).toMatchObject({ section: "E", format: "Case-Based" });
    expect(strict.results[1].section).toBeUndefined();
    const loose = stampFromPaper(base, qs, { blueprintFallback: true });
    expect(loose.results[1].section).toBe("D");
  });
});
