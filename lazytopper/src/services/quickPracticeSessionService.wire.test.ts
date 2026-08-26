// @vitest-environment node
//
// ════════════════════════════════════════════════════════════════════════════
// WIRE-2 — the two things that must not go silently wrong when Quick Practice
// flips to batch grading: THE MI FEED (§4a) and THE 402 (§4b).
// ════════════════════════════════════════════════════════════════════════════
//
// ★★ WHY THESE TWO GET THEIR OWN SUITE. Both are SILENT failures. If the batched path
// stops feeding Mistake Intelligence, nothing throws, nothing type-errors and no gate
// goes red — Quick Practice, the highest-traffic surface, simply stops feeding the store
// the tutor reads. If the 402 stays swallowed by the unconditional catch, a
// free-past-trial student presses Finish and gets silence. Neither is visible in a diff.
//
// ★ EVERY ASSERTION HERE IS POSITIVE. "MI was fed" is asserted as the exact calls with
// the exact question ids, not as `not.toThrow()`.
//
// ★★ WHAT THIS SUITE DOES NOT PROVE, stated so it is not misread. It does not prove a
// real batched request reaches Gemini: `isStubMode()` returns before `buildUploadParts`,
// so #578's interleave has never executed against a real key. That needs the owner's
// live run (see the lane report).

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../ai/aiClient";
import type * as MistakeIntelligenceModule from "./mistakeIntelligence";
import type * as PracticeInsightsModule from "./practiceInsights";

// The MI front door and its score twin — the ONE ingestion pair every graded surface
// routes through. Spied, never replaced with an invented door: a test that asserted a
// bespoke writer would pass while the real store went dark.
const recordMistake = vi.fn<typeof MistakeIntelligenceModule.recordMistake>(async () => ({
  outcome: "logged" as const,
  bridged: false,
}));
const recordAttempt = vi.fn<typeof PracticeInsightsModule.recordAttempt>(() => "recorded" as const);

vi.mock("./mistakeIntelligence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./mistakeIntelligence")>();
  return { ...actual, recordMistake };
});
vi.mock("./practiceInsights", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./practiceInsights")>();
  return { ...actual, recordAttempt };
});

const { gradeQuickPracticeBatch } = await import("./quickPracticeSessionService");

type SavedAnswer = Parameters<typeof gradeQuickPracticeBatch>[0]["answers"][number];
type Grader = NonNullable<Parameters<typeof gradeQuickPracticeBatch>[0]["grade"]>;

const IMG = "BASE64IMAGEDATA";
const USER = { uid: "student-1", isLocalSession: false } as unknown as NonNullable<
  Parameters<typeof gradeQuickPracticeBatch>[0]["user"]
>;

const q = (qNumber: number, over: Partial<SavedAnswer> = {}): SavedAnswer => ({
  questionId: `bank-${qNumber}`,
  qNumber,
  marks: 3,
  questionText: `Question ${qNumber}`,
  topicLabel: "Arithmetic Progressions",
  topicKey: "arithmetic-progressions",
  ...over,
});

const grade = (qNumber: number, over: Partial<WorksheetQuestionGrade> = {}): WorksheetQuestionGrade => ({
  qNumber,
  couldNotRead: false,
  ok: true,
  totalMarks: 3,
  marksAwarded: 2,
  percentage: 67,
  annotatedSteps: [],
  mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
  teacherNote: "Method right, arithmetic slipped.",
  ...over,
});

const okResponse = (results: WorksheetQuestionGrade[]): WorksheetGradeResponse => ({
  ok: true,
  results,
  totalQuestions: results.length,
  gradedCount: results.length,
  pendingCount: 0,
  gradedMarksAwarded: results.reduce((s, r) => s + (Number(r.marksAwarded) || 0), 0),
  gradedMarksTotal: results.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0),
  worksheetTotalMarks: results.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0),
});

beforeEach(() => {
  recordMistake.mockClear();
  recordAttempt.mockClear();
});

// ---------------------------------------------------------------------------
// 8 · ★★ THE BATCHED PATH FEEDS MISTAKE INTELLIGENCE (§4a — the moat)
// ---------------------------------------------------------------------------
describe("8 · MI is fed BY THE BATCHED PATH", () => {
  it("★★ every legible batched answer goes through recordMistake AND recordAttempt", async () => {
    const grader = vi.fn<Grader>(async () => okResponse([grade(2), grade(5, { marksAwarded: 0, totalMarks: 1 })]));

    const out = await gradeQuickPracticeBatch({
      worksheetId: "qp-1",
      subject: "maths",
      user: USER,
      grade: grader,
      answers: [
        q(2, { imageBase64: IMG }),
        q(5, { marks: 1, objective: true, imageBase64: IMG, pickedOption: "(b)", pickedCorrect: false }),
      ],
    });

    expect(out.outcome).toBe("graded");
    // POSITIVE: the front door was called once per legible answer…
    expect(recordMistake).toHaveBeenCalledTimes(2);
    expect(recordAttempt).toHaveBeenCalledTimes(2);
    // …with the BARE BANK ID, not a namespaced one. A `qp:`-style id would orphan the
    // dedup against everything Quick Practice has already recorded AND break
    // `buildSeenQuestionIds`, which reads questionId off the attempts stream.
    expect(recordMistake.mock.calls.map((c) => c[2].questionId)).toEqual(["bank-2", "bank-5"]);
    expect(recordAttempt.mock.calls.map((c) => c[1].questionId)).toEqual(["bank-2", "bank-5"]);
    // …carrying the real marks, so accuracy is fed too (not just the mistake log).
    expect(recordAttempt.mock.calls[0][1]).toMatchObject({
      marksScored: 2, marksAvailable: 3, mode: "graded", topicKey: "arithmetic-progressions",
    });
    // …and reported back, so a blackout is observable from the caller.
    expect(out.miOutcomes.map((m) => m.questionId)).toEqual(["bank-2", "bank-5"]);
  });

  it("★ CONTROL: a session with NOTHING batched feeds MI nothing — the spy proves it can fire", async () => {
    const grader = vi.fn<Grader>(async () => okResponse([]));
    const out = await gradeQuickPracticeBatch({
      worksheetId: "qp-2",
      subject: "maths",
      user: USER,
      grade: grader,
      answers: [q(1, { marks: 1, pickedOption: "(a)", pickedCorrect: true })],
    });
    expect(out.outcome).toBe("skipped-nothing-to-batch");
    expect(grader).not.toHaveBeenCalled();
    expect(recordMistake).not.toHaveBeenCalled();
    expect(recordAttempt).not.toHaveBeenCalled();
    expect(out.miOutcomes).toEqual([]);
  });

  it("★ an answer the grader COULD NOT READ feeds MI nothing — a 0 is never recorded for it", async () => {
    const grader = vi.fn<Grader>(async () =>
      okResponse([grade(2), { qNumber: 3, couldNotRead: true, totalMarks: 3 }]),
    );
    const out = await gradeQuickPracticeBatch({
      worksheetId: "qp-3",
      subject: "maths",
      user: USER,
      grade: grader,
      answers: [q(2, { imageBase64: IMG }), q(3, { imageBase64: IMG })],
    });
    expect(out.outcome).toBe("graded");
    // POSITIVE on both sides: Q2 was fed, Q3 was not.
    expect(recordMistake.mock.calls.map((c) => c[2].questionId)).toEqual(["bank-2"]);
    expect(out.entries[1].graded).toBeUndefined();
  });

  it("★ a signed-out session issues the call but writes no MI (the front door's own policy)", async () => {
    const grader = vi.fn<Grader>(async () => okResponse([grade(2)]));
    recordMistake.mockResolvedValueOnce({ outcome: "skipped-no-user", bridged: false });
    const out = await gradeQuickPracticeBatch({
      worksheetId: "qp-4",
      subject: "maths",
      user: null,
      grade: grader,
      answers: [q(2, { imageBase64: IMG })],
    });
    expect(out.calls).toBe(1);
    // The door is still the ONE door — it is called and IT refuses, rather than this
    // module re-implementing the signed-out rule and drifting from it.
    expect(recordMistake).toHaveBeenCalledTimes(1);
    expect(recordMistake.mock.calls[0][0]).toBeNull();
    expect(out.miOutcomes[0].mistakeOutcome).toBe("skipped-no-user");
  });
});

// ---------------------------------------------------------------------------
// 9 · ★★ THE 402 REACHES THE CALLER (§4b)
// ---------------------------------------------------------------------------
describe("9 · a 402 is carried out, not swallowed", () => {
  /** The real `PremiumRequiredError` shape, built without importing aiClient as a VALUE
   *  — the detection is by `err.name`, exactly as the production branch reads it. */
  const premiumError = () => {
    const err = new Error("This is a Premium feature. You can unlock it whenever you're ready.");
    err.name = "PremiumRequiredError";
    return Object.assign(err, { feature: "grade_worksheet", tier: "free", trialEndedAt: "2026-08-01" });
  };

  it("★★ a 402 comes back as skipped-premium-required WITH the server's own fields", async () => {
    const grader = vi.fn<Grader>(async () => { throw premiumError(); });
    const out = await gradeQuickPracticeBatch({
      worksheetId: "qp-5",
      subject: "maths",
      user: USER,
      grade: grader,
      answers: [q(2, { imageBase64: IMG }), q(1, { marks: 1, pickedOption: "(a)", pickedCorrect: true })],
    });

    expect(out.outcome).toBe("skipped-premium-required");
    expect(out.premiumRequired).toEqual({ feature: "grade_worksheet", trialEndedAt: "2026-08-01" });
    // ★ AND EVERYTHING SCORED FOR FREE SURVIVES. A student who meets the boundary keeps
    // their MCQ marks — the refusal costs them nothing they had already earned.
    expect(out.entries.find((e) => e.questionId === "bank-1")?.mcq).toBe("correct");
    // ★ NOTHING IS FABRICATED for the answer that was never graded.
    expect(out.entries.find((e) => e.questionId === "bank-2")?.graded).toBeUndefined();
    // ★ AND NO MI WRITE — there is no grade to classify.
    expect(recordMistake).not.toHaveBeenCalled();
  });

  it("★ CONTROL: an ordinary failure is STILL skipped-error and carries no premium payload", async () => {
    const grader = vi.fn<Grader>(async () => { throw new Error("network down"); });
    const out = await gradeQuickPracticeBatch({
      worksheetId: "qp-6",
      subject: "maths",
      user: USER,
      grade: grader,
      answers: [q(2, { imageBase64: IMG })],
    });
    expect(out.outcome).toBe("skipped-error");
    expect(out.premiumRequired).toBeUndefined();
    expect(out.error).toBe("network down");
  });

  it("★ the two are DISTINGUISHABLE — the outcome, not the message, is what the caller branches on", async () => {
    const premium = await gradeQuickPracticeBatch({
      worksheetId: "qp-7", subject: "maths", user: USER,
      grade: vi.fn<Grader>(async () => { throw premiumError(); }),
      answers: [q(2, { imageBase64: IMG })],
    });
    const outage = await gradeQuickPracticeBatch({
      worksheetId: "qp-8", subject: "maths", user: USER,
      grade: vi.fn<Grader>(async () => { throw new Error("500"); }),
      answers: [q(2, { imageBase64: IMG })],
    });
    expect(premium.outcome).not.toBe(outage.outcome);
  });
});

// ---------------------------------------------------------------------------
// 9 · ★★★ OBJECTIVE-ANSWER-NOT-SENT — SITE 2 OF 2: WHAT MISTAKE INTELLIGENCE STORES
//
// The MI loop re-derives its own grade rather than reading `entries`, so the local
// objective mark has to be applied THERE as well as at the render join. Had this fix
// landed in `PracticePage` instead, the screen would read correctly while `recordAttempt`
// wrote the model's wrong mark into the store the tutor reads — permanently, and with
// nothing anywhere to show it. A RENDER SITE IS NOT A PRODUCTION SITE.
// ---------------------------------------------------------------------------
describe("9 · the objective mark reaching MI is the LOCAL one", () => {
  const mcq = (qNumber: number, over: Partial<SavedAnswer> = {}): SavedAnswer =>
    q(qNumber, {
      marks: 1, section: "A", format: "mcq", objective: true,
      options: ["2", "root 2"], answer: "root 2", ...over,
    });

  it("★★★ recordAttempt stores FULL marks for a correct pick the model marked down", async () => {
    // The model returns 2 of 3 — wrong in value AND denominator for a 1-mark MCQ.
    const grader = vi.fn<Grader>(async () => okResponse([grade(1)]));
    await gradeQuickPracticeBatch({
      worksheetId: "qp-obj-1", subject: "maths", user: USER, grade: grader,
      answers: [mcq(1, { pickedOption: "root 2", pickedCorrect: true, imageBase64: IMG })],
    });
    expect(recordAttempt).toHaveBeenCalledTimes(1);
    expect(recordAttempt.mock.calls[0][1]).toMatchObject({
      questionId: "bank-1", marksScored: 1, marksAvailable: 1, mode: "graded",
    });
  });

  it("★★ recordAttempt stores 0 for a wrong pick the model marked CORRECT", async () => {
    const grader = vi.fn<Grader>(async () => okResponse([grade(1, { marksAwarded: 3, percentage: 100 })]));
    await gradeQuickPracticeBatch({
      worksheetId: "qp-obj-2", subject: "maths", user: USER, grade: grader,
      answers: [mcq(1, { pickedOption: "2", pickedCorrect: false, imageBase64: IMG })],
    });
    expect(recordAttempt.mock.calls[0][1]).toMatchObject({ marksScored: 0, marksAvailable: 1 });
  });

  it("★ recordMistake receives the LOCAL mark too — one grade object feeds both sinks", async () => {
    const grader = vi.fn<Grader>(async () => okResponse([grade(1)]));
    await gradeQuickPracticeBatch({
      worksheetId: "qp-obj-3", subject: "maths", user: USER, grade: grader,
      answers: [mcq(1, { pickedOption: "root 2", pickedCorrect: true, imageBase64: IMG })],
    });
    expect(recordMistake.mock.calls[0][1]).toMatchObject({ marksAwarded: 1, totalMarks: 1 });
  });

  it("★ an UNRESOLVABLE pick writes NOTHING to MI (with the control that DOES write)", async () => {
    // No pick recorded ⇒ no grade ⇒ no MI write, exactly as couldNotRead behaves.
    // Recording a 0 would be the fabrication the module header forbids.
    const grader = vi.fn<Grader>(async () => okResponse([grade(1)]));
    await gradeQuickPracticeBatch({
      worksheetId: "qp-obj-4", subject: "maths", user: USER, grade: grader,
      answers: [mcq(1, { imageBase64: IMG })],
    });
    expect(recordAttempt).not.toHaveBeenCalled();
    expect(recordMistake).not.toHaveBeenCalled();
    // CONTROL — same spies, same shape, a pick present: they DO fire.
    await gradeQuickPracticeBatch({
      worksheetId: "qp-obj-5", subject: "maths", user: USER, grade: grader,
      answers: [mcq(1, { pickedOption: "root 2", pickedCorrect: true, imageBase64: IMG })],
    });
    expect(recordAttempt).toHaveBeenCalledTimes(1);
    expect(recordMistake).toHaveBeenCalledTimes(1);
  });

  it("★★ a SUBJECTIVE answer still stores the model's marks, unchanged", async () => {
    const grader = vi.fn<Grader>(async () => okResponse([grade(1)]));
    await gradeQuickPracticeBatch({
      worksheetId: "qp-obj-6", subject: "maths", user: USER, grade: grader,
      answers: [q(1, { imageBase64: IMG })],
    });
    expect(recordAttempt.mock.calls[0][1]).toMatchObject({ marksScored: 2, marksAvailable: 3 });
  });
});
