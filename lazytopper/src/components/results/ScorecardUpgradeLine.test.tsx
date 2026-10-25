// ASK-FIX-1 - the scorecard's upgrade line: real marks only, never for Premium, on all six surfaces.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const auth = vi.hoisted(() => ({ user: { uid: "u1" } as { uid: string } | null, tier: "free" as string, hydrated: true }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({ hydrated: auth.hydrated, tier: auth.tier, isTrialExpired: false, isTrialActive: auth.tier === "trial", daysLeftInTrial: 3, status: {} }),
}));
vi.mock("../../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/subscriptionService")>();
  return {
    ...actual,
    loadSubscription: () => ({ tier: auth.tier, plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null }),
    onSubscriptionHydrated: () => () => {},
  };
});
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackScorecardUpgrade: vi.fn(), trackPaywallAction: vi.fn() };
});
vi.mock("../feedback/feedbackPromptHost", () => ({ notifyFirstGradedResult: vi.fn(), notifyPaywallDismissed: vi.fn(), dismissFeedbackPromptFor: vi.fn() }));

import ResultsScorecard from "./ResultsScorecard";
import { scorecardUpgradeCopy } from "./ScorecardUpgradeLine";
import * as analytics from "../../analytics/analytics";
import type { ScorecardSurface, ScorecardVariant } from "./scorecardVariants";

const track = analytics.trackScorecardUpgrade as unknown as ReturnType<typeof vi.fn>;
const marks = (awarded: number, total: number) => ({ kind: "marks" as const, awarded, total });
const variantFor = (surface: ScorecardSurface, score: ScorecardVariant["score"]): ScorecardVariant =>
  ({ surface, title: "T", subtitle: "S", score, actions: [] }) as unknown as ScorecardVariant;
const SURFACES: ScorecardSurface[] = ["check-improve", "worksheet", "chapter-test", "full-mock", "quick-practice"];

beforeEach(() => {
  auth.user = { uid: "u1" };
  auth.tier = "free";
  auth.hydrated = true;
  track.mockClear();
});
afterEach(cleanup);

describe("scorecardUpgradeCopy", () => {
  it("names the real marks lost, singular-aware", () => {
    expect(scorecardUpgradeCopy(variantFor("worksheet", marks(7, 10)))?.text).toBe(
      "You lost 3 marks here. Unlock step-by-step marks on every answer and unlimited checks with the Board Pass →",
    );
    expect(scorecardUpgradeCopy(variantFor("worksheet", marks(9, 10)))?.text).toContain("You lost 1 mark here.");
    expect(scorecardUpgradeCopy(variantFor("worksheet", marks(8.5, 10)))?.text).toContain("You lost 1.5 marks here.");
  });
  it("full marks gets the full-marks line", () => {
    expect(scorecardUpgradeCopy(variantFor("check-improve", marks(5, 5)))?.text).toBe(
      "Full marks! Keep going with unlimited checks — Board Pass →",
    );
  });
  it("no number when marks are unknown: attempts score, ungraded questions, awaited sheet", () => {
    const attempts = variantFor("quick-practice", { kind: "attempts", attempted: 3, ofN: 5, mcqAnswered: 3, mcqCorrect: 2 });
    expect(scorecardUpgradeCopy(attempts)?.text).toBe("Unlock step-by-step marks on every answer — Board Pass →");
    const pending = { ...variantFor("worksheet", marks(4, 10)), pending: { count: 1, worksheetTotalMarks: 10 } } as ScorecardVariant;
    expect(scorecardUpgradeCopy(pending)?.text).not.toMatch(/\d/);
    const awaiting = { ...variantFor("chapter-test", marks(4, 10)), awaitingSheet: true } as ScorecardVariant;
    expect(scorecardUpgradeCopy(awaiting)?.text).not.toMatch(/\d/);
  });
  it("says nothing on an all-pending or deferred card", () => {
    expect(scorecardUpgradeCopy({ ...variantFor("worksheet", marks(0, 10)), allPending: { title: "x", detail: "y" } } as ScorecardVariant)).toBeNull();
    expect(scorecardUpgradeCopy({ ...variantFor("full-mock", marks(0, 10)), deferred: true } as ScorecardVariant)).toBeNull();
  });
});

describe("the shell renders it on every grading surface (one call site: ResultsScorecard)", () => {
  it.each(SURFACES)("%s: a non-Premium student sees it, and a tap opens the Board Pass sheet", (surface) => {
    const score = surface === "quick-practice"
      ? ({ kind: "attempts", attempted: 2, ofN: 5, mcqAnswered: 2, mcqCorrect: 1 } as const)
      : marks(6, 10);
    render(<MemoryRouter><ResultsScorecard variant={variantFor(surface, score)} onClose={() => {}} /></MemoryRouter>);
    const line = screen.getByTestId("scorecard-upgrade-line");
    expect(line).toHaveTextContent(surface === "quick-practice" ? "Unlock step-by-step marks on every answer" : "You lost 4 marks here.");
    expect(track).toHaveBeenCalledWith("shown");
    fireEvent.click(line);
    expect(track).toHaveBeenCalledWith("click");
    expect(screen.getByTestId("upgrade-sheet-board-pass")).toHaveTextContent("Board Pass");
  });

  it("a history re-open shows the line but does not count 'shown'", () => {
    render(<MemoryRouter><ResultsScorecard reopened variant={variantFor("worksheet", marks(6, 10))} onClose={() => {}} /></MemoryRouter>);
    expect(screen.getByTestId("scorecard-upgrade-line")).toBeInTheDocument();
    expect(track).not.toHaveBeenCalledWith("shown");
  });

  it("a trial student sees it; a Premium student, a signed-out visitor and a bare render do not", () => {
    const v = variantFor("worksheet", marks(6, 10));
    auth.tier = "trial";
    render(<MemoryRouter><ResultsScorecard variant={v} onClose={() => {}} /></MemoryRouter>);
    expect(screen.queryByTestId("scorecard-upgrade-line")).not.toBeNull();
    cleanup();
    auth.tier = "premium";
    render(<MemoryRouter><ResultsScorecard variant={v} onClose={() => {}} /></MemoryRouter>);
    expect(screen.queryByTestId("scorecard-upgrade-line")).toBeNull();
    cleanup();
    auth.tier = "free";
    auth.user = null;
    render(<MemoryRouter><ResultsScorecard variant={v} onClose={() => {}} /></MemoryRouter>);
    expect(screen.queryByTestId("scorecard-upgrade-line")).toBeNull();
  });
});
