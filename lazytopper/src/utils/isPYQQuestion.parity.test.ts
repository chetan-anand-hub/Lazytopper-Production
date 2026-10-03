// @vitest-environment node
/**
 * PARITY — BANK-SPLIT-1 PR-2 (L1, ruling R2). Chapter Test and Full Mock now import the
 * bank-free `utils/isPYQQuestion`; the original in data/practiceSetGenerator.ts stays (that
 * file is frozen) and is not re-exported. Two copies of one predicate must never drift:
 * they must agree on every fixture shape and on every bank row.
 */
import { describe, it, expect } from "vitest";
import { isPYQQuestion } from "./isPYQQuestion";
import { isPYQQuestion as originalIsPYQQuestion } from "../data/practiceSetGenerator";
import { RAW_CANONICAL_QUESTION_BANK } from "../data/canonicalQuestionBank";
import { predictedQuestions } from "../data/predictedQuestions";
import { predictedQuestionsScience } from "../data/predictedQuestionsScience";

const FIXTURES: Array<[string, unknown, boolean]> = [
  ["null", null, false],
  ["undefined", undefined, false],
  ["a string", "PYQ", false],
  ["a number", 2023, false],
  ["empty object", {}, false],
  ["isPYQ true", { isPYQ: true }, true],
  ["isPYQ truthy but not true", { isPYQ: "yes" }, false],
  ["isPYQ false, no year", { isPYQ: false }, false],
  ["pyqYear string", { pyqYear: "2023" }, true],
  ["pyqYear paper code", { pyqYear: "30/1/1" }, true],
  ["pyqYear blank string", { pyqYear: "   " }, false],
  ["pyqYear empty string", { pyqYear: "" }, false],
  ["pyqYear number", { pyqYear: 2024 }, true],
  ["pyqYear NaN", { pyqYear: Number.NaN }, false],
  ["pyqYear Infinity", { pyqYear: Number.POSITIVE_INFINITY }, false],
  ["pyqYear null", { pyqYear: null }, false],
  ["isPYQ false but pyqYear set", { isPYQ: false, pyqYear: "2022" }, true],
  ["an array", [], false],
];

describe("isPYQQuestion — the bank-free copy agrees with the original", () => {
  it.each(FIXTURES)("fixture: %s", (_name, input, expected) => {
    expect(isPYQQuestion(input)).toBe(expected);
    expect(originalIsPYQQuestion(input)).toBe(expected);
  });

  it("agrees on every bank row (RAW, withheld included) and every predicted row", () => {
    const rows: unknown[] = [...RAW_CANONICAL_QUESTION_BANK, ...predictedQuestions, ...predictedQuestionsScience];
    const disagree = rows.filter((q) => isPYQQuestion(q) !== originalIsPYQQuestion(q));
    expect(disagree).toEqual([]);
    // Non-vacuous: the bank holds both PYQ and non-PYQ rows.
    const pyq = rows.filter((q) => isPYQQuestion(q)).length;
    expect(pyq).toBeGreaterThan(0);
    expect(pyq).toBeLessThan(rows.length);
    // eslint-disable-next-line no-console
    console.log(`IS_PYQ_PARITY: rows=${rows.length} pyq=${pyq} disagree=${disagree.length}`);
  });
});
