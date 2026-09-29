/**
 * TRIAL-CTA-1 · T2 — Pricing's Premium button is state-aware.
 *
 * Before: "Start 7-day trial" navigated to /login for EVERYONE — a signed-in student
 * just bounced back with no trial. Now:
 *
 *   signed out            -> the unchanged button -> the sign-in door with the intent (T1)
 *   signed in, eligible   -> startTrial() here, once -> "has started. It ends on <date>."
 *   trial active          -> no button; "Your trial is active — <N> days left."
 *   trial used            -> no button; "You've used your free trial."
 *   premium               -> no button; "Premium is active."
 *
 * The REAL useSubscription and the REAL activateTrial run; only the cloud read is
 * stubbed (it answers with the fixture and, like the real one, caches it).
 *
 * T5: every date is derived from Date.now() at run time; the expected strings are
 * computed with the same derivation, never typed as a calendar date.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import type { SubscriptionStatus } from "../services/subscriptionService";

const authState: { user: { uid: string } | null } = { user: null };

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, loading: false }),
}));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
vi.mock("../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/subscriptionService")>();
  return {
    ...actual,
    activateTrial: vi.fn((uid: string) => actual.activateTrial(uid)),
    hydrateSubscriptionFromCloud: vi.fn(),
  };
});
vi.mock("../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../analytics/analytics")>();
  return { ...actual, trackNamedEvent: vi.fn() };
});

import PricingPage from "./PricingPage";
import * as svc from "../services/subscriptionService";
import * as analytics from "../analytics/analytics";

const hydrate = svc.hydrateSubscriptionFromCloud as unknown as ReturnType<typeof vi.fn>;
const activate = svc.activateTrial as unknown as ReturnType<typeof vi.fn>;
const track = analytics.trackNamedEvent as unknown as ReturnType<typeof vi.fn>;

const UID = "uid-pricing-1";
const STORAGE_KEY = `lazytopper.subscription.v1:${UID}`;
const DAY = 24 * 60 * 60 * 1000;

function status(over: Partial<SubscriptionStatus>): SubscriptionStatus {
  return { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null, ...over };
}
const FREE = status({});
const ACTIVE = status({ tier: "trial", plan: "trial_7day", trialStartDate: new Date(Date.now() - 2 * DAY).toISOString() });
const TRIAL_USED = status({ trialStartDate: new Date(Date.now() - 10 * DAY).toISOString() });
const PREMIUM = status({ tier: "premium", plan: "premium_monthly", premiumSince: new Date(Date.now() - DAY).toISOString() });
const PASS_ENDED = status({ plan: "pass_month", passEnd: new Date(Date.now() - DAY).toISOString() });

function cloudHolds(cloud: SubscriptionStatus) {
  hydrate.mockImplementation(async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cloud));
    return cloud;
  });
}
function cloudEchoesDevice() {
  hydrate.mockImplementation(async (uid: string) => svc.loadSubscription(uid));
}

function LoginProbe() {
  const loc = useLocation();
  return <div data-testid="login-probe">{`${loc.pathname}${loc.search}`}</div>;
}

function renderPricing() {
  return render(
    <MemoryRouter initialEntries={["/pricing"]}>
      <Routes>
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** The Premium card — the one whose features list is labelled "Premium plan features". */
function premiumCard(): HTMLElement {
  const list = screen.getByRole("list", { name: "Premium plan features" });
  return list.closest(".lt-pricing-card") as HTMLElement;
}
const trialButton = () => screen.queryByRole("button", { name: "Start 7-day trial" });
/** The state sentence (the role=status paragraph — the sibling <style> is not text). */
const trialMsg = () => screen.getByRole("status").textContent;
const trialStarts = () => track.mock.calls.filter(([name]) => name === "trial_start").length;
const endsOnFrom = (startIso: string) =>
  new Date(new Date(startIso).getTime() + svc.TRIAL_DAYS * DAY).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

beforeEach(() => {
  authState.user = null;
  localStorage.clear();
  hydrate.mockReset();
  activate.mockClear();
  track.mockClear();
});
afterEach(cleanup);

describe("T2 · signed out — the render is unchanged", () => {
  it("the same button, the same element, and it carries the trial intent to the sign-in door", () => {
    renderPricing();
    const btn = trialButton();
    expect(btn).not.toBeNull();
    // Byte-for-byte the pre-lane element: no disabled attribute, no wrapper, no state.
    expect(btn!.outerHTML).toBe(
      '<button type="button" class="lt-pricing-cta lt-pricing-cta--primary">Start 7-day trial</button>',
    );
    expect(screen.queryByTestId("pricing-trial-state")).toBeNull();

    fireEvent.click(btn!);
    expect(screen.getByTestId("login-probe").textContent).toBe("/login?reason=start-trial&redirect=%2Fpricing");
    expect(activate).not.toHaveBeenCalled();
    expect(trialStarts()).toBe(0);
  });
});

describe("T2 · signed in", () => {
  it("★ eligible: the click calls startTrial EXACTLY once, fires trial_start once, and does NOT go to sign-in", async () => {
    cloudEchoesDevice();
    authState.user = { uid: UID };
    renderPricing();
    await act(async () => {});
    const btn = trialButton();
    expect(btn).not.toBeNull();
    expect(btn!.hasAttribute("disabled")).toBe(false);

    fireEvent.click(btn!);
    fireEvent.click(btn!); // a double tap on the same element

    expect(screen.queryByTestId("login-probe")).toBeNull();
    expect(activate).toHaveBeenCalledTimes(1);
    expect(activate).toHaveBeenCalledWith(UID);
    expect(trialStarts()).toBe(1);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as SubscriptionStatus;
    expect(stored.tier).toBe("trial");
    const state = screen.getByTestId("pricing-trial-state");
    expect(state.textContent).toContain(
      `Your 7-day trial has started. It ends on ${endsOnFrom(stored.trialStartDate as string)}.`,
    );
    const link = screen.getByRole("link", { name: "Start practising" });
    expect(link.getAttribute("href")).toBe("/practice-hub");
    expect(trialButton()).toBeNull();
  });

  it("★ after the start, a reload shows the ACTIVE state and starts nothing again", async () => {
    cloudEchoesDevice();
    authState.user = { uid: UID };
    renderPricing();
    await act(async () => {});
    fireEvent.click(trialButton()!);
    const firstStart = (JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as SubscriptionStatus).trialStartDate;

    cleanup();
    renderPricing();
    await act(async () => {});
    expect(trialButton()).toBeNull();
    expect(trialMsg()).toMatch(/Your trial is active — \d+ days? left\./);
    expect(activate).toHaveBeenCalledTimes(1);
    expect(trialStarts()).toBe(1);
    expect((JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as SubscriptionStatus).trialStartDate).toBe(firstStart);
  });

  it("before this account's record has hydrated, the button is disabled and a click starts nothing", async () => {
    hydrate.mockImplementation(() => new Promise<SubscriptionStatus>(() => {}));
    authState.user = { uid: UID };
    renderPricing();
    await act(async () => {});
    const btn = trialButton();
    expect(btn).not.toBeNull();
    expect(btn!.hasAttribute("disabled")).toBe(true);
    fireEvent.click(btn!);
    expect(activate).not.toHaveBeenCalled();
    expect(trialStarts()).toBe(0);
    expect(screen.queryByTestId("login-probe")).toBeNull();
  });

  it("trial active → no button; \"Your trial is active — <N> days left.\" + Start practising", async () => {
    cloudHolds(ACTIVE);
    authState.user = { uid: UID };
    renderPricing();
    await act(async () => {});
    const n = svc.getDaysLeftInTrial(ACTIVE);
    expect(n).toBeGreaterThan(1);
    expect(trialButton()).toBeNull();
    expect(trialMsg()).toContain(`Your trial is active — ${n} days left.`);
    expect(screen.getByRole("link", { name: "Start practising" })).toBeTruthy();
    expect(activate).not.toHaveBeenCalled();
  });

  it("trial used, not premium → no button; \"You've used your free trial.\"; the pass info is unchanged", async () => {
    cloudHolds(TRIAL_USED);
    authState.user = { uid: UID };
    renderPricing();
    await act(async () => {});
    expect(trialButton()).toBeNull();
    expect(trialMsg()).toBe("You've used your free trial.");
    expect(screen.queryByRole("link", { name: "Start practising" })).toBeNull();
    // The buy area above is untouched (payments dark in tests -> the manual-activation copy).
    expect(premiumCard().textContent).toContain("Manual activation during beta.");
    expect(activate).not.toHaveBeenCalled();
    expect(trialStarts()).toBe(0);
  });

  it("premium → no button; \"Premium is active.\"", async () => {
    cloudHolds(PREMIUM);
    authState.user = { uid: UID };
    renderPricing();
    await act(async () => {});
    expect(trialButton()).toBeNull();
    expect(trialMsg()).toBe("Premium is active.");
    expect(activate).not.toHaveBeenCalled();
  });

  it("a pass that has ended (never trialled) → no button, and the pass record is never rewritten", async () => {
    cloudHolds(PASS_ENDED);
    authState.user = { uid: UID };
    renderPricing();
    await act(async () => {});
    expect(trialButton()).toBeNull();
    expect(trialMsg()).toBe("Your pass has ended.");
    expect(activate).not.toHaveBeenCalled();
    expect(trialStarts()).toBe(0);
  });
});
