// ASK-FIX-1 - the scorecard's upgrade line: real marks only, never for Premium, on all six surfaces.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const auth = vi.hoisted(() => ({ user: { uid: "u1" } as { uid: string } | null, tier: "free" as string, hydrated: true, trialStart: null as string | null, listeners: [] as Array<(uid: string, s: unknown) => void> }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({ hydrated: auth.hydrated, tier: auth.tier, isTrialExpired: false, isTrialActive: auth.tier === "trial", daysLeftInTrial: 3, status: {} }),
}));
vi.mock("../../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/subscriptionService")>();
  return {
    ...actual,
    loadSubscription: () => ({ tier: auth.tier, plan: "none", trialStartDate: auth.trialStart, trialEndDate: null, premiumSince: null }),
    onSubscriptionHydrated: (l: (uid: string, s: unknown) => void) => {
      auth.listeners.push(l);
      return () => {
        auth.listeners = auth.listeners.filter((x) => x !== l);
      };
    },
  };
});
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackScorecardUpgrade: vi.fn(), trackPaywallAction: vi.fn() };
});
vi.mock("../feedback/feedbackPromptHost", () => ({ notifyFirstGradedResult: vi.fn(), notifyPaywallDismissed: vi.fn(), dismissFeedbackPromptFor: vi.fn() }));

import ResultsScorecard from "./ResultsScorecard";
import { scorecardUpgradeCopy } from "./ScorecardUpgradeLine";
import { boardPassPriceNow } from "../pricing/boardPassOffer";
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
  auth.trialStart = null;
  auth.listeners = [];
  track.mockClear();
});
afterEach(cleanup);

describe("scorecardUpgradeCopy", () => {
  it("names the real marks lost, singular-aware", () => {
    expect(scorecardUpgradeCopy(variantFor("worksheet", marks(7, 10)))?.text).toBe(
      "You lost 3 marks here. Get every answer marked like this till your boards — Board Pass →",
    );
    expect(scorecardUpgradeCopy(variantFor("worksheet", marks(9, 10)))?.text).toContain("You lost 1 mark here.");
    expect(scorecardUpgradeCopy(variantFor("worksheet", marks(8.5, 10)))?.text).toContain("You lost 1.5 marks here.");
  });
  it("ASK-COPY-1: Quick Practice MCQs get the owner's word-for-word line (no step marks to unlock)", () => {
    const qp = (answered: number, correct: number) =>
      variantFor("quick-practice", { kind: "attempts", attempted: answered, ofN: 5, mcqAnswered: answered, mcqCorrect: correct });
    expect(scorecardUpgradeCopy(qp(3, 1))?.text).toBe(
      "You lost 2 marks here. Upload your working to find out if it was a slip or a concept gap — Board Pass →",
    );
    expect(scorecardUpgradeCopy(qp(3, 2))?.text).toBe(
      "You lost 1 mark here. Upload your working to find out if it was a slip or a concept gap — Board Pass →",
    );
    // the other surfaces keep the step-marks copy, even with marks lost
    for (const surface of ["check-improve", "worksheet", "chapter-test", "full-mock"] as const) {
      expect(scorecardUpgradeCopy(variantFor(surface, marks(7, 10)))?.text).toContain("Get every answer marked like this");
    }
    // a marks-scored Quick Practice (graded batch) has written step marks: unchanged
    expect(scorecardUpgradeCopy(variantFor("quick-practice", marks(7, 10)))?.text).toContain("Get every answer marked like this");
  });
  it("full marks gets the full-marks line", () => {
    expect(scorecardUpgradeCopy(variantFor("check-improve", marks(5, 5)))?.text).toBe(
      "Full marks! Keep every answer marked like this till your boards — Board Pass →",
    );
  });
  it("no number when marks are unknown: attempts score, ungraded questions, awaited sheet", () => {
    const attempts = variantFor("quick-practice", { kind: "attempts", attempted: 3, ofN: 5, mcqAnswered: 3, mcqCorrect: 2 });
    const noneLost = variantFor("quick-practice", { kind: "attempts", attempted: 3, ofN: 5, mcqAnswered: 3, mcqCorrect: 3 });
    expect(scorecardUpgradeCopy(noneLost)?.text).toBe("Get every answer marked like this till your boards — Board Pass →");
    expect(scorecardUpgradeCopy(attempts)?.text).not.toBe("Get every answer marked like this till your boards — Board Pass →");
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
    expect(line).toHaveTextContent(surface === "quick-practice" ? "You lost 1 mark here. Upload your working" : "You lost 4 marks here.");
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

describe("ASK-COPY-1: the trial leads where the student can still start it (never on mount)", () => {
  const v = variantFor("worksheet", marks(6, 10));
  it("an account that never had a trial sees 'Start your free 7-day trial' first and the Board Pass line second", () => {
    render(<MemoryRouter><ResultsScorecard variant={v} onClose={() => {}} /></MemoryRouter>);
    const lead = screen.getByTestId("scorecard-trial-lead");
    const line = screen.getByTestId("scorecard-upgrade-line");
    expect(lead).toHaveTextContent("Start your free 7-day trial");
    expect(lead.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(line).toHaveTextContent("Board Pass");
  });
  it("a tap opens the sheet; nothing starts a trial by itself", () => {
    render(<MemoryRouter><ResultsScorecard variant={v} onClose={() => {}} /></MemoryRouter>);
    expect(screen.queryByTestId("upgrade-sheet")).toBeNull();
    fireEvent.click(screen.getByTestId("scorecard-trial-lead"));
    expect(screen.getByTestId("upgrade-sheet")).toBeInTheDocument();
  });
  it("a student who already had a trial (running or ended) is never offered a second one", () => {
    auth.trialStart = "2026-10-01T00:00:00.000Z";
    render(<MemoryRouter><ResultsScorecard variant={v} onClose={() => {}} /></MemoryRouter>);
    expect(screen.queryByTestId("scorecard-trial-lead")).toBeNull();
    expect(screen.getByTestId("scorecard-upgrade-line")).toBeInTheDocument();
  });
});

describe("FIRST-OFFER-1: the first-result offer names the Board Pass price, then a quiet Chapter Pack", () => {
  it("the copy carries the price it is given and never says 'unlimited'", () => {
    const t = scorecardUpgradeCopy(variantFor("worksheet", marks(7, 10)), "₹1,234")?.text ?? "";
    expect(t).toBe("You lost 3 marks here. Get every answer marked like this till your boards — Board Pass ₹1,234 →");
    for (const surface of SURFACES) {
      const score = surface === "quick-practice" ? ({ kind: "attempts", attempted: 3, ofN: 5, mcqAnswered: 3, mcqCorrect: 1 } as const) : marks(5, 5);
      expect(scorecardUpgradeCopy(variantFor(surface, score), "₹1,234")?.text).not.toMatch(/unlimited/i);
    }
  });
  it("renders the real price and a pack line to plain /packs when the chapter is unknown (Basic, trial ended)", () => {
    auth.trialStart = "2026-01-01T00:00:00.000Z";
    render(<MemoryRouter><ResultsScorecard variant={variantFor("worksheet", marks(6, 10))} onClose={() => {}} /></MemoryRouter>);
    const price = boardPassPriceNow();
    expect(price).toMatch(/^₹/);
    expect(screen.getByTestId("scorecard-upgrade-line")).toHaveTextContent(`Board Pass ${price} →`);
    const pack = screen.getByTestId("scorecard-pack-line");
    expect(pack).toHaveTextContent("Prefer practising on paper? PDF packs from ₹49 — printed, with answer keys →");
    expect(pack).toHaveAttribute("href", "/packs");
    expect(screen.getByTestId("scorecard-upgrade-line").compareDocumentPosition(pack) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("deep-links the chapter the result names", () => {
    auth.trialStart = "2026-01-01T00:00:00.000Z";
    const v = { ...variantFor("quick-practice", marks(6, 10)), guideTarget: { to: "/practice/quick/triangles?weakMode=1" } } as ScorecardVariant;
    render(<MemoryRouter><ResultsScorecard variant={v} onClose={() => {}} /></MemoryRouter>);
    expect(screen.getByTestId("scorecard-pack-line")).toHaveAttribute("href", "/packs?chapter=triangles");
    expect(screen.getByTestId("scorecard-pack-line")).toHaveTextContent("Prefer practising on paper? Chapter Pack ₹49 — printed questions with answer keys →");
  });
  it("PACK-BASIC-ONLY-1: the pack line shows ONLY to Basic (trial ended, or never trialled and hydrated)", () => {
    const mount = () => render(<MemoryRouter><ResultsScorecard variant={variantFor("worksheet", marks(6, 10))} onClose={() => {}} /></MemoryRouter>);
    // trial active -> hidden (the Board Pass line is the control that the card rendered)
    auth.tier = "trial";
    auth.trialStart = "2026-10-27T00:00:00.000Z";
    mount();
    expect(screen.getByTestId("scorecard-upgrade-line")).toBeInTheDocument();
    expect(screen.queryByTestId("scorecard-pack-line")).toBeNull();
    cleanup();
    // Basic, trial ended -> shown
    auth.tier = "free";
    mount();
    expect(screen.getByTestId("scorecard-pack-line")).toBeInTheDocument();
    cleanup();
    // never-trialled Basic: hidden until the cloud has answered, then shown
    auth.trialStart = null;
    mount();
    expect(screen.queryByTestId("scorecard-pack-line")).toBeNull();
    act(() => auth.listeners.forEach((l) => l("u1", { tier: "free", trialStartDate: null })));
    expect(screen.getByTestId("scorecard-pack-line")).toBeInTheDocument();
    cleanup();
    // a trial student whose cache was empty is never shown it, even after the cloud answers
    auth.listeners = [];
    mount();
    act(() => auth.listeners.forEach((l) => l("u1", { tier: "trial", trialStartDate: "2026-10-27T00:00:00.000Z" })));
    expect(screen.queryByTestId("scorecard-pack-line")).toBeNull();
  });
  it("paid Premium sees neither line", () => {
    auth.tier = "premium";
    render(<MemoryRouter><ResultsScorecard variant={variantFor("worksheet", marks(6, 10))} onClose={() => {}} /></MemoryRouter>);
    expect(screen.queryByTestId("scorecard-pack-line")).toBeNull();
  });
});
