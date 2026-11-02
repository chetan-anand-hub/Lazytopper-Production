// ASK-FIX-1 / OFFERS-V2 - the scorecard's upgrade line and (on a fresh result) the one buying block: real marks only, never for Premium, on all six surfaces.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const auth = vi.hoisted(() => ({ user: { uid: "u1" } as { uid: string } | null, tier: "free" as string, hydrated: true, trialStart: null as string | null, listeners: [] as Array<(uid: string, s: unknown) => void>, owned: [] as Array<{ packId: string }>, fail: false }));
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
vi.mock("../../services/packs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/packs")>();
  return { ...actual, fetchMyPacks: () => (auth.fail ? Promise.reject(new Error("request failed: 500")) : Promise.resolve({ packs: auth.owned, licensee: { name: "", email: "" }, boardPassCredit: null })) };
});
vi.mock("../feedback/feedbackPromptHost", () => ({ notifyFirstGradedResult: vi.fn(), notifyPaywallDismissed: vi.fn(), dismissFeedbackPromptFor: vi.fn() }));

import ResultsScorecard from "./ResultsScorecard";
import { scorecardHeadline, scorecardUpgradeCopy } from "./ScorecardUpgradeLine";
import { boardPassPriceNow } from "../pricing/boardPassOffer";
import * as analytics from "../../analytics/analytics";
import { resetOwnedPacksCache } from "../packs/useOwnedPacks";
import { PACK_PRICE_INR } from "../../services/packs";
import type { ScorecardSurface, ScorecardVariant } from "./scorecardVariants";

const track = analytics.trackScorecardUpgrade as unknown as ReturnType<typeof vi.fn>;
const marks = (awarded: number, total: number) => ({ kind: "marks" as const, awarded, total });
const variantFor = (surface: ScorecardSurface, score: ScorecardVariant["score"]): ScorecardVariant =>
  ({ surface, title: "T", subtitle: "S", score, actions: [] }) as unknown as ScorecardVariant;
const SURFACES: ScorecardSurface[] = ["check-improve", "worksheet", "chapter-test", "full-mock", "quick-practice"];

beforeEach(() => {
  vi.stubEnv("VITE_PACKS_ENABLED", "1"); // SALE-MOMENT-1: the pack line is behind the packs switch
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "1"); // OFFERS-V2: Pay goes to checkout only while payments are on
  resetOwnedPacksCache();
  auth.owned = [];
  auth.fail = false;
  auth.user = { uid: "u1" };
  auth.tier = "free";
  auth.hydrated = true;
  auth.trialStart = null;
  auth.listeners = [];
  track.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

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

describe("OFFERS-V2: the headline is the result's own numbers (never invented)", () => {
  it("marks lost / full marks / unknown", () => {
    expect(scorecardHeadline(variantFor("full-mock", marks(52, 80)))).toEqual(["You lost 28 marks.", "Let\u2019s win them back before boards."]);
    expect(scorecardHeadline(variantFor("worksheet", marks(9, 10)))).toEqual(["You lost 1 mark.", "Let\u2019s win them back before boards."]);
    expect(scorecardHeadline(variantFor("worksheet", marks(8.5, 10)))?.[0]).toBe("You lost 1.5 marks.");
    expect(scorecardHeadline(variantFor("check-improve", marks(5, 5)))).toEqual(["Full marks!", "Keep every answer marked like this till your boards."]);
  });
  it("Quick Practice MCQs: the wrong count and the slip-or-gap question", () => {
    const qp = (answered: number, correct: number) => variantFor("quick-practice", { kind: "attempts", attempted: answered, ofN: 10, mcqAnswered: answered, mcqCorrect: correct });
    expect(scorecardHeadline(qp(10, 7))).toEqual(["3 wrong.", "A slip, or a concept gap?"]);
    expect(scorecardHeadline(qp(5, 5))).toEqual(["Get every answer marked like this till your boards."]);
  });
  it("no number when marks are unknown (pending, awaited sheet); nothing on an all-pending or deferred card", () => {
    const pending = { ...variantFor("worksheet", marks(4, 10)), pending: { count: 1, worksheetTotalMarks: 10 } } as ScorecardVariant;
    expect((scorecardHeadline(pending) ?? []).join(" ")).not.toMatch(/\d/);
    const awaiting = { ...variantFor("chapter-test", marks(4, 10)), awaitingSheet: true } as ScorecardVariant;
    expect((scorecardHeadline(awaiting) ?? []).join(" ")).not.toMatch(/\d/);
    expect(scorecardHeadline({ ...variantFor("worksheet", marks(0, 10)), allPending: { title: "x", detail: "y" } } as ScorecardVariant)).toBeNull();
    expect(scorecardHeadline({ ...variantFor("full-mock", marks(0, 10)), deferred: true } as ScorecardVariant)).toBeNull();
  });
});

const spyTap = () => vi.spyOn(analytics, "trackSaleMoment");

describe("the shell renders the block on every grading surface (one call site: ResultsScorecard)", () => {
  it.each(SURFACES)("%s: a non-Premium student sees the headline and the Board Pass card, and Pay goes straight to checkout", (surface) => {
    const spy = spyTap();
    const score = surface === "quick-practice"
      ? ({ kind: "attempts", attempted: 2, ofN: 5, mcqAnswered: 2, mcqCorrect: 1 } as const)
      : marks(6, 10);
    render(<MemoryRouter><ResultsScorecard variant={variantFor(surface, score)} onClose={() => {}} /></MemoryRouter>);
    expect(screen.getByTestId("offers-block")).toHaveAttribute("data-surface", surface);
    expect(screen.getByTestId("offers-headline")).toHaveTextContent(surface === "quick-practice" ? "1 wrong.A slip, or a concept gap?" : "You lost 4 marks.");
    const pay = screen.getByTestId("offers-pay");
    expect(pay).toHaveTextContent(`Pay ${boardPassPriceNow()}`);
    expect(pay).toHaveAttribute("href", "/pricing?buy=board_pass");
    expect(screen.getByTestId("offers-what-you-get")).toHaveAttribute("href", "/pricing");
    expect(track).toHaveBeenCalledWith("shown");
    expect(spy).toHaveBeenCalledWith("sale_moment_shown", { surface, offer: "board_pass", rank: 1 });
    fireEvent.click(pay);
    expect(track).toHaveBeenCalledWith("click");
    expect(spy).toHaveBeenCalledWith("sale_moment_tap", { surface, offer: "board_pass", rank: 1 });
    // OFFERS-V2: the tap goes to checkout; it no longer opens the upgrade sheet first.
    expect(screen.queryByTestId("upgrade-sheet")).toBeNull();
  });

  it("each surface's own benefit line (honest, no number)", () => {
    const want: Record<string, RegExp> = {
      "full-mock": /^Every answer you write, marked step by step like a CBSE examiner/,
      "check-improve": /^Check every answer like this till your boards/,
      "chapter-test": /^Every chapter test, mock and handwritten answer marked step by step/,
      worksheet: /^Every worksheet, chapter test and handwritten answer marked step by step/,
      "quick-practice": /^Upload your rough work and find out exactly why/,
    };
    for (const surface of SURFACES) {
      const score = surface === "quick-practice" ? ({ kind: "attempts", attempted: 2, ofN: 5, mcqAnswered: 2, mcqCorrect: 1 } as const) : marks(6, 10);
      render(<MemoryRouter><ResultsScorecard variant={variantFor(surface, score)} onClose={() => {}} /></MemoryRouter>);
      expect(screen.getByTestId("offers-board-pass").querySelector(".lt-offers__benefit")?.textContent ?? "").toMatch(want[surface]);
      cleanup();
    }
  });

  it("payments dark: the card only shows the plan (no Pay promise) and links to /pricing", () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "");
    render(<MemoryRouter><ResultsScorecard variant={variantFor("worksheet", marks(6, 10))} onClose={() => {}} /></MemoryRouter>);
    const pay = screen.getByTestId("offers-pay");
    expect(pay).toHaveTextContent(`See Board Pass ${boardPassPriceNow()}`);
    expect(pay).toHaveAttribute("href", "/pricing");
  });

  it("no ₹599 / ₹999 / crossed-out price / saving claim anywhere in the block", () => {
    render(<MemoryRouter><ResultsScorecard variant={variantFor("worksheet", marks(6, 10))} onClose={() => {}} /></MemoryRouter>);
    expect(screen.getByTestId("offers-block").textContent ?? "").not.toMatch(/599|999|save|%|unlimited/i);
    expect(screen.getByTestId("offers-block").querySelector("s, del, strike")).toBeNull();
  });

  it("the later price line comes from the pricing module while the founding offer is open (pinned clock), and says no date once it is closed", () => {
    vi.useFakeTimers({ now: new Date("2026-11-10T06:30:00.000Z"), toFake: ["Date"] });
    try {
      render(<MemoryRouter><ResultsScorecard variant={variantFor("worksheet", marks(6, 10))} onClose={() => {}} /></MemoryRouter>);
      expect(screen.getByTestId("offers-from-line")).toHaveTextContent("One payment · ₹2,499 from 1 Dec");
      expect(screen.getByTestId("offers-founding")).toHaveTextContent("Founding member offer");
      cleanup();
      vi.setSystemTime(new Date("2026-12-02T06:30:00.000Z"));
      render(<MemoryRouter><ResultsScorecard variant={variantFor("worksheet", marks(6, 10))} onClose={() => {}} /></MemoryRouter>);
      expect(screen.getByTestId("offers-from-line")).toHaveTextContent("One payment, no renewals");
      expect(screen.queryByTestId("offers-founding")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("a history re-open shows the quiet one line (no block) and does not count 'shown'", () => {
    render(<MemoryRouter><ResultsScorecard reopened variant={variantFor("worksheet", marks(6, 10))} onClose={() => {}} /></MemoryRouter>);
    expect(screen.getByTestId("scorecard-upgrade-line")).toBeInTheDocument();
    expect(screen.queryByTestId("offers-block")).toBeNull();
    expect(track).not.toHaveBeenCalledWith("shown");
  });

  it("the compact line still opens the Board Pass sheet (re-opened result)", () => {
    render(<MemoryRouter><ResultsScorecard reopened variant={variantFor("worksheet", marks(6, 10))} onClose={() => {}} /></MemoryRouter>);
    fireEvent.click(screen.getByTestId("scorecard-upgrade-line"));
    expect(track).toHaveBeenCalledWith("click");
    expect(screen.getByTestId("upgrade-sheet-board-pass")).toHaveTextContent("Board Pass");
  });

  it("a trial student sees it; a Premium student, a signed-out visitor and a bare render do not", () => {
    const v = variantFor("worksheet", marks(6, 10));
    auth.tier = "trial";
    render(<MemoryRouter><ResultsScorecard variant={v} onClose={() => {}} /></MemoryRouter>);
    expect(screen.queryByTestId("offers-board-pass")).not.toBeNull();
    cleanup();
    auth.tier = "premium";
    render(<MemoryRouter><ResultsScorecard variant={v} onClose={() => {}} /></MemoryRouter>);
    expect(screen.queryByTestId("offers-block")).toBeNull();
    expect(screen.queryByTestId("scorecard-upgrade-line")).toBeNull();
    cleanup();
    auth.tier = "free";
    auth.user = null;
    render(<MemoryRouter><ResultsScorecard variant={v} onClose={() => {}} /></MemoryRouter>);
    expect(screen.queryByTestId("offers-block")).toBeNull();
  });
});

describe("ASK-COPY-1: the trial leads where the student can still start it (never on mount)", () => {
  const v = variantFor("worksheet", marks(6, 10));
  it("an account that never had a trial sees 'Start your free 7-day trial' ABOVE the Board Pass card", () => {
    render(<MemoryRouter><ResultsScorecard variant={v} onClose={() => {}} /></MemoryRouter>);
    const lead = screen.getByTestId("scorecard-trial-lead");
    const card = screen.getByTestId("offers-board-pass");
    expect(lead).toHaveTextContent("Start your free 7-day trial");
    expect(lead.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("offers-headline").compareDocumentPosition(lead) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
    expect(screen.getByTestId("offers-board-pass")).toBeInTheDocument();
  });
});

describe("OFFERS-V2: the pack rows, per surface, highest price first", () => {
  const rowSkus = () => Array.from(document.querySelectorAll("[data-testid^='offers-row-']")).map((n) => n.getAttribute("data-testid")!.replace("offers-row-", ""));
  const withTarget = (surface: ScorecardSurface, to: string, chapter?: string, score: ScorecardVariant["score"] = marks(6, 10)) =>
    ({ ...variantFor(surface, score), guideTarget: { to, chapter } }) as ScorecardVariant;
  const show = (v: ScorecardVariant) => render(<MemoryRouter><ResultsScorecard variant={v} onClose={() => {}} /></MemoryRouter>);

  it("renders the real Board Pass price; with no chapter or subject known only the Bundle row is offered (never a guess)", async () => {
    auth.trialStart = "2026-01-01T00:00:00.000Z";
    show(variantFor("worksheet", marks(6, 10)));
    const price = boardPassPriceNow();
    expect(price).toMatch(/^₹/);
    expect(screen.getByTestId("offers-pay")).toHaveTextContent(price as string);
    await screen.findByTestId("offers-packs");
    expect(screen.getByText("Prefer practising on paper?")).toBeInTheDocument();
    expect(rowSkus()).toEqual(["pack_bundle"]);
    expect(screen.getByTestId("offers-buy-pack_bundle")).toHaveAttribute("href", "/packs?buy=pack_bundle");
    expect(screen.getByTestId("offers-row-pack_bundle")).toHaveTextContent("BEST VALUE");
    expect(screen.getByTestId("offers-row-pack_bundle")).toHaveTextContent("All 26 chapters + 16 mocks, the whole year");
  });
  it.each(["worksheet", "chapter-test"] as const)("%s: Bundle, the subject's CBQ Pack, this chapter's Chapter Pack - each button one tap to payment", async (surface) => {
    auth.trialStart = "2026-01-01T00:00:00.000Z";
    show(withTarget(surface, "/practice/10/maths?topic=triangles&weakMode=1", "Triangles"));
    await screen.findByTestId("offers-packs");
    expect(rowSkus()).toEqual(["pack_bundle", "pack_cbq", "pack_chapter"]);
    expect(screen.getByTestId("offers-buy-pack_cbq")).toHaveAttribute("href", "/packs?buy=pack_cbq&t=maths");
    expect(screen.getByTestId("offers-buy-pack_chapter")).toHaveAttribute("href", "/packs?buy=pack_chapter&t=triangles");
    expect(screen.getByTestId("offers-buy-pack_chapter")).toHaveTextContent(`₹${PACK_PRICE_INR.pack_chapter}`);
    expect(screen.getByTestId("offers-row-pack_chapter")).toHaveTextContent("Triangles Chapter Pack");
    expect(screen.getByTestId("offers-inside-pack_chapter")).toHaveAttribute("href", "/packs?chapter=triangles");
  });
  it("Answer Checker: Bundle, Subject, CBQ, Mock and Chapter rows, in that order", async () => {
    auth.trialStart = "2026-01-01T00:00:00.000Z";
    show(withTarget("check-improve", "/practice/10/science?topic=electricity", "Electricity"));
    await screen.findByTestId("offers-packs");
    expect(rowSkus()).toEqual(["pack_bundle", "pack_subject", "pack_cbq", "pack_mock", "pack_chapter"]);
  });
  it("a Full Mock result offers its subject's CBQ and Mock Pack with the Bundle, even when it also names a weak chapter", async () => {
    auth.trialStart = "2026-01-01T00:00:00.000Z";
    show({ ...withTarget("full-mock", "/practice/10/maths?topic=triangles", "Triangles", marks(40, 80)), saleMockSubject: "maths" } as ScorecardVariant);
    await screen.findByTestId("offers-packs");
    expect(rowSkus()).toEqual(["pack_bundle", "pack_cbq", "pack_mock"]);
    expect(screen.getByTestId("offers-buy-pack_mock")).toHaveAttribute("href", "/packs?buy=pack_mock&t=maths");
    expect(screen.getByTestId("offers-row-pack_mock")).toHaveTextContent("Maths Mock Pack");
  });
  it("Quick Practice: Bundle and the subject's CBQ Pack above its own pack card", async () => {
    auth.trialStart = "2026-01-01T00:00:00.000Z";
    const score = { kind: "attempts", attempted: 5, ofN: 10, mcqAnswered: 5, mcqCorrect: 3 } as const;
    show(withTarget("quick-practice", "/practice/10/maths?topic=triangles", "Triangles", score));
    await screen.findByTestId("offers-packs");
    expect(rowSkus()).toEqual(["pack_bundle", "pack_cbq"]);
    const promo = await screen.findByTestId("pack-promo-card");
    expect(screen.getByTestId("offers-packs").compareDocumentPosition(promo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it.each([
    ["pack_mock:maths", ["pack_bundle", "pack_cbq"]],
    ["pack_subject:maths", ["pack_bundle", "pack_cbq"]],
    ["pack_bundle:all", ["pack_cbq"]],
    ["pack_cbq:maths", ["pack_bundle", "pack_mock"]],
  ])("a Full Mock result hides what an owner of %s already has (the Bundle does not include CBQ)", async (id, want) => {
    auth.owned = [{ packId: id }];
    auth.trialStart = "2026-01-01T00:00:00.000Z";
    show({ ...variantFor("full-mock", marks(40, 80)), saleMockSubject: "maths" } as ScorecardVariant);
    await waitFor(() => expect(rowSkus()).toEqual(want));
  });
  it("an owner of every row sees the Board Pass card but no pack section", async () => {
    auth.owned = [{ packId: "pack_bundle:all" }, { packId: "pack_cbq:maths" }];
    auth.trialStart = "2026-01-01T00:00:00.000Z";
    show({ ...variantFor("full-mock", marks(40, 80)), saleMockSubject: "maths" } as ScorecardVariant);
    await act(async () => {});
    expect(screen.getByTestId("offers-board-pass")).toBeInTheDocument();
    expect(screen.queryByTestId("offers-packs")).toBeNull();
  });
  it("a failed ownership read hides every pack row (when unsure, never sell) but keeps the Board Pass card", async () => {
    auth.owned = null as unknown as Array<{ packId: string }>; // fetchMyPacks rejects below
    auth.fail = true;
    auth.trialStart = "2026-01-01T00:00:00.000Z";
    show(variantFor("worksheet", marks(6, 10)));
    await act(async () => {});
    expect(screen.getByTestId("offers-board-pass")).toBeInTheDocument();
    expect(screen.queryByTestId("offers-packs")).toBeNull();
  });
  it("no pack rows when the packs switch is off", async () => {
    vi.stubEnv("VITE_PACKS_ENABLED", "");
    auth.trialStart = "2026-01-01T00:00:00.000Z";
    show(variantFor("worksheet", marks(6, 10)));
    await act(async () => {});
    expect(screen.getByTestId("offers-board-pass")).toBeInTheDocument();
    expect(screen.queryByTestId("offers-packs")).toBeNull();
  });
  it("not on a re-opened old result", async () => {
    render(<MemoryRouter><ResultsScorecard reopened variant={withTarget("worksheet", "/practice/10/maths?topic=triangles")} onClose={() => {}} /></MemoryRouter>);
    await act(async () => {});
    expect(screen.queryByTestId("offers-packs")).toBeNull();
  });
  it("events: one 'shown' per offer with its rank (card 1, rows 2..), and a row tap carries sku + rank", async () => {
    const spy = spyTap();
    auth.trialStart = "2026-01-01T00:00:00.000Z";
    show(withTarget("chapter-test", "/practice/10/maths?topic=triangles", "Triangles"));
    await screen.findByTestId("offers-packs");
    const shown = spy.mock.calls.filter((c) => c[0] === "sale_moment_shown").map((c) => c[1]);
    expect(shown).toEqual([
      { surface: "chapter-test", offer: "board_pass", rank: 1 },
      { surface: "chapter-test", offer: "pack_bundle", rank: 2 },
      { surface: "chapter-test", offer: "pack_cbq", rank: 3 },
      { surface: "chapter-test", offer: "pack_chapter", rank: 4 },
    ]);
    fireEvent.click(screen.getByTestId("offers-buy-pack_cbq"));
    expect(spy).toHaveBeenLastCalledWith("sale_moment_tap", { surface: "chapter-test", offer: "pack_cbq", rank: 3 });
    fireEvent.click(screen.getByTestId("offers-inside-pack_chapter"));
    expect(spy).toHaveBeenLastCalledWith("sale_moment_tap", { surface: "chapter-test", offer: "pack_chapter_inside", rank: 4 });
  });
  it("PACK-BASIC-ONLY-1: the rows show to every non-paid student, and not before the status is known", async () => {
    const mount = () => show(variantFor("worksheet", marks(6, 10)));
    const rowsShown = () => screen.queryByTestId("offers-packs") !== null;
    // trial (any day) -> shown
    auth.tier = "trial";
    auth.trialStart = "2026-10-27T00:00:00.000Z";
    mount();
    expect(screen.getByTestId("offers-board-pass")).toBeInTheDocument();
    await screen.findByTestId("offers-packs");
    cleanup();
    // Basic, trial ended -> shown
    auth.tier = "free";
    mount();
    await screen.findByTestId("offers-packs");
    cleanup();
    // never-trialled Basic: hidden until the cloud has answered (no flash for a paid student), then shown
    auth.trialStart = null;
    mount();
    await act(async () => {});
    expect(rowsShown()).toBe(false);
    act(() => auth.listeners.forEach((l) => l("u1", { tier: "free", trialStartDate: null })));
    await screen.findByTestId("offers-packs");
    cleanup();
    // an unhydrated cache that turns out to be paid never showed the rows
    auth.listeners = [];
    mount();
    expect(rowsShown()).toBe(false);
    act(() => auth.listeners.forEach((l) => l("u1", { tier: "premium", trialStartDate: null })));
    await act(async () => {});
    expect(rowsShown()).toBe(false);
  });
  it("paid Premium sees nothing", () => {
    auth.tier = "premium";
    show(variantFor("worksheet", marks(6, 10)));
    expect(screen.queryByTestId("offers-block")).toBeNull();
  });
});
