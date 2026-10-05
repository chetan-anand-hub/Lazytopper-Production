/**
 * tutorRoundTrip — CONTRACT (SCORECARD-MI-1 PR-2, H6/H8). THE REPLACEMENT PROTECTION for the
 * lifted blanket ban on `tutorRoundTrip.ts` in `quick_practice_overlay_additive_acceptance.mjs`
 * (owner ruling 2026-10-05: "taxonomy and wording", "marks not counts"). It ENDS the documented
 * transitional Tutor contradiction (W6): the openers used the pre-ruling "method vs
 * presentation-led" split while every other surface used the owner's groups.
 *
 * What this file now pins on the file's NEW behaviour:
 *   - the root cause is named in the OWNER'S groups (lib/mistakeDisplay): calculation and silly
 *     are CARELESS ("you already know this"), presentation is EXAM TECHNIQUE, conceptual is a
 *     KNOWLEDGE GAP — in MARKS when the record carries v2 marks, else in counts;
 *   - not attempted is never a mistake: a v2 "unattempted" step is never quoted as the fault, and
 *     a record whose biggest loss was not attempted says so without calling it an error;
 *   - a crossed-out ("withdrawn") step is NEVER quoted, and never reaches the model's digest;
 *   - the honest floor is unchanged (the thin opener's no-marks line; the clean-set rules).
 */
import { describe, it, expect } from "vitest";
import {
  buildReturnedWork,
  composeCheckImproveRichReturnOpener,
  composePracticeRecordReturnOpener,
  composeReturnOpener,
} from "./tutorRoundTrip";
import type { SessionRecord, SessionPerQuestionPayload } from "../../services/sessionRecords";
import type { CheckSolutionAnnotatedStep, WorksheetGradeResponse } from "../../ai/aiClient";

const record = (over: Partial<SessionRecord> = {}): SessionRecord => ({
  id: "CI-M-REAL-01",
  worksheetId: "ci:CI-M-REAL-01",
  surface: "check-improve",
  title: "Real Numbers",
  subject: "maths",
  topicKeys: ["real-numbers"],
  questionIds: [],
  marksAwarded: 3,
  marksTotal: 5,
  status: "graded",
  fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  sectionBreakdown: null,
  gradedAt: 2000,
  perQuestionRef: "ci:CI-M-REAL-01",
  dedupKey: "u::CI-M-REAL-01",
  ...over,
});
const v2 = (m: Record<string, number>) => ({
  marksLostByType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0, ...m },
  marksLostByTypeVersion: 1 as const,
});
const step = (over: Partial<CheckSolutionAnnotatedStep> = {}): CheckSolutionAnnotatedStep =>
  ({
    stepNumber: 1,
    description: "Apply Euclid's lemma",
    studentWork: "404 = 96 × 4 + 20",
    status: "incorrect",
    marksAwarded: 0,
    marksDeducted: 1,
    teacherAnnotation: "The remainder is 20, then divide 96 by 20.",
    mistakeType: "calculation",
    correctedWorking: null,
    ...over,
  }) as CheckSolutionAnnotatedStep;
const response = (steps: CheckSolutionAnnotatedStep[], extra: Record<string, unknown> = {}): WorksheetGradeResponse =>
  ({
    ok: true,
    results: [{ qNumber: 1, couldNotRead: false, ok: true, totalMarks: 5, marksAwarded: 3, percentage: 60, annotatedSteps: steps, ...extra }],
    totalQuestions: 1,
    gradedCount: 1,
    pendingCount: 0,
    gradedMarksAwarded: 3,
    gradedMarksTotal: 5,
    worksheetTotalMarks: 5,
  }) as unknown as WorksheetGradeResponse;
const payload = (steps: CheckSolutionAnnotatedStep[]): SessionPerQuestionPayload => ({
  ref: "qp:X", code: "X", worksheetId: "qp:X", surface: "quick-practice", gradedAt: 2000, response: response(steps),
});

describe("H6 — the root cause is named in the OWNER'S groups", () => {
  it("★ a calculation-led record is CARELESS — 'you already know this', never a method fault", () => {
    const o = composeCheckImproveRichReturnOpener(record({ fourType: { conceptual: 0, calculation: 2, silly: 0, presentation: 0 } }), response([step()]), "Real Numbers");
    expect(o!.text).toMatch(/slipped in the working/);
    expect(o!.text).toMatch(/You already know this/);
    expect(o!.text).not.toMatch(/method itself/);
  });

  it("★ silly is CARELESS too, never 'presentation' (the pre-ruling presentation-led bucket)", () => {
    const o = composeReturnOpener(record({ fourType: { conceptual: 0, calculation: 0, silly: 2, presentation: 0 } }), "Real Numbers");
    expect(o.text).toMatch(/slipped in the working/);
    expect(o.text).not.toMatch(/presentation/);
  });

  it("presentation is EXAM TECHNIQUE — not your maths", () => {
    const o = composePracticeRecordReturnOpener(record({ fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 2 } }), payload([step()]), "Real Numbers");
    expect(o!.text).toMatch(/presentation, not your maths/);
  });

  it("conceptual is a KNOWLEDGE GAP — the method itself", () => {
    const o = composeReturnOpener(record({ fourType: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 } }), "Real Numbers");
    expect(o.text).toMatch(/method itself/);
  });

  it("★ MARKS decide when the record carries v2 marks (B7): 1.5 knowledge marks beat 1 careless mark, whatever the counts", () => {
    const rec = record({ fourType: { conceptual: 1, calculation: 3, silly: 0, presentation: 0 }, ...v2({ conceptual: 1.5, calculation: 0.5 }) });
    expect(composeReturnOpener(rec, "Real Numbers").text).toMatch(/method itself/);
  });

  it("★ not attempted is its own answer, never a mistake", () => {
    const rec = record({ ...v2({ unattempted: 2 }) });
    const o = composeReturnOpener(rec, "Real Numbers");
    expect(o.text).toMatch(/didn't attempt — that's not a mistake/);
  });
});

describe("H8 — crossed-out work and not-attempted steps are never quoted as the fault", () => {
  it("★ a withdrawn (crossed-out) step is NEVER quoted — the next real fault is", () => {
    const steps = [
      step({ stepNumber: 1, status: "withdrawn" as CheckSolutionAnnotatedStep["status"], description: "Struck attempt", teacherAnnotation: "Crossed out." }),
      step({ stepNumber: 2, description: "Real fault", teacherAnnotation: "Divide again." }),
    ];
    const o = composeCheckImproveRichReturnOpener(record({ fourType: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 } }), response(steps), "Real Numbers");
    expect(o!.text).toContain("Real fault");
    expect(o!.text).not.toContain("Struck attempt");
    expect(o!.text).not.toContain("Crossed out.");
  });

  it("★ a v2 'unattempted' step is not phrased as a fault", () => {
    const steps = [step({ stepNumber: 1, status: "unattempted" as CheckSolutionAnnotatedStep["status"], description: "Part (b)", teacherAnnotation: "Not answered." })];
    expect(composeCheckImproveRichReturnOpener(record(), response(steps), "Real Numbers")).toBeNull();
  });

  it("a withdrawn step never reaches the model's digest", () => {
    const steps = [
      step({ stepNumber: 1, status: "withdrawn" as CheckSolutionAnnotatedStep["status"], description: "Struck attempt" }),
      step({ stepNumber: 2, status: "correct", description: "Kept working" }),
    ];
    const work = buildReturnedWork({ question: { text: "Q", imageBase64: null }, response: response(steps), includeDigest: true });
    expect(work?.steps?.map((s) => s.description)).toEqual(["Kept working"]);
  });

  it("CONTROL — a question that was NOT graded gives no fault to quote", () => {
    const o = composeCheckImproveRichReturnOpener(record(), response([step()], { answerMismatch: true }), "Real Numbers");
    expect(o).toBeNull();
  });
});

describe("the honest floor is unchanged", () => {
  it("no marks on the record → the generic thin opener, byte for byte", () => {
    const o = composeReturnOpener(record({ marksAwarded: undefined as unknown as number }), "Real Numbers");
    expect(o.text).toBe("You're back with your graded Real Numbers sheet. Want to go through where it slipped, together?");
  });
});
