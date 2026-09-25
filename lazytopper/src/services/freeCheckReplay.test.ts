/**
 * FREE-CHECK-1b — R8 replay: the waiting free result is written through the SAME front
 * doors as a signed-in check (recordMistake + recordAttempt, + the session record),
 * EXACTLY ONCE, only after the active progress uid is set, keeping the grade time, and
 * under a session code RE-MINTED after sign-in (N14).
 *
 * Mutation B5 (replay twice / before the uid is set) turns this file RED.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthUser } from "../context/AuthContext";

const H = vi.hoisted(() => ({
  activeUid: null as string | null,
  recordMistake: vi.fn(),
  recordAttempt: vi.fn(),
  ensureCode: vi.fn(),
  persist: vi.fn(),
  track: vi.fn(),
}));

vi.mock("./mistakeIntelligence", () => ({
  recordMistake: (...a: unknown[]) => H.recordMistake(...a),
}));
vi.mock("./practiceInsights", () => ({
  recordAttempt: (...a: unknown[]) => H.recordAttempt(...a),
}));
vi.mock("./sessionRecords", () => ({
  ensureCheckImproveSessionCode: (...a: unknown[]) => H.ensureCode(...a),
}));
vi.mock("./checkImproveGradeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./checkImproveGradeService")>();
  return { ...actual, persistCheckImproveSession: (...a: unknown[]) => H.persist(...a) };
});
vi.mock("./studentProgressStore", () => ({
  getActiveProgressUser: () => H.activeUid,
}));
vi.mock("../analytics/analytics", () => ({
  trackNamedEvent: (...a: unknown[]) => H.track(...a),
}));

import {
  replayPendingFreeCheck,
  startFreeCheckReplay,
  getInflightFreeCheckReplay,
} from "./freeCheckReplay";
import {
  FREE_CHECK_PENDING_KEY,
  hasPendingFreeCheck,
  recordFreeCheckSuccess,
  type PendingMultiFreeCheck,
  type PendingSingleFreeCheck,
} from "./freeCheckClient";

const USER = { uid: "u-returning", email: null, phoneNumber: null, displayName: null } as AuthUser;
const GRADED_AT = 1_700_000_000_000;

const SINGLE: PendingSingleFreeCheck = {
  v: 1,
  kind: "single",
  gradedAt: GRADED_AT,
  subject: "Maths",
  topicName: "Real Numbers",
  topicSlug: "real-numbers",
  topicTouched: false,
  question: "Prove root 2 is irrational.",
  marksSource: "stated",
  detectionOverride: null,
  graded: {
    ok: true,
    totalMarks: 3,
    marksAwarded: 1,
    percentage: 33,
    annotatedSteps: [],
    mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: "",
  },
};

const MULTI: PendingMultiFreeCheck = {
  v: 1,
  kind: "multi",
  gradedAt: GRADED_AT,
  subject: "Science",
  topicName: "",
  topicSlug: "",
  topicTouched: false,
  questions: [
    { questionNumber: 1, questionText: "Q one" },
    { questionNumber: 2, questionText: "Q two" },
    { questionNumber: 3, questionText: "Q three" },
  ],
  response: {
    ok: true,
    results: [
      { qNumber: 1, couldNotRead: false, totalMarks: 2, ok: true, marksAwarded: 1, percentage: 50, annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 }, teacherNote: "" },
      { qNumber: 2, couldNotRead: true, totalMarks: 3, note: "unreadable" },
      { qNumber: 3, couldNotRead: false, totalMarks: 1, ok: true, marksAwarded: 1, percentage: 100, annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "" },
    ],
    totalQuestions: 3,
    gradedCount: 2,
    pendingCount: 1,
    gradedMarksAwarded: 2,
    gradedMarksTotal: 3,
    worksheetTotalMarks: 6,
  },
};

beforeEach(() => {
  window.localStorage.clear();
  H.activeUid = null;
  H.recordMistake.mockReset().mockResolvedValue({ outcome: "logged", bridged: false });
  H.recordAttempt.mockReset().mockReturnValue("recorded");
  // The SIGNED-IN mint: this returning student already has papers #01 and #02.
  H.ensureCode.mockReset().mockResolvedValue({ code: "CI-M-REAL-03", name: "Real Numbers · Paper #3", sequence: 3 });
  H.persist.mockReset().mockReturnValue("recorded");
  H.track.mockReset();
});

describe("R8 replay — timing (N14 hazard 1)", () => {
  it("does NOTHING before the active progress uid is this student's — the result keeps waiting", async () => {
    recordFreeCheckSuccess(SINGLE);
    H.activeUid = null;
    expect(await replayPendingFreeCheck(USER)).toEqual({ kind: "not-ready" });
    H.activeUid = "someone-else";
    expect(await replayPendingFreeCheck(USER)).toEqual({ kind: "not-ready" });
    expect(H.recordMistake).not.toHaveBeenCalled();
    expect(H.recordAttempt).not.toHaveBeenCalled();
    expect(H.persist).not.toHaveBeenCalled();
    expect(hasPendingFreeCheck()).toBe(true);
  });

  it("a signed-out or local session never replays", async () => {
    recordFreeCheckSuccess(SINGLE);
    expect(await replayPendingFreeCheck(null)).toEqual({ kind: "none" });
    H.activeUid = "local";
    expect(await replayPendingFreeCheck({ uid: "local", isLocalSession: true } as never)).toEqual({ kind: "none" });
    expect(H.recordMistake).not.toHaveBeenCalled();
    expect(hasPendingFreeCheck()).toBe(true);
  });
});

describe("R8 replay — a single-question result", () => {
  it("goes through recordMistake + recordAttempt EXACTLY ONCE, with the grade time kept", async () => {
    recordFreeCheckSuccess(SINGLE);
    H.activeUid = USER.uid;

    const out = await replayPendingFreeCheck(USER);
    expect(out).toEqual({ kind: "saved", code: "CI-M-REAL-03" });

    expect(H.recordMistake).toHaveBeenCalledTimes(1);
    expect(H.recordMistake).toHaveBeenCalledWith(USER, SINGLE.graded, {
      subject: "Maths",
      topic: "Real Numbers",
      topicKey: "real-numbers",
      question: SINGLE.question,
    });
    expect(H.recordAttempt).toHaveBeenCalledTimes(1);
    expect(H.recordAttempt.mock.calls[0][1]).toMatchObject({
      marksScored: 1,
      marksAvailable: 3,
      mode: "graded",
      marksSource: "stated",
      timestamp: GRADED_AT, // ★ the GRADE time, not the replay time
    });

    // Consumed: a second pass finds nothing and writes nothing (B5 — "called twice").
    expect(hasPendingFreeCheck()).toBe(false);
    expect(await replayPendingFreeCheck(USER)).toEqual({ kind: "none" });
    expect(H.recordMistake).toHaveBeenCalledTimes(1);
    expect(H.recordAttempt).toHaveBeenCalledTimes(1);
  });

  it("★ RE-MINTS the session code signed in, and writes the record under THAT code (N14 hazard 3)", async () => {
    recordFreeCheckSuccess(SINGLE);
    H.activeUid = USER.uid;
    await replayPendingFreeCheck(USER);

    // Minted with the signed-in user, AFTER sign-in — so it counts their real papers.
    expect(H.ensureCode).toHaveBeenCalledWith("maths", "real-numbers", "Real Numbers", USER);
    expect(H.persist).toHaveBeenCalledTimes(1);
    const args = H.persist.mock.calls[0][0];
    expect(args.code).toBe("CI-M-REAL-03");
    expect(args.code).not.toBe("CI-M-REAL-01"); // the signed-out mint would have been #01
    expect(args.user).toBe(USER);
    expect(args.response.results).toHaveLength(1);
  });

  it("counts a free_check_signup with NO identifier (R10)", async () => {
    recordFreeCheckSuccess(SINGLE);
    H.activeUid = USER.uid;
    await replayPendingFreeCheck(USER);
    expect(H.track).toHaveBeenCalledTimes(1);
    expect(H.track.mock.calls[0]).toEqual(["free_check_signup"]);
  });
});

describe("R8 replay — a whole-paper result", () => {
  it("one recordMistake + recordAttempt per LEGIBLE question, on ids under the re-minted code", async () => {
    H.ensureCode.mockResolvedValue({ code: "CI-S-MIX-02", name: "Uploaded paper · #2", sequence: 2 });
    recordFreeCheckSuccess(MULTI);
    H.activeUid = USER.uid;
    await replayPendingFreeCheck(USER);

    expect(H.recordMistake).toHaveBeenCalledTimes(2); // Q2 was unreadable: skipped, never a 0
    expect(H.recordMistake.mock.calls.map((c) => c[2].questionId)).toEqual([
      "ci:CI-S-MIX-02:q1",
      "ci:CI-S-MIX-02:q3",
    ]);
    expect(H.recordAttempt).toHaveBeenCalledTimes(2);
    for (const c of H.recordAttempt.mock.calls) expect(c[1].timestamp).toBe(GRADED_AT);
    expect(H.persist).toHaveBeenCalledTimes(1);
    expect(H.persist.mock.calls[0][0]).toMatchObject({ code: "CI-S-MIX-02", topicSource: "mixed" });
  });
});

describe("exactly once, under concurrency and failure", () => {
  it("two concurrent starts share ONE replay (StrictMode / remount)", async () => {
    recordFreeCheckSuccess(SINGLE);
    H.activeUid = USER.uid;
    const a = startFreeCheckReplay(USER);
    expect(getInflightFreeCheckReplay(USER.uid)).toBe(a);
    const b = startFreeCheckReplay(USER);
    expect(b).toBe(a);
    await Promise.all([a, b]);
    expect(H.recordMistake).toHaveBeenCalledTimes(1);
    expect(H.recordAttempt).toHaveBeenCalledTimes(1);
    expect(getInflightFreeCheckReplay(USER.uid)).toBeNull();
  });

  it("a replay that throws puts the result back for the next visit", async () => {
    recordFreeCheckSuccess(SINGLE);
    H.activeUid = USER.uid;
    H.recordMistake.mockRejectedValueOnce(new Error("offline"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await replayPendingFreeCheck(USER)).toEqual({ kind: "failed" });
    expect(window.localStorage.getItem(FREE_CHECK_PENDING_KEY)).not.toBeNull();
    expect(H.track).not.toHaveBeenCalled();
  });
});
