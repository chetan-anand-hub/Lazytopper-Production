/**
 * CI-SOFT-1 — the audience hook the page uses: a real result / grade closes the card for the tab FOR
 * GOOD (S1), and the zero-graded read is asked only for an ad arrival (N6).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

const Z = vi.hoisted(() => ({ calls: [] as Array<string | null | undefined>, answer: "none" as "none" | "loading" | "some" }));
vi.mock("../startHere/zeroGraded", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../startHere/zeroGraded")>();
  return {
    ...actual,
    useZeroGraded: (uid?: string | null) => {
      Z.calls.push(uid);
      return uid ? Z.answer : "loading";
    },
  };
});

import { CI_DEMO_CLOSED_KEY, useCiDemoAudience, type CiDemoAudienceArgs } from "./ciDemoModel";

const adArrival = () =>
  window.sessionStorage.setItem("lazytopper.guideIntent", JSON.stringify({ landing: "/check-improve", utm_content: null, utm_campaign: null }));
const args = (over: Partial<CiDemoAudienceArgs> = {}): CiDemoAudienceArgs => ({
  overlay: false,
  uid: "u1",
  freeMode: false,
  inProgress: false,
  resultSeen: false,
  ...over,
});

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  Z.calls = [];
  Z.answer = "none";
});
afterEach(cleanup);

describe("CI-SOFT-1 audience hook", () => {
  it("★ S1: a signed-in student who gets a real result does not see the card again (memoised zero-graded + latch), and the closed key is written", () => {
    adArrival();
    const { result, rerender } = renderHook((a: CiDemoAudienceArgs) => useCiDemoAudience(a), { initialProps: args() });
    expect(result.current.show).toBe(true);
    // a grade starts / a result is shown on this page
    rerender(args({ resultSeen: true, inProgress: true }));
    expect(result.current.show).toBe(false);
    expect(window.sessionStorage.getItem(CI_DEMO_CLOSED_KEY)).toBe("1");
    // "Grade another": the page is back to an empty input view, the zero-graded answer is still "none"
    rerender(args({ resultSeen: true, inProgress: false }));
    expect(result.current.show).toBe(false);
    rerender(args({ resultSeen: false, inProgress: false }));
    expect(result.current.show).toBe(false);
  });

  it("★ S1 control: no result → the card stays", () => {
    adArrival();
    const { result, rerender } = renderHook((a: CiDemoAudienceArgs) => useCiDemoAudience(a), { initialProps: args() });
    rerender(args({ inProgress: true }));
    expect(result.current.show).toBe(true);
    expect(window.sessionStorage.getItem(CI_DEMO_CLOSED_KEY)).toBeNull();
  });

  it("close() shuts it for the tab", () => {
    adArrival();
    const { result } = renderHook(() => useCiDemoAudience(args()));
    act(() => result.current.close());
    expect(result.current.show).toBe(false);
    expect(window.sessionStorage.getItem(CI_DEMO_CLOSED_KEY)).toBe("1");
  });

  it("★ N6: no ad arrival → the zero-graded read is never asked for a uid", () => {
    window.sessionStorage.setItem("lazytopper.guideIntent", JSON.stringify({ landing: "/notes", utm_content: null, utm_campaign: null }));
    const { result } = renderHook(() => useCiDemoAudience(args()));
    expect(result.current.show).toBe(false);
    expect(Z.calls.every((u) => u === null)).toBe(true);
  });

  it("★ N6: an ad arrival asks for the uid; the tutor overlay never does", () => {
    adArrival();
    renderHook(() => useCiDemoAudience(args()));
    expect(Z.calls).toContain("u1");
    Z.calls = [];
    renderHook(() => useCiDemoAudience(args({ overlay: true })));
    expect(Z.calls.every((u) => u === null)).toBe(true);
  });
});
