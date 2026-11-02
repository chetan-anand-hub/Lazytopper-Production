/**
 * ACT-FIRST-1 — `useFirstActionZeroGraded`: the ladder / first-action card's own zero-graded read.
 * The server's answer wins; a new-account signal stands in only while the server is slow or failed;
 * a student with a graded row (local or server) is NEVER shown "none".
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useStartHere } from "./StartHereCard";

const { cloudHas, localRows, auth, signup } = vi.hoisted(() => ({
  cloudHas: vi.fn(),
  localRows: vi.fn(),
  auth: { currentUser: null as null | { uid: string; metadata: { creationTime?: string } } },
  signup: vi.fn(),
}));
vi.mock("../../services/sessionRecords", () => ({ cloudHasAnySessionRecord: cloudHas, loadLocalSessionRecords: localRows }));
vi.mock("../../services/firebaseClient", () => ({ authClient: auth }));
vi.mock("../../services/newAccountTrial", () => ({ wasTrialStartedAtSignUp: signup }));

import { resetZeroGradedCacheForTests, useZeroGraded } from "./zeroGraded";
import { FIRST_ACTION_AGE_WAIT_MS, useFirstActionZeroGraded } from "./firstActionRead";

const UID = "af-new";
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toUTCString();
beforeEach(() => {
  resetZeroGradedCacheForTests();
  cloudHas.mockReset();
  localRows.mockReset().mockReturnValue([]);
  signup.mockReset().mockReturnValue(false);
  auth.currentUser = { uid: UID, metadata: { creationTime: daysAgo(0) } };
});

describe("ACT-FIRST-1 · the first-action zero-graded read", () => {
  it("★★ sign-up marker + the server still asking: 'none' at once, reason new_by_signal", async () => {
    signup.mockReturnValue(true);
    cloudHas.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useFirstActionZeroGraded(UID));
    expect(result.current).toEqual({ zeroGraded: "none", reason: "new_by_signal" });
  });

  it("★★ sign-up marker + the server FAILS: still 'none' (new_by_signal)", async () => {
    signup.mockReturnValue(true);
    cloudHas.mockResolvedValue(null);
    const { result } = renderHook(() => useFirstActionZeroGraded(UID));
    await act(async () => {});
    expect(result.current).toEqual({ zeroGraded: "none", reason: "new_by_signal" });
  });

  it("★★ the server says 'none': reason server_zero", async () => {
    cloudHas.mockResolvedValue(false);
    const { result } = renderHook(() => useFirstActionZeroGraded(UID));
    await waitFor(() => expect(result.current).toEqual({ zeroGraded: "none", reason: "server_zero" }));
  });

  it("★★ NEVER 'none' for a student with graded work: a local row, or the server's 'some' (even with the marker)", async () => {
    signup.mockReturnValue(true);
    localRows.mockReturnValue([{ id: "r1" }]);
    const local = renderHook(() => useFirstActionZeroGraded(UID));
    expect(local.result.current).toEqual({ zeroGraded: "some", reason: null });
    localRows.mockReturnValue([]);
    resetZeroGradedCacheForTests();
    cloudHas.mockResolvedValue(true);
    auth.currentUser = { uid: "af-other", metadata: { creationTime: daysAgo(0) } };
    const server = renderHook(() => useFirstActionZeroGraded("af-other"));
    await waitFor(() => expect(server.result.current.zeroGraded).toBe("some"));
    expect(server.result.current.reason).toBeNull();
  });

  it("a young account WITHOUT the marker waits for the server, then falls back to 'none' (new_by_signal)", async () => {
    vi.useFakeTimers();
    try {
      cloudHas.mockResolvedValue(null);
      const { result } = renderHook(() => useFirstActionZeroGraded(UID));
      await act(async () => {});
      expect(result.current).toEqual({ zeroGraded: "loading", reason: null });
      await act(async () => {
        vi.advanceTimersByTime(FIRST_ACTION_AGE_WAIT_MS + 10);
      });
      expect(result.current).toEqual({ zeroGraded: "none", reason: "new_by_signal" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("an OLD account without the marker never falls back, and the strict serverOnly reader is unchanged", async () => {
    vi.useFakeTimers();
    try {
      auth.currentUser = { uid: UID, metadata: { creationTime: daysAgo(30) } };
      cloudHas.mockResolvedValue(null);
      const first = renderHook(() => useFirstActionZeroGraded(UID));
      const strict = renderHook(() => useZeroGraded(UID, { serverOnly: true }));
      await act(async () => {
        vi.advanceTimersByTime(FIRST_ACTION_AGE_WAIT_MS + 10);
      });
      expect(first.result.current.zeroGraded).toBe("loading");
      expect(strict.result.current).toBe("loading");
    } finally {
      vi.useRealTimers();
    }
  });

  it("signed out: loading, no reason", () => {
    const { result } = renderHook(() => useFirstActionZeroGraded(null));
    expect(result.current).toEqual({ zeroGraded: "loading", reason: null });
  });

  it("★★ RETRACTION: shown on new_by_signal, then the server answers 'some' -> the card is gone (hook and Start-here card)", async () => {
    vi.useFakeTimers();
    try {
      signup.mockReturnValue(true);
      cloudHas.mockResolvedValueOnce(null).mockResolvedValue(true); // first read fails, the re-ask finds graded work
      const first = renderHook(() => useFirstActionZeroGraded(UID));
      const card = renderHook(() => useStartHere(UID));
      await act(async () => {});
      expect(first.result.current).toEqual({ zeroGraded: "none", reason: "new_by_signal" });
      expect(card.result.current.visible).toBe(true);
      await act(async () => {
        vi.advanceTimersByTime(FIRST_ACTION_AGE_WAIT_MS + 10);
      });
      expect(first.result.current).toEqual({ zeroGraded: "some", reason: null });
      expect(card.result.current.visible).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("the re-ask is ONE extra read: a failed re-ask is not repeated on focus", async () => {
    vi.useFakeTimers();
    try {
      signup.mockReturnValue(true);
      cloudHas.mockResolvedValue(null);
      const { result } = renderHook(() => useFirstActionZeroGraded(UID));
      await act(async () => {});
      const before = cloudHas.mock.calls.length;
      await act(async () => {
        vi.advanceTimersByTime(FIRST_ACTION_AGE_WAIT_MS + 10);
      });
      expect(cloudHas.mock.calls.length).toBe(before + 1);
      await act(async () => {
        window.dispatchEvent(new Event("focus"));
      });
      expect(cloudHas.mock.calls.length).toBe(before + 1);
      expect(result.current.reason).toBe("new_by_signal");
    } finally {
      vi.useRealTimers();
    }
  });
});
