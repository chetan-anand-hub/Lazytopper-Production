import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import {
  isGradedQuestion,
  questionChipType,
  type GradedQuestionLike,
} from "../../lib/mistakeDisplay";

/**
 * PARENT-REPORT-1 — server/routes/parentReport.cjs carries a CJS MIRROR of the scorecard's
 * one slip picker (lib/mistakeDisplay `questionChipType` / `isGradedQuestion`), because the
 * server cannot import TS. This suite runs BOTH over the same fixtures and fails the moment they
 * disagree, so a parent can never see a different mistake type from the one the student's
 * scorecard showed for the same question.
 */
const require = createRequire(import.meta.url);
const server = require("../../../server/routes/parentReport.cjs") as {
  chipTypeOf: (q: unknown) => string | null;
  isGraded: (q: unknown) => boolean;
  slipsFrom: (results: unknown[]) => Array<{ q: number; awarded: number; available: number; type: string | null }>;
};

const V2 = (over: Partial<Record<string, number>>) => ({
  conceptual: 0,
  calculation: 0,
  silly: 0,
  presentation: 0,
  unattempted: 0,
  untyped: 0,
  ...over,
});

const FIXTURES: Array<GradedQuestionLike & { qNumber: number; name: string }> = [
  { name: "full marks", qNumber: 1, totalMarks: 3, marksAwarded: 3, mistakeSummary: { conceptual: 1 } },
  { name: "count-only conceptual", qNumber: 2, totalMarks: 3, marksAwarded: 1, mistakeSummary: { conceptual: 1, silly: 1 } },
  { name: "count tie → knowledge first", qNumber: 3, totalMarks: 2, marksAwarded: 0, mistakeSummary: { silly: 1, conceptual: 1 } },
  { name: "tie technique before careless", qNumber: 4, totalMarks: 2, marksAwarded: 0, mistakeSummary: { calculation: 1, presentation: 1 } },
  {
    name: "steps beat summary",
    qNumber: 5,
    totalMarks: 3,
    marksAwarded: 1,
    mistakeSummary: { conceptual: 1 },
    annotatedSteps: [
      { status: "incorrect", mistakeType: "calculation" },
      { status: "partial", mistakeType: "calculation" },
    ],
  },
  {
    name: "not-attempted / withdrawn steps are not counted",
    qNumber: 6,
    totalMarks: 3,
    marksAwarded: 1,
    annotatedSteps: [
      { status: "missing", mistakeType: "conceptual" },
      { status: "withdrawn", mistakeType: "conceptual" },
      { status: "incorrect", mistakeType: "silly" },
    ],
  },
  { name: "v2 marks decide", qNumber: 7, totalMarks: 4, marksAwarded: 1, mistakeSummary: { conceptual: 3 }, marksLostByType: V2({ conceptual: 1, presentation: 2 }) },
  { name: "v2 over the loss → counts", qNumber: 8, totalMarks: 2, marksAwarded: 1, mistakeSummary: { silly: 1 }, marksLostByType: V2({ conceptual: 2 }) },
  { name: "v2 malformed → counts", qNumber: 9, totalMarks: 2, marksAwarded: 0, mistakeSummary: { calculation: 1 }, marksLostByType: { conceptual: "1" } as unknown as Record<string, number> },
  { name: "v2 only unattempted → null", qNumber: 10, totalMarks: 2, marksAwarded: 0, marksLostByType: V2({ unattempted: 2 }) },
  { name: "could not read", qNumber: 11, totalMarks: 3, marksAwarded: 0, couldNotRead: true, mistakeSummary: { conceptual: 1 } },
  { name: "answer mismatch", qNumber: 12, totalMarks: 3, marksAwarded: 0, answerMismatch: true },
  { name: "unread option", qNumber: 13, totalMarks: 1, marksAwarded: 0, objectiveResolved: false },
  { name: "not graded (timeout)", qNumber: 14, totalMarks: 3, marksAwarded: 0, notGraded: "timeout" },
  { name: "unknown notGraded reason", qNumber: 15, totalMarks: 3, marksAwarded: 0, notGraded: "brand-new" as unknown as "error" },
  { name: "wrong MCQ, no type", qNumber: 16, totalMarks: 1, marksAwarded: 0, objective: true },
  { name: "half marks", qNumber: 17, totalMarks: 2, marksAwarded: 1.5, mistakeSummary: { presentation: 1 } },
  { name: "answerMismatch null = graded", qNumber: 18, totalMarks: 2, marksAwarded: 1, answerMismatch: null, mistakeSummary: { silly: 2, calculation: 1 } },
];

describe("parentReport.cjs mirrors lib/mistakeDisplay — the slip picker", () => {
  for (const f of FIXTURES) {
    it(`${f.name}: isGraded and chip type agree`, () => {
      expect(server.isGraded(f)).toBe(isGradedQuestion(f));
      expect(server.chipTypeOf(f)).toBe(questionChipType(f));
    });
  }

  it("CONTROL: the fixtures exercise every outcome (null, each group, not graded)", () => {
    const types = new Set(FIXTURES.map((f) => questionChipType(f)));
    for (const t of [null, "conceptual", "presentation", "calculation", "silly"]) expect(types.has(t as never), String(t)).toBe(true);
    expect(FIXTURES.some((f) => !isGradedQuestion(f))).toBe(true);
  });

  it("slips: graded questions that lost marks only, biggest loss first, at most three, numbers + type only", () => {
    const slips = server.slipsFrom(FIXTURES);
    expect(slips.length).toBe(3);
    for (const s of slips) expect(Object.keys(s).sort()).toEqual(["available", "awarded", "q", "type"]);
    expect(slips.map((s) => s.q)).toEqual([7, 2, 3]);
    expect(slips[0]).toEqual({ q: 7, awarded: 1, available: 4, type: "presentation" });
  });
});
