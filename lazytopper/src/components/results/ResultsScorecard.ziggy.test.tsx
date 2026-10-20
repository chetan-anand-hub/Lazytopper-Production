import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { setMatchMediaMatches } from "../../test/setup";

const { auth, localRows, onboarding } = vi.hoisted(() => ({
  auth: { currentUser: null as null | { uid: string; isAnonymous: boolean } },
  localRows: vi.fn(),
  onboarding: vi.fn(),
}));
vi.mock("../../services/firebaseClient", () => ({ authClient: auth }));
vi.mock("../../services/sessionRecords", async (orig) => ({
  ...(await orig<typeof import("../../services/sessionRecords")>()),
  loadLocalSessionRecords: localRows,
}));
vi.mock("../../analytics/analytics", async (orig) => ({
  ...(await orig<typeof import("../../analytics/analytics")>()),
  trackOnboardingEvent: onboarding,
}));

import ResultsScorecard from "./ResultsScorecard";
import { quickPracticeScorecardVariant } from "./scorecardVariants";
import { __setGuideAbForTests } from "../guide/guideVariant";
import { ZIGGY_BOUNCE_BACK_MS } from "../guide/guideChunk";
import { __resetFeedbackHostForTests } from "../feedback/feedbackPromptHost";
import { ZIGGY_CHECK_DELAY_MS, ZIGGY_SHOWN_PREFIX, __resetZiggyShownForTests } from "../guide/lazyGuide";

/**
 * GUIDE-1 §3D — Ziggy on the FIRST scorecard: guide arm only, first graded result only, the
 * scorecard's own numbers, in the flow above the score (never over a number, never a modal).
 */
const noop = () => {};
const variant = (correct: number) =>
  quickPracticeScorecardVariant({
    attempted: 5,
    totalInSet: 5,
    mcqAnswered: 5,
    mcqCorrect: correct,
    allDone: true,
    onFreshSet: noop,
    onChapterTest: noop,
    onPredicted: noop,
    onStudy: noop,
  });
const firstRecord = () => [{ id: "r1", status: "graded", gradedAt: Date.now() }];
const flush = () => act(async () => new Promise((r) => setTimeout(r, 0)));
const strip = () => screen.queryByTestId("ziggy-strip");

beforeEach(() => {
  auth.currentUser = { uid: "u-first", isAnonymous: false };
  localRows.mockReset().mockReturnValue(firstRecord());
  onboarding.mockReset();
  window.localStorage.clear();
  __resetZiggyShownForTests();
  setMatchMediaMatches(false);
});
afterEach(() => {
  cleanup();
  __setGuideAbForTests(null);
  __resetFeedbackHostForTests();
  vi.useRealTimers();
});

async function show(correct: number, ask = true) {
  render(<ResultsScorecard variant={variant(correct)} onClose={noop} askFirstFeedback={ask} />);
  // Review F4: the first-result check waits as long as the feedback card does.
  await act(async () => new Promise((r) => setTimeout(r, ZIGGY_CHECK_DELAY_MS + 60)));
  await flush();
}

describe("GUIDE-1 · Ziggy on the first scorecard", () => {
  it("★★ full marks → excited, inside the card ABOVE the score (in the flow, not over a number)", async () => {
    __setGuideAbForTests(true, "guide");
    await show(5);
    const s = await screen.findByTestId("ziggy-strip");
    expect(s.getAttribute("data-band")).toBe("full");
    expect(screen.getByTestId("ziggy-line").textContent).toBe("Full marks! Did you see that?!");
    const card = document.querySelector(".lt-sc__card")!;
    expect(card.contains(s)).toBe(true);
    const big = card.querySelector(".lt-sc__big")!;
    expect(s.compareDocumentPosition(big) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(s.contains(big)).toBe(false);
    expect(s.getAttribute("role")).toBe("group"); // not a dialog
    expect(onboarding).toHaveBeenCalledWith("ziggy_reaction", { band: "full" });
  });

  it("★★ ≥ 50% → determined, with the numbers the score hero shows", async () => {
    __setGuideAbForTests(true, "guide");
    await show(3);
    const big = document.querySelector(".lt-sc__big")!.textContent!.replace(/\s+/g, " ");
    const line = (await screen.findByTestId("ziggy-line")).textContent!;
    expect(screen.getByTestId("ziggy-strip").getAttribute("data-band")).toBe("half_plus");
    const [got, total] = big.split("/").map((x) => x.trim());
    expect(line.startsWith(`${got} out of ${total}.`)).toBe(true);
  });

  it("★★ < 50% → sad (melts), then bounces back to determined after ~2.5 s", async () => {
    __setGuideAbForTests(true, "guide");
    await show(1);
    expect((await screen.findByTestId("ziggy-line")).textContent).toBe("Oh no... 1 out of 5.");
    expect(screen.getByTestId("blob-ziggy").getAttribute("data-pose")).toBe("sad");
    await act(async () => new Promise((r) => setTimeout(r, ZIGGY_BOUNCE_BACK_MS + 50)));
    expect(screen.getByTestId("ziggy-line").textContent).toBe("Okay. Let's fix them one by one.");
    expect(screen.getByTestId("blob-ziggy").getAttribute("data-pose")).toBe("determined");
  });

  it("★★ control arm: no Ziggy", async () => {
    __setGuideAbForTests(true, "control");
    await show(5);
    expect(strip()).toBeNull();
  });

  it("★★ not the first graded result on this device: no Ziggy", async () => {
    __setGuideAbForTests(true, "guide");
    localRows.mockReturnValue([...firstRecord(), { id: "r0", status: "graded", gradedAt: Date.now() - 86_400_000 }]);
    await show(5);
    expect(strip()).toBeNull();
  });

  it("host did not opt in (history / tutor overlay), signed out, or the split off: no Ziggy", async () => {
    __setGuideAbForTests(true, "guide");
    await show(5, false);
    expect(strip()).toBeNull();
    cleanup();
    auth.currentUser = null;
    await show(5);
    expect(strip()).toBeNull();
    cleanup();
    auth.currentUser = { uid: "u-first", isAnonymous: false };
    __setGuideAbForTests(false);
    await show(5);
    expect(strip()).toBeNull();
  });

  it("★ review F4 — nothing before the 1.5 s check; once shown, a re-shown live scorecard neither shows Ziggy nor fires ziggy_reaction again", async () => {
    __setGuideAbForTests(true, "guide");
    render(<ResultsScorecard variant={variant(5)} onClose={noop} askFirstFeedback />);
    await flush();
    expect(strip()).toBeNull(); // not yet: the check waits
    await act(async () => new Promise((r) => setTimeout(r, ZIGGY_CHECK_DELAY_MS + 60)));
    expect(await screen.findByTestId("ziggy-strip")).toBeTruthy();
    expect(Object.keys(window.localStorage).some((k) => k.startsWith(ZIGGY_SHOWN_PREFIX))).toBe(true);
    expect(Object.keys(window.localStorage).filter((k) => k.startsWith(ZIGGY_SHOWN_PREFIX)).join(",")).not.toContain("u-first");
    cleanup();
    __resetZiggyShownForTests(); // a reload: memory gone, the device marker stays
    onboarding.mockReset();
    await show(5);
    expect(strip()).toBeNull();
    expect(onboarding.mock.calls.filter((c) => c[0] === "ziggy_reaction")).toHaveLength(0);
  });
});
