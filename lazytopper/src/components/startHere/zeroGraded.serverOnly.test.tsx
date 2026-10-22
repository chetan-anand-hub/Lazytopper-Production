/**
 * MOMENTS-1 (owner ruling, 22 Oct) — `useZeroGraded(uid, { serverOnly: true })`: "none" ONLY on the
 * SERVER's answer. The default reader (the Start-here card, the answer boxes) keeps today's
 * account-age fallback when the cloud cannot answer; the server-only reader stays "loading" — so a
 * student whose graded work is only in the cloud, on a new phone with a failed read, never sees a
 * first-session moment.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const { cloudHas, localRows, auth } = vi.hoisted(() => ({
  cloudHas: vi.fn(),
  localRows: vi.fn(),
  auth: { currentUser: null as null | { uid: string; metadata: { creationTime?: string } } },
}));
vi.mock("../../services/sessionRecords", () => ({ cloudHasAnySessionRecord: cloudHas, loadLocalSessionRecords: localRows }));
vi.mock("../../services/firebaseClient", () => ({ authClient: auth }));

import { START_HERE_RETRY_MS, resetZeroGradedCacheForTests, useZeroGraded } from "./zeroGraded";

const UID = "zg-new";
beforeEach(() => {
  resetZeroGradedCacheForTests();
  cloudHas.mockReset();
  localRows.mockReset().mockReturnValue([]);
  // a brand-new account (created now): the default reader's fallback says "none"
  auth.currentUser = { uid: UID, metadata: { creationTime: new Date().toUTCString() } };
});

describe("MOMENTS-1 · the server-only zero-graded read", () => {
  it("★★ the cloud cannot answer (twice): the default reader guesses 'none' from the account's age; serverOnly stays 'loading'", async () => {
    cloudHas.mockResolvedValue(null);
    const loose = renderHook(() => useZeroGraded(UID));
    const strict = renderHook(() => useZeroGraded(UID, { serverOnly: true }));
    await waitFor(() => expect(loose.result.current).toBe("none"), { timeout: START_HERE_RETRY_MS + 2000 });
    await act(async () => {});
    expect(strict.result.current).toBe("loading");
    // ONE ask (shared) + the default reader's ONE retry: the server-only reader adds no read
    expect(cloudHas).toHaveBeenCalledTimes(2);
  });

  it("★★ graded work only in the cloud (local empty): 'some' — never 'none'", async () => {
    cloudHas.mockResolvedValue(true);
    const { result } = renderHook(() => useZeroGraded(UID, { serverOnly: true }));
    await waitFor(() => expect(result.current).toBe("some"));
  });

  it("★★ loading until the server answers, then 'none' (never shown-then-retracted)", async () => {
    let answer: (v: boolean) => void = () => {};
    cloudHas.mockReturnValue(new Promise<boolean>((r) => (answer = r)));
    const { result } = renderHook(() => useZeroGraded(UID, { serverOnly: true }));
    await act(async () => {});
    expect(result.current).toBe("loading");
    await act(async () => answer(false));
    await waitFor(() => expect(result.current).toBe("none"));
  });

  it("local rows on the device → 'some' with no read at all", () => {
    localRows.mockReturnValue([{ id: "r1" }]);
    const { result } = renderHook(() => useZeroGraded(UID, { serverOnly: true }));
    expect(result.current).toBe("some");
    expect(cloudHas).not.toHaveBeenCalled();
  });
});
