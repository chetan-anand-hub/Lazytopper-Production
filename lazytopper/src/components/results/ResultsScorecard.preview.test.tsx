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
import { GUIDE_PREVIEW_KEY, __setGuideAbForTests } from "../guide/guideVariant";
import { __resetFeedbackHostForTests } from "../feedback/feedbackPromptHost";
import { ZIGGY_CHECK_DELAY_MS, ZIGGY_SHOWN_PREFIX, __resetZiggyShownForTests } from "../guide/lazyGuide";

/**
 * PREVIEW-1 — Ziggy under the admin preview: on EVERY live graded scorecard (no first-result
 * check, no once-per-device marker), with the "Admin preview" pill, and ziggy_reaction NOT sent.
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
const FAR = 4_102_444_800_000;
const preview = (arm: "guide" | "control") => window.localStorage.setItem(GUIDE_PREVIEW_KEY, JSON.stringify({ arm, until: FAR }));
// An account with MANY graded results: never "first".
const manyRecords = () => [
  { id: "r3", status: "graded", gradedAt: 1_760_000_000_000 },
  { id: "r2", status: "graded", gradedAt: 1_759_000_000_000 },
  { id: "r1", status: "graded", gradedAt: 1_758_000_000_000 },
];
const strip = () => screen.queryByTestId("ziggy-strip");
const ziggyEvents = () => onboarding.mock.calls.filter((c) => c[0] === "ziggy_reaction");

async function show(correct: number, ask = true) {
  render(<ResultsScorecard variant={variant(correct)} onClose={noop} askFirstFeedback={ask} />);
  await act(async () => new Promise((r) => setTimeout(r, ZIGGY_CHECK_DELAY_MS + 60)));
  await act(async () => new Promise((r) => setTimeout(r, 0)));
}

beforeEach(() => {
  auth.currentUser = { uid: "u-used", isAnonymous: false };
  localRows.mockReset().mockReturnValue(manyRecords());
  onboarding.mockReset();
  window.localStorage.clear();
  __resetZiggyShownForTests();
  setMatchMediaMatches(false);
  __setGuideAbForTests(true); // the split on, no forced arm: the preview decides
});
afterEach(() => {
  cleanup();
  __setGuideAbForTests(null);
  __resetFeedbackHostForTests();
});

describe("PREVIEW-1 · Ziggy under 'Show Byte'", () => {
  it("★★ reacts on a NON-first result, on every mount, with the pill; writes NO marker; sends NO ziggy_reaction", async () => {
    preview("guide");
    await show(5);
    expect((await screen.findByTestId("ziggy-strip")).getAttribute("data-band")).toBe("full");
    expect(screen.getByTestId("guide-admin-preview").textContent).toBe("Admin preview");
    expect(screen.getByTestId("ziggy-strip").className).toBe("lt-ziggy lt-ziggy--preview");
    cleanup();
    await show(1); // a second graded scorecard: Ziggy again, band logic unchanged
    expect((await screen.findByTestId("ziggy-strip")).getAttribute("data-band")).toBe("under_half");
    expect(screen.getByTestId("ziggy-line").textContent).toBe("Oh no... 1 out of 5.");
    expect(Object.keys(window.localStorage).some((k) => k.startsWith(ZIGGY_SHOWN_PREFIX))).toBe(false);
    expect(ziggyEvents()).toEqual([]);
  });

  it("still only where Ziggy can appear today: the host must opt in (askFirstFeedback)", async () => {
    preview("guide");
    await show(5, false);
    expect(strip()).toBeNull();
  });

  it("★ 'Show control': no Ziggy", async () => {
    preview("control");
    await show(5);
    expect(strip()).toBeNull();
  });

  it("★ F2 — no preview: Ziggy's strip is exactly today's (class 'lt-ziggy' only, no pill)", async () => {
    __setGuideAbForTests(true, "guide");
    localRows.mockReturnValue([{ id: "r1", status: "graded", gradedAt: Date.now() }]); // the first result
    await show(5);
    const s = await screen.findByTestId("ziggy-strip");
    expect(s.className).toBe("lt-ziggy");
    expect(screen.queryByTestId("guide-admin-preview")).toBeNull();
  });

  it("★ no preview: a used account in the guide arm gets no Ziggy (today's first-result rule)", async () => {
    __setGuideAbForTests(true, "guide");
    await show(5);
    expect(strip()).toBeNull();
  });
});
