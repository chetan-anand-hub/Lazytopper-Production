/**
 * OFFERS-V2 - the paper walls (full mock, chapter test, worksheet): the one buying block inside the upgrade sheet.
 * Trial AND Basic see the packs (owner, 28 Oct + 2 Nov); paid Premium never; the way out is a small grey link at the bottom;
 * the "You keep Basic free, always ..." paragraph is gone from a paper wall. Each negative has a positive control.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const S = vi.hoisted(() => ({
  tier: "free" as string,
  trialStartDate: null as string | null,
  hydrated: true,
  uid: "u1",
  owned: [] as Array<{ packId: string }>,
  fail: false,
  track: vi.fn(),
  dismissed: vi.fn(),
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({ hydrated: S.hydrated, status: { tier: S.tier, trialStartDate: S.trialStartDate } }),
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: S.uid ? { uid: S.uid } : null, loading: false }) }));
vi.mock("../feedback/feedbackPromptHost", () => ({ notifyPaywallDismissed: () => S.dismissed(), notifyFirstGradedResult: vi.fn(), dismissFeedbackPromptFor: vi.fn() }));
vi.mock("../../services/packs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/packs")>();
  return {
    ...actual,
    fetchMyPacks: () => (S.fail ? Promise.reject(new Error("request failed: 500")) : Promise.resolve({ packs: S.owned, licensee: { name: "", email: "" }, boardPassCredit: null })),
  };
});
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackSaleMoment: (...a: unknown[]) => S.track(...a), trackPaywallAction: vi.fn() };
});

import { UpgradeSheet } from "./UpgradeSheet";
import FairUseLimitPanel from "../usage/FairUseLimitPanel";
import type { LimitState } from "../usage/fairUseGate";
import { resetOwnedPacksCache } from "../packs/useOwnedPacks";
import { boardPassPriceNow } from "../pricing/boardPassOffer";

type Offers = NonNullable<React.ComponentProps<typeof UpgradeSheet>["offers"]>;
const MOCK: Offers = { kind: "full-mock", subject: "maths" };
const CHAPTER: Offers = { kind: "chapter-test", chapterSlug: "triangles", chapterName: "Triangles" };

function wall(offers: Offers, props: Partial<React.ComponentProps<typeof UpgradeSheet>> = {}) {
  const onClose = vi.fn();
  render(
    <MemoryRouter initialEntries={["/practice/full-mock"]}>
      <UpgradeSheet featureLabel="Grading your full mock" offers={offers} onClose={onClose} {...props} />
    </MemoryRouter>,
  );
  return { onClose };
}
const rows = () => Array.from(document.querySelectorAll("[data-testid^='offers-row-']")).map((n) => n.getAttribute("data-testid")!.replace("offers-row-", ""));

// FLAKY-1: warm the lazy chunk(s) once, before the first test, so no test's findBy* window pays the cold transform + import
// (under parallel load that alone ran past the 5 s findBy budget). The component still loads them through its own lazy().
beforeAll(async () => {
  await Promise.all([import("../packs/OfferRows"), import("../packOwner/PackOwnerLine")]);
}, 60_000);

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-11-02T06:30:00.000Z"), toFake: ["Date"] }); // the Board Pass price follows the founding deadline
  vi.stubEnv("VITE_PACKS_ENABLED", "1");
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
  S.tier = "free";
  S.trialStartDate = "2026-10-20T00:00:00.000Z";
  S.hydrated = true;
  S.uid = "u1";
  S.owned = [];
  S.fail = false;
  S.track.mockClear();
  S.dismissed.mockClear();
  resetOwnedPacksCache();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("Basic (trial over) at a paper wall", () => {
  it("saved title, Board Pass card with a Pay button that goes straight to checkout, then the mock's pack rows highest price first", async () => {
    wall(MOCK);
    expect(screen.getByRole("heading")).toHaveTextContent("Your mock is saved. Get it marked like the board would.");
    expect(screen.getByTestId("upgrade-sheet-wall-body")).toHaveTextContent("Your MCQ score is ready; written answers are marked with the Board Pass.");
    const pay = screen.getByTestId("offers-pay");
    expect(pay).toHaveTextContent(`Get it for ${boardPassPriceNow()}`);
    expect(pay).toHaveAttribute("href", "/pricing?buy=board_pass");
    expect(screen.getByTestId("offers-board-pass")).toHaveTextContent("Every answer marked step by step, your AI tutor, and Mistake Intelligence");
    await screen.findByTestId("offers-packs");
    expect(rows()).toEqual(["pack_bundle", "pack_cbq", "pack_mock"]);
    expect(screen.getByTestId("offers-buy-pack_mock")).toHaveAttribute("href", "/packs?buy=pack_mock&t=maths");
    expect(screen.getByTestId("offers-buy-pack_bundle")).toHaveAttribute("href", "/packs?buy=pack_bundle");
  });
  it("a chapter test's wall offers that chapter's rows", async () => {
    wall(CHAPTER, { featureLabel: "Grading your chapter test" });
    expect(screen.getByRole("heading")).toHaveTextContent("Your chapter test is saved. Get it marked like the board would.");
    await screen.findByTestId("offers-packs");
    expect(rows()).toEqual(["pack_bundle", "pack_cbq", "pack_chapter"]);
    expect(screen.getByTestId("offers-row-pack_chapter")).toHaveTextContent("Triangles Chapter Pack");
  });
  it("the way out is a small grey link at the very bottom, labelled for Basic; the 'keep Basic free' paragraph and the old list are gone", async () => {
    const { onClose } = wall(MOCK);
    await screen.findByTestId("offers-packs");
    const out = screen.getByTestId("upgrade-sheet-dismiss");
    expect(out).toHaveTextContent("Continue with Basic (free)");
    const sheet = screen.getByTestId("upgrade-sheet");
    expect(sheet.lastElementChild).toBe(out);
    expect(sheet.textContent ?? "").not.toMatch(/You keep Basic free, always/);
    expect(screen.queryByText(/Keep using Basic/)).toBeNull();
    fireEvent.click(out);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(S.dismissed).toHaveBeenCalledTimes(1); // the feedback prompt hook still hears the dismissal
  });
  // LOCK-SELL-1: without `offers` the sheet keeps its Board Pass offer; its Basic exit is now the quiet "Continue with Basic".
  it("control: without `offers` the sheet keeps its own Board Pass offer and the quiet 'Continue with Basic'", () => {
    render(
      <MemoryRouter>
        <UpgradeSheet featureLabel="Checking your answer" onClose={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("upgrade-sheet-board-pass")).toBeInTheDocument();
    expect(screen.getByTestId("upgrade-sheet-basic")).toHaveTextContent("Continue with Basic");
    expect(screen.queryByTestId("offers-block")).toBeNull();
  });
});

describe("a trial student at this week's limit", () => {
  beforeEach(() => {
    S.tier = "trial";
  });
  it("sees 'saved, want it marked now' with the packs too, and the way out reads 'Not now'", async () => {
    wall(MOCK);
    expect(screen.getByRole("heading")).toHaveTextContent("Your mock is saved. Want it marked now?");
    expect(screen.getByTestId("offers-board-pass")).toHaveTextContent("Get this mock marked today, and every mock, chapter test and handwritten answer till your boards.");
    await screen.findByTestId("offers-packs");
    expect(rows()).toEqual(["pack_bundle", "pack_cbq", "pack_mock"]);
    expect(screen.getByTestId("upgrade-sheet-dismiss")).toHaveTextContent("Not now");
  });
});

describe("who never sees the packs on a wall", () => {
  it("paid Premium: no pack rows and no ownership read (control: Basic sees them)", async () => {
    S.tier = "premium";
    wall(MOCK);
    await act(async () => {});
    expect(screen.queryByTestId("offers-packs")).toBeNull();
    cleanup();
    S.tier = "free";
    wall(MOCK);
    expect(await screen.findByTestId("offers-packs")).toBeInTheDocument();
  });
  it("a record that is not hydrated yet: no pack rows (no flash for a paid student)", async () => {
    S.hydrated = false;
    wall(MOCK);
    await act(async () => {});
    expect(screen.queryByTestId("offers-packs")).toBeNull();
    expect(screen.getByTestId("offers-board-pass")).toBeInTheDocument();
  });
  it("owned packs are hidden; the Bundle does not hide CBQ; a failed read hides every row", async () => {
    S.owned = [{ packId: "pack_bundle:all" }];
    wall(MOCK);
    await waitFor(() => expect(rows()).toEqual(["pack_cbq"]));
    cleanup();
    resetOwnedPacksCache();
    S.fail = true;
    wall(MOCK);
    await act(async () => {});
    expect(screen.queryByTestId("offers-packs")).toBeNull();
    expect(screen.getByTestId("offers-board-pass")).toBeInTheDocument();
  });
  it("the packs switch off: the Board Pass card only", async () => {
    vi.stubEnv("VITE_PACKS_ENABLED", "");
    wall(MOCK);
    await act(async () => {});
    expect(screen.queryByTestId("offers-packs")).toBeNull();
    expect(screen.getByTestId("offers-pay")).toBeInTheDocument();
  });
});

describe("the free week still leads for an account that never had a trial", () => {
  it("shown ABOVE the Board Pass card", () => {
    S.trialStartDate = null;
    wall(MOCK);
    const lead = screen.getByTestId("start-trial-cta");
    expect(lead.compareDocumentPosition(screen.getByTestId("offers-board-pass")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("a student who already had a trial is not offered another (control: the card is there)", () => {
    wall(MOCK);
    expect(screen.queryByTestId("start-trial-cta")).toBeNull();
    expect(screen.getByTestId("offers-board-pass")).toBeInTheDocument();
  });
});

describe("events and honest copy", () => {
  it("surface is wall-<kind>; the card is rank 1 and the rows follow", async () => {
    wall(MOCK);
    await screen.findByTestId("offers-packs");
    // PACK-OWNER-GATES-1: the rows' "shown" fires in a passive effect after the rows paint; under CI load (the sheet now also loads the
    // pack-owner chunk) that effect can land a tick after findByTestId resolves, so wait for it rather than racing it.
    await waitFor(() => {
      expect(S.track).toHaveBeenCalledWith("sale_moment_shown", { surface: "wall-full-mock", offer: "board_pass", rank: 1 });
      expect(S.track).toHaveBeenCalledWith("sale_moment_shown", { surface: "wall-full-mock", offer: "pack_mock", rank: 4 });
    });
    fireEvent.click(screen.getByTestId("offers-pay"));
    expect(S.track).toHaveBeenLastCalledWith("sale_moment_tap", { surface: "wall-full-mock", offer: "board_pass", rank: 1 });
  });
  it("never ₹599 / ₹999 / a saving claim", async () => {
    wall(MOCK);
    await screen.findByTestId("offers-packs");
    expect(screen.getByTestId("upgrade-sheet").textContent ?? "").not.toMatch(/599|999|\bsave\b|\bsaving|%/i);
  });
});

describe("the calm trial-limit panel (the weekly wall) gets the same rows", () => {
  const limit: LimitState = { tier: "trial", scope: "full-mock", resetAt: null, window: "week", allowance: 1 } as LimitState;
  const panel = (l: LimitState, offers: Offers | null) =>
    render(
      <MemoryRouter>
        <FairUseLimitPanel limit={l} offers={offers} />
      </MemoryRouter>,
    );
  it("the rows replace the one generic pack line; Pay goes straight to checkout; premium refusal shows neither", async () => {
    panel(limit, MOCK);
    await screen.findByTestId("offers-packs");
    expect(rows()).toEqual(["pack_bundle", "pack_cbq", "pack_mock"]);
    expect(screen.queryByTestId("fair-use-pack-line")).toBeNull();
    expect(screen.queryByTestId("offers-board-pass")).toBeNull(); // the panel's own Board Pass line and Pay stay the card
    cleanup();
    panel({ ...limit, tier: "premium" }, MOCK);
    await act(async () => {});
    expect(screen.getByTestId("fair-use-limit-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("offers-packs")).toBeNull();
  });
});
