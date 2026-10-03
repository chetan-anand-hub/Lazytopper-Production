/**
 * TRIAL-ON-SIGNUP-1 · T2 / T4 / T5 on Check & Improve.
 *
 *   T2  a NEW account (its trial started at sign-up) returning through the free check sees
 *       the confirmation — owner copy word for word, the trial's REAL end date — and
 *       "Check my next answer" opens Check & Improve fresh. An EXISTING account without a
 *       trial keeps today's offer, but "Maybe later" goes HOME, never to a lock.
 *   T4  every lock a signed-in Basic student meets here (P10) lists "Free on Basic:" + the
 *       Pricing Basic rows.
 *
 * Dates: the label is derived from the fixture's stored START only (start + TRIAL_DAYS),
 * never from today, so this file passes at any clock (both CI LT_TEST_CLOCK instants).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

const H = vi.hoisted(() => ({
  auth: { user: null as null | Record<string, unknown>, loading: false },
  sub: {
    isPremium: false,
    isTrialExpired: false,
    hydrated: true,
    tier: "free",
    isTrialActive: false,
    daysLeftInTrial: 0,
    startTrial: vi.fn(),
    upgradeToPremium: vi.fn(),
    status: {
      tier: "free",
      plan: "none",
      trialStartDate: null as string | null,
      trialEndDate: null,
      premiumSince: null,
    },
  },
  phase: "none" as "none" | "saving" | "saved",
  startedAtSignUp: new Set<string>(),
  track: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => H.auth }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => H.sub }));
vi.mock("../../hooks/useFreeCheckReturn", () => ({
  useFreeCheckReturn: (user: unknown, enabled: boolean) => (user && enabled ? H.phase : "none"),
}));
// vi.mock is a COMPLETE replacement: FRICTION-FIX-1 · F5 added clearTrialStartedAtSignUp,
// which the confirmation's "Check my next answer" now calls, so the mock carries it too.
vi.mock("../../services/newAccountTrial", () => ({
  wasTrialStartedAtSignUp: (uid: string | null | undefined) => Boolean(uid) && H.startedAtSignUp.has(uid as string),
  clearTrialStartedAtSignUp: () => H.startedAtSignUp.clear(),
}));
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackNamedEvent: (...a: unknown[]) => H.track(...a) };
});

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";
import { BASIC_FREE_LABELS, FREE_FEATURES } from "../../components/pricing/BasicFreeList";
import { MONTHLY_INLINE } from "../../config/pricing";

const NEW_USER = { uid: "u-new", email: "n@example.com", phoneNumber: null, displayName: "N" };
const OLD_USER = { uid: "u-old", email: "o@example.com", phoneNumber: null, displayName: "O" };

/** A stored trial start; its label is start + 7 days, "8 October 2026" style. */
const STORED_START = "2026-10-01T10:00:00.000Z";
const EXPECTED_END = "8 October 2026";

function HomeProbe() {
  return <div data-testid="home-probe">HOME</div>;
}
function renderPage(props: { overlay?: { onClose: () => void } } = {}) {
  return render(
    <MemoryRouter initialEntries={["/check-improve"]}>
      <Routes>
        <Route path="/check-improve" element={<DesktopCheckImprovePage {...props} />} />
        <Route path="/" element={<HomeProbe />} />
        <Route path="/login" element={<div data-testid="login-probe" />} />
      </Routes>
    </MemoryRouter>,
  );
}

function asActiveTrial(start: string) {
  H.sub.isPremium = true;
  H.sub.isTrialActive = true;
  H.sub.tier = "trial";
  H.sub.status = { ...H.sub.status, tier: "trial", plan: "trial_7day", trialStartDate: start };
}

beforeEach(() => {
  window.localStorage.clear();
  H.auth = { user: null, loading: false };
  H.sub.isPremium = false;
  H.sub.isTrialExpired = false;
  H.sub.isTrialActive = false;
  H.sub.hydrated = true;
  H.sub.tier = "free";
  H.sub.startTrial = vi.fn();
  H.sub.status = { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null };
  H.phase = "none";
  H.startedAtSignUp.clear();
  H.track.mockReset();
  setMatchMediaMatches(true);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const flagOn = () => vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
const flagOff = () => vi.stubEnv("VITE_FREE_CHECK_ENABLED", "");

describe("T2 — a NEW account: the confirmation replaces the offer", () => {
  beforeEach(() => {
    flagOn();
    H.auth = { user: NEW_USER, loading: false };
    H.phase = "saved";
    H.startedAtSignUp.add(NEW_USER.uid);
    asActiveTrial(STORED_START);
  });

  it("shows the owner copy word for word with the trial's REAL end date, and starts nothing", async () => {
    const { container } = renderPage();
    const box = screen.getByTestId("free-check-trial-confirmation");
    expect(screen.getByRole("heading", { name: "Your 7-day trial is on ✅" })).toBeInTheDocument();
    expect(box.textContent).toContain(
      // TRIAL-ON-SIGNUP-1b (owner addendum, wave B-6), word for word; price = MONTHLY_INLINE.
      `Ends ${EXPECTED_END}. No card, nothing to cancel. After that, keep free Basic or upgrade to Premium at ${MONTHLY_INLINE}.`,
    );
    // "See plans →" goes to /pricing (router Link — the app's basename adds /app/).
    expect(screen.getByRole("link", { name: "See plans →" }).getAttribute("href")).toBe("/pricing");
    expect(screen.getByRole("button", { name: "Check my next answer" })).toBeInTheDocument();
    // not the offer, not a lock
    expect(container.textContent).not.toContain("Your answer is saved.");
    expect(container.textContent).not.toMatch(/Start my free trial/);
    expect(container.textContent).not.toContain("Premium Feature");
    await act(async () => {});
    expect(H.sub.startTrial).not.toHaveBeenCalled();
    expect(H.track.mock.calls.filter(([n]) => n === "trial_start")).toHaveLength(0);
  });

  it("the date follows the STORED start, not today (a different start → a different end)", () => {
    asActiveTrial("2026-12-28T04:00:00.000Z");
    renderPage();
    expect(screen.getByTestId("free-check-trial-confirmation").textContent).toContain("Ends 4 January 2027.");
  });

  it("'Check my next answer' → Check & Improve, fresh (the page, not the confirmation)", async () => {
    const { container } = renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Check my next answer" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Read the question/ })).toBeInTheDocument());
    expect(container.textContent).not.toContain("Your 7-day trial is on");
    expect(H.sub.startTrial).not.toHaveBeenCalled();
    // F5 — continuing forgets the sign-up marker (display-only: nothing was started above)
    expect(H.startedAtSignUp.size).toBe(0);
  });

  it("MOBILE width: the same confirmation", () => {
    setMatchMediaMatches(false);
    renderPage();
    expect(screen.getByTestId("free-check-trial-confirmation").textContent).toContain(`Ends ${EXPECTED_END}.`);
  });

  it("not hydrated yet → the saving panel, never a confirmation off a stale cache", () => {
    H.sub.hydrated = false;
    const { container } = renderPage();
    expect(container.textContent).toContain("Saving your answer…");
    expect(screen.queryByTestId("free-check-trial-confirmation")).toBeNull();
  });
});

describe("T2 — an EXISTING account keeps today's behaviour, except 'Maybe later' → Home", () => {
  beforeEach(() => {
    flagOn();
    H.auth = { user: OLD_USER, loading: false };
    H.phase = "saved";
  });

  it("never trialled → today's offer (no confirmation)", () => {
    const { container } = renderPage();
    expect(container.textContent).toContain("Your answer is saved.");
    expect(screen.queryByTestId("free-check-trial-confirmation")).toBeNull();
  });

  it("'Maybe later' → HOME, never a locked page; no trial", async () => {
    const { container } = renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Maybe later" }));
    expect(await screen.findByTestId("home-probe")).toBeInTheDocument();
    expect(container.textContent).not.toContain("Premium Feature");
    expect(H.sub.startTrial).not.toHaveBeenCalled();
  });

  it("an existing account with an ACTIVE trial (not started by this sign-up) → no confirmation, the page", () => {
    asActiveTrial(STORED_START);
    renderPage();
    expect(screen.queryByTestId("free-check-trial-confirmation")).toBeNull();
    expect(screen.getByRole("button", { name: /Read the question/ })).toBeInTheDocument();
  });
});

describe("T4 / P10 — every lock a signed-in Basic student meets on Check & Improve lists what is free on Basic", () => {
  function expectBasicList(container: HTMLElement) {
    expect(container.textContent).toContain("Premium Feature");
    const list = screen.getByTestId("basic-free-list");
    expect(list.textContent).toContain("Free on Basic:");
    const items = Array.from(list.querySelectorAll("li")).map((li) => li.textContent?.replace(/^✓/, "").trim());
    expect(items).toEqual([...BASIC_FREE_LABELS]);
    // exactly the Pricing rows marked included, in Pricing's order
    expect(items).toEqual(FREE_FEATURES.filter((f) => f.included).map((f) => f.label));
    // the lock's current message is still there, above the list
    expect(container.textContent).toContain("Check & Improve is part of Premium.");
  }

  for (const width of ["desktop", "mobile"] as const) {
    it(`[${width}] flag OFF, direct visit → the lock + the Basic list`, () => {
      setMatchMediaMatches(width === "desktop");
      flagOff();
      H.auth = { user: OLD_USER, loading: false };
      const { container } = renderPage();
      expectBasicList(container);
    });

    it(`[${width}] flag ON, direct visit (no waiting free result) → the lock + the Basic list`, () => {
      setMatchMediaMatches(width === "desktop");
      flagOn();
      H.auth = { user: OLD_USER, loading: false };
      const { container } = renderPage();
      expectBasicList(container);
    });

    it(`[${width}] the tutor overlay's Check & Improve → the lock + the Basic list`, () => {
      setMatchMediaMatches(width === "desktop");
      flagOn();
      H.auth = { user: OLD_USER, loading: false };
      const { container } = renderPage({ overlay: { onClose: vi.fn() } });
      expectBasicList(container);
    });
  }

  it("an EXPIRED trial meets the same lock (plans path) — with the Basic list too", () => {
    flagOn();
    H.auth = { user: OLD_USER, loading: false };
    H.sub.isTrialExpired = true;
    const { container } = renderPage();
    expectBasicList(container);
  });
});
