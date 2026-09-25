/**
 * FREE-CHECK-1b · R8 through the hook the page uses: the replay runs only AFTER the
 * active progress uid is this student's (AuthContext sets it in an effect that runs
 * after the page's), exactly ONCE — even under React StrictMode's double effect — and
 * reports `saved` so the R9 offer can follow.
 *
 * Mutation B5 (replay twice / before the uid is set) turns this file RED.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StrictMode, createElement, type ReactNode } from "react";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";

const H = vi.hoisted(() => ({
  activeUid: null as string | null,
  recordMistake: vi.fn(),
  recordAttempt: vi.fn(),
  ensureCode: vi.fn(),
  persist: vi.fn(),
}));

vi.mock("../services/mistakeIntelligence", () => ({
  recordMistake: (...a: unknown[]) => H.recordMistake(...a),
}));
vi.mock("../services/practiceInsights", () => ({
  recordAttempt: (...a: unknown[]) => H.recordAttempt(...a),
}));
vi.mock("../services/sessionRecords", () => ({
  ensureCheckImproveSessionCode: (...a: unknown[]) => H.ensureCode(...a),
}));
vi.mock("../services/checkImproveGradeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/checkImproveGradeService")>();
  return { ...actual, persistCheckImproveSession: (...a: unknown[]) => H.persist(...a) };
});
vi.mock("../services/studentProgressStore", () => ({
  getActiveProgressUser: () => H.activeUid,
}));
vi.mock("../analytics/analytics", () => ({ trackNamedEvent: vi.fn() }));

import { useFreeCheckReturn } from "./useFreeCheckReturn";
import { hasPendingFreeCheck, recordFreeCheckSuccess, type PendingSingleFreeCheck } from "../services/freeCheckClient";

const USER = { uid: "u9", email: null, phoneNumber: null, displayName: null } as never;
const PENDING: PendingSingleFreeCheck = {
  v: 1,
  kind: "single",
  gradedAt: 1_700_000_000_000,
  subject: "Maths",
  topicName: "Real Numbers",
  topicSlug: "real-numbers",
  topicTouched: false,
  question: "Q",
  marksSource: null,
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

const strict = ({ children }: { children: ReactNode }) => createElement(StrictMode, null, children);

beforeEach(() => {
  window.localStorage.clear();
  H.activeUid = null;
  H.recordMistake.mockReset().mockResolvedValue({ outcome: "logged", bridged: false });
  H.recordAttempt.mockReset().mockReturnValue("recorded");
  H.ensureCode.mockReset().mockResolvedValue({ code: "CI-M-REAL-02", name: "Real Numbers · Paper #2", sequence: 2 });
  H.persist.mockReset().mockReturnValue("recorded");
});
afterEach(() => cleanup());

describe("useFreeCheckReturn", () => {
  it("nothing waiting → none, and nothing is written", async () => {
    H.activeUid = "u9";
    const { result } = renderHook(() => useFreeCheckReturn(USER, true), { wrapper: strict });
    await act(async () => {});
    expect(result.current).toBe("none");
    expect(H.recordMistake).not.toHaveBeenCalled();
  });

  it("★ waits for the active progress uid, then replays EXACTLY ONCE (StrictMode on)", async () => {
    recordFreeCheckSuccess(PENDING);
    const { result } = renderHook(() => useFreeCheckReturn(USER, true), { wrapper: strict });

    // Before AuthContext's effect has set the progress scope: saving, and NO writes.
    expect(result.current).toBe("saving");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 250));
    });
    expect(H.recordMistake).not.toHaveBeenCalled();
    expect(H.recordAttempt).not.toHaveBeenCalled();
    expect(hasPendingFreeCheck()).toBe(true);

    // The scope arrives.
    H.activeUid = "u9";
    await waitFor(() => expect(result.current).toBe("saved"), { timeout: 3000 });
    expect(H.recordMistake).toHaveBeenCalledTimes(1);
    expect(H.recordAttempt).toHaveBeenCalledTimes(1);
    expect(H.ensureCode).toHaveBeenCalledTimes(1);
    expect(hasPendingFreeCheck()).toBe(false);
  });

  it("signed out, or disabled (flag off) → none, and the waiting result is left alone", async () => {
    recordFreeCheckSuccess(PENDING);
    H.activeUid = "u9";
    const a = renderHook(() => useFreeCheckReturn(null, true));
    const b = renderHook(() => useFreeCheckReturn(USER, false));
    await act(async () => {});
    expect(a.result.current).toBe("none");
    expect(b.result.current).toBe("none");
    expect(H.recordMistake).not.toHaveBeenCalled();
    expect(hasPendingFreeCheck()).toBe(true);
  });
});
