// @vitest-environment jsdom
/**
 * N1 (verifier, controller fix round 2026-10-05) — THE TRANSITION, through the REAL trigger: the
 * SolutionChecker cache-restore. On a revisit the checker restores a cached grade and records it as
 * an attempt again (SolutionChecker.tsx, the restore effect). For a grade recorded BEFORE the
 * identity key existed, that re-record must not add a SECOND attempt nor drain a weakness again:
 * the old score-keyed key in the device's `seen` list recognises it (practiceInsights.ts,
 * `legacyTransition`). The re-grade trigger is pinned through the real Worksheet service in
 * services/scorecardMi2.items.test.ts §(viii).
 *
 * The component and `recordAttempt` are REAL; only the grader, auth, subscription, the MI front door
 * and the weakness store are stubbed (the store is the observation point for "drained again").
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import type { CheckSolutionResponse } from "../../ai/aiClient";

const recordMistake = vi.fn();
const clearWrongAnswer = vi.fn();

vi.mock("../../ai/aiClient", () => ({ checkSolutionImage: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u-n1", isLocalSession: false } }),
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "premium", isPremium: true, isTrialActive: false, isTrialExpired: false, daysLeftInTrial: 0,
    status: { tier: "premium" }, startTrial: () => {}, upgradeToPremium: () => {},
  }),
}));
vi.mock("../../services/mistakeIntelligence", () => ({
  recordMistake: (...a: unknown[]) => recordMistake(...a),
  isSavedOutcome: (o: string) => o === "logged" || o === "duplicate",
}));
// Device-local only: no Firestore, so the attempt store is the localStorage blob this test reads.
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null, firebaseConfigured: false, authClient: null, app: null }));
vi.mock("../../services/adaptivePracticeEngine", () => ({
  clearWrongAnswer: (...a: unknown[]) => clearWrongAnswer(...a),
  getWrongConceptsForTopic: (topicKey: string) => [{ topicKey, conceptKey: "identity", count: 2, timestamp: 1 }],
}));
vi.mock("../qr/QrAnswerHandoff", () => ({ default: () => <div data-testid="qr-handoff" /> }));

import { SolutionChecker } from "./SolutionChecker";
import { getAttempts, saveInsights, type PracticeAttempt } from "../../services/practiceInsights";
import { legacyAttemptKey } from "../../services/attemptDedupKey";
import { setActiveProgressUser } from "../../services/studentProgressStore";

const QID = "bank-trig-01";
const PROPS = { question: "Prove that sin^2(x) + cos^2(x) = 1", marks: 3, subject: "Maths", topic: "introduction-to-trigonometry", questionId: QID };

/** A full-marks grade cached before the change — so a re-record that counted would also DRAIN. */
const cached: CheckSolutionResponse = {
  ok: true, totalMarks: 3, marksAwarded: 3, percentage: 100,
  annotatedSteps: [{ stepNumber: 1, description: "Use the identity", studentWork: "sin^2 x + cos^2 x = 1", status: "correct", marksAwarded: 3, marksDeducted: 0, teacherAnnotation: "", mistakeType: null, correctedWorking: null }],
  mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  teacherNote: "Correct.",
};

function seedPreChangeGrade(withOldKey: boolean): void {
  // the cached grade the restore reads (v2, uid-scoped) …
  localStorage.setItem(`lazytopper.checkResult.v2.u-n1:${QID}`, JSON.stringify({ result: cached, answerKey: "t:abc" }));
  // … the attempt the PRE-change code recorded for it (time-based local id) …
  saveInsights({
    attempts: [{
      id: `${QID}-introduction-to-trigonometry-legacy`, questionId: QID, topicKey: "introduction-to-trigonometry",
      subject: "maths", difficulty: "Medium", correct: true, marksScored: 3, marksAvailable: 3, mode: "graded", timestamp: 1,
    } as PracticeAttempt],
  });
  // … and the old score-keyed key it left in the device's `seen` list.
  if (withOldKey) {
    localStorage.setItem("lazytopper.attempt.dedup.v1", JSON.stringify([legacyAttemptKey("u-n1", { questionId: QID }, 3, 3)]));
  }
}

beforeEach(() => {
  localStorage.clear();
  setActiveProgressUser("u-n1");
  recordMistake.mockReset();
  recordMistake.mockResolvedValue({ outcome: "duplicate", bridged: false });
  clearWrongAnswer.mockClear();
});
afterEach(cleanup);

describe("N1 — the SolutionChecker cache-restore of a PRE-change grade adds no attempt and drains nothing", () => {
  it("★ the restore re-records it: still ONE attempt, no weakness drained", async () => {
    seedPreChangeGrade(true);
    render(<SolutionChecker {...PROPS} />);
    expect(await screen.findByText("Showing your previous check result")).toBeInTheDocument();
    // liveness: the restore effect DID run (its MI twin was called)
    await waitFor(() => expect(recordMistake).toHaveBeenCalledTimes(1));
    expect(getAttempts()).toHaveLength(1);
    expect(clearWrongAnswer).not.toHaveBeenCalled();
  });

  it("CONTROL — without the old key (a device that never recorded it before the change) the same restore DOES record — the guard is what prevents the double count", async () => {
    seedPreChangeGrade(false);
    render(<SolutionChecker {...PROPS} />);
    await waitFor(() => expect(recordMistake).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getAttempts()).toHaveLength(2));
  });
});
