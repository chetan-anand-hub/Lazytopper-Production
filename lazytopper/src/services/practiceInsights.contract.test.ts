// @vitest-environment jsdom
/**
 * practiceInsights — CONTRACT (SCORECARD-MI-1 PR-2). THE REPLACEMENT PROTECTION for the lifted
 * blanket ban on `practiceInsights.ts` in `check_improve_convergence_acceptance.mjs`
 * (owner ruling 2026-10-05: "re-grade replaces"; "marks not counts"; "taxonomy and wording").
 *
 * What the ban was buying, and what this file now pins on the file's NEW behaviour:
 *   H1  ONE attempt per SUBMISSION — a re-grade of the same submission REPLACES its attempt
 *       (latest wins: the local store AND the Firestore doc id), the same outcome again writes
 *       nothing, a NEW submission adds one, and the score is never in the key;
 *   H11 an attempt whose every lost mark was NOT ATTEMPTED carries `notAttempted` — decided by
 *       the MI front door's own predicate, so the two never disagree;
 *   H7  the v2 marks ride the attempt ONLY versioned (an old / count-only attempt is never
 *       given marks), and the weak-area rule (`attemptWeakAreaOutcome`, GA-21) lets ONLY a
 *       knowledge-gap loss count against a chapter;
 *   the loop-closer drains a weakness once per submission, never twice on a re-grade.
 * Every assertion here has a mutation proven RED (SCORECARD-MI-1 PR-2 report).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const setDocCalls: Array<{ path: string; data: Record<string, unknown> }> = [];
vi.mock("./firebaseClient", () => ({ firestoreDb: { __mock: true } }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...segs: string[]) => ({ __type: "doc", path: segs.join("/") }),
  collection: (_db: unknown, ...segs: string[]) => ({ __type: "collection", path: segs.join("/") }),
  setDoc: async (ref: { path: string }, data: Record<string, unknown>) => {
    setDocCalls.push({ path: ref.path, data });
  },
  getDoc: async () => ({ exists: () => false }),
  where: () => ({}),
  query: () => ({}),
  getDocs: async () => ({ docs: [] }),
}));
const clearWrongAnswer = vi.fn();
const getWrongConceptsForTopic = vi.fn((topicKey: string) => [
  { topicKey, conceptKey: "euclid", count: 2, timestamp: 1 },
]);
vi.mock("./adaptivePracticeEngine", () => ({
  clearWrongAnswer: (...a: unknown[]) => clearWrongAnswer(...a),
  getWrongConceptsForTopic: (k: string) => getWrongConceptsForTopic(k),
}));

import { getAttempts, recordAttempt, type RecordAttemptContext } from "./practiceInsights";
import { gradeIdentityKey } from "./attemptDedupKey";
import { attemptWeakAreaOutcome } from "./attemptOutcome";
import { isLossOnlyNotAttempted, type GradedQuestionLike } from "../lib/mistakeDisplay";
import { setActiveProgressUser } from "./studentProgressStore";

const user = { uid: "u1" } as never;
const attemptDocs = () => setDocCalls.filter((c) => /^practiceInsights\/u1\/attempts\//.test(c.path));

const marks = (m: Partial<Record<"conceptual" | "calculation" | "silly" | "presentation" | "unattempted" | "untyped", number>>) => ({
  conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0, ...m,
});
const v2 = (total: number, awarded: number, m: Parameters<typeof marks>[0], steps: Array<{ status: string }> = []): GradedQuestionLike => ({
  totalMarks: total, marksAwarded: awarded, marksLostByType: marks(m), annotatedSteps: steps,
});

const ctx = (over: Partial<RecordAttemptContext> = {}): RecordAttemptContext => ({
  subject: "Maths",
  topic: "Real Numbers",
  question: "Find the HCF of 96 and 404.",
  questionId: "ws:ws-1:q1",
  marksScored: 0,
  marksAvailable: 3,
  mode: "graded",
  surface: "worksheet",
  submissionId: "ws-1",
  ...over,
});

beforeEach(() => {
  localStorage.clear();
  setDocCalls.length = 0;
  clearWrongAnswer.mockClear();
  setActiveProgressUser("u1");
});

describe("H1 — re-grade replaces: ONE attempt per submission, latest wins", () => {
  it("★ a re-grade of the SAME submission with a different score REPLACES the attempt (local + Firestore doc id)", () => {
    expect(recordAttempt(user, ctx({ marksScored: 1 }))).toBe("recorded");
    expect(recordAttempt(user, ctx({ marksScored: 3 }))).toBe("replaced");
    const all = getAttempts();
    expect(all).toHaveLength(1);
    expect(all[0].marksScored).toBe(3);
    const docs = attemptDocs();
    expect(docs).toHaveLength(2);
    expect(docs[1].path).toBe(docs[0].path);
    expect(docs[1].data.marksScored).toBe(3);
  });

  it("the doc id IS the submission identity — the score is never in it", () => {
    recordAttempt(user, ctx({ marksScored: 2 }));
    const id = gradeIdentityKey("u1", { surface: "worksheet", submissionId: "ws-1", questionId: "ws:ws-1:q1" })
      .replace(/[/.#$[\]\s]/g, "_");
    expect(attemptDocs()[0].path).toBe(`practiceInsights/u1/attempts/${id}`);
    expect(attemptDocs()[0].path).not.toMatch(/2_3/);
  });

  it("the same outcome again writes NOTHING (a cache-restore is a no-op)", () => {
    recordAttempt(user, ctx({ marksScored: 2 }));
    expect(recordAttempt(user, ctx({ marksScored: 2 }))).toBe("duplicate");
    expect(attemptDocs()).toHaveLength(1);
    expect(getAttempts()).toHaveLength(1);
  });

  it("CONTROL — a NEW submission (another worksheet) is a NEW attempt", () => {
    recordAttempt(user, ctx({ marksScored: 2 }));
    expect(recordAttempt(user, ctx({ marksScored: 2, submissionId: "ws-2", questionId: "ws:ws-2:q1" }))).toBe("recorded");
    expect(getAttempts()).toHaveLength(2);
  });

  it("the loop-closer drains a weakness ONCE per submission — never again on a re-grade of a correct one", () => {
    recordAttempt(user, ctx({ marksScored: 3, marksAvailable: 3 }));
    expect(clearWrongAnswer).toHaveBeenCalledTimes(1);
    // a re-grade of the same (already correct) submission: replaced, but nothing drained twice
    recordAttempt(user, ctx({ marksScored: 3, marksAvailable: 3, grade: v2(3, 3, {}) }));
    expect(clearWrongAnswer).toHaveBeenCalledTimes(1);
  });
});

describe("H11 — an attempt carries `notAttempted` (the MI front door's own predicate)", () => {
  it("★ a wholly unattempted v2 question carries notAttempted: true", () => {
    const grade = v2(3, 0, { unattempted: 3 }, [{ status: "unattempted" }]);
    expect(isLossOnlyNotAttempted(grade)).toBe(true);
    recordAttempt(user, ctx({ marksScored: 0, grade }));
    expect(getAttempts()[0].notAttempted).toBe(true);
  });

  it("CONTROL — an answer that lost marks to WORK carries no notAttempted", () => {
    recordAttempt(user, ctx({ marksScored: 2, grade: v2(3, 2, { calculation: 1 }) }));
    expect("notAttempted" in getAttempts()[0]).toBe(false);
  });
});

describe("H7 — v2 marks ride the attempt ONLY versioned; count-only grades are never given marks", () => {
  it("a v2 grade stores marksLostByType + version 1", () => {
    recordAttempt(user, ctx({ marksScored: 2, grade: v2(3, 2, { silly: 1 }) }));
    const a = getAttempts()[0];
    expect(a.marksLostByType).toEqual(marks({ silly: 1 }));
    expect(a.marksLostByTypeVersion).toBe(1);
  });

  it("CONTROL — a count-only (v1) grade stores neither", () => {
    recordAttempt(user, ctx({ marksScored: 2, grade: { totalMarks: 3, marksAwarded: 2, mistakeSummary: { silly: 1 } } }));
    const a = getAttempts()[0];
    expect("marksLostByType" in a).toBe(false);
    expect("marksLostByTypeVersion" in a).toBe(false);
  });
});

describe("GA-21 — only KNOWLEDGE-GAP marks count against a chapter (attemptWeakAreaOutcome)", () => {
  const withMarks = (scored: number, available: number, m: Parameters<typeof marks>[0]) => ({
    correct: scored >= available, marksScored: scored, marksAvailable: available,
    marksLostByType: marks(m), marksLostByTypeVersion: 1,
  });
  it("★ a careless-only loss is NOT a weakness (knows)", () => {
    expect(attemptWeakAreaOutcome(withMarks(2, 3, { calculation: 0.5, silly: 0.5 }))).toBe("knows");
  });
  it("★ an exam-technique-only loss is NOT a weakness (knows)", () => {
    expect(attemptWeakAreaOutcome(withMarks(2, 3, { presentation: 1 }))).toBe("knows");
  });
  it("CONTROL — a knowledge-gap loss IS a gap", () => {
    expect(attemptWeakAreaOutcome(withMarks(1, 3, { conceptual: 1, calculation: 1 }))).toBe("gap");
  });
  it("nothing attempted, or a loss with no recorded reason, is not evidence either way (skip)", () => {
    expect(attemptWeakAreaOutcome({ ...withMarks(0, 3, { unattempted: 3 }), notAttempted: true })).toBe("skip");
    expect(attemptWeakAreaOutcome(withMarks(1, 3, { untyped: 2 }))).toBe("skip");
  });
  it("a count-only (old) attempt is judged exactly as before — never converted", () => {
    expect(attemptWeakAreaOutcome({ correct: false, marksScored: 2, marksAvailable: 3 })).toBe("gap");
    expect(attemptWeakAreaOutcome({ correct: true, marksScored: 3, marksAvailable: 3 })).toBe("knows");
    // an unversioned marks field is ignored (G5: never read without the version)
    expect(attemptWeakAreaOutcome({ correct: false, marksScored: 2, marksAvailable: 3, marksLostByType: marks({ silly: 1 }) })).toBe("gap");
  });
});
