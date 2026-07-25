import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// [FU-TRIAL-HAS-NO-ACTIVATION-PATH] — the premium paywall (RequirePremium) now carries the
// ONLY client trial-activation path. These tests use the REAL useSubscription hook (only the
// async cloud read is stubbed; activateTrial is a spy wrapping the real impl) so the click →
// startTrial → isPremium-flip → gated-child cascade is genuinely exercised, not mocked.

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1" }, loading: false }) }));
// Stub the plans modal to a visible marker so we can assert the "See plans" path.
vi.mock("../UpgradeModal", () => ({
  UpgradeModal: ({ open }: { open: boolean }) => (open ? <div>PLANS_MODAL</div> : null),
}));
vi.mock("../../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/subscriptionService")>();
  return {
    ...actual,
    activateTrial: vi.fn((uid: string) => actual.activateTrial(uid)),
    hydrateSubscriptionFromCloud: vi.fn(),
  };
});

import { RequirePremium } from "./RequireAuth";
import * as svc from "../../services/subscriptionService";
import type { SubscriptionStatus } from "../../services/subscriptionService";

const hydrate = svc.hydrateSubscriptionFromCloud as unknown as ReturnType<typeof vi.fn>;
const activate = svc.activateTrial as unknown as ReturnType<typeof vi.fn>;

const DAY = 24 * 60 * 60 * 1000;
const FREE: SubscriptionStatus = { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null };
const EXPIRED: SubscriptionStatus = { tier: "free", plan: "none", trialStartDate: new Date(Date.now() - 10 * DAY).toISOString(), trialEndDate: new Date(Date.now() - 3 * DAY).toISOString(), premiumSince: null };
const ACTIVE: SubscriptionStatus = { tier: "trial", plan: "trial_7day", trialStartDate: new Date().toISOString(), trialEndDate: new Date(Date.now() + 5 * DAY).toISOString(), premiumSince: null };
const PREMIUM: SubscriptionStatus = { tier: "premium", plan: "premium_monthly", trialStartDate: null, trialEndDate: null, premiumSince: new Date().toISOString() };

function renderGate() {
  return render(
    <MemoryRouter>
      <RequirePremium featureLabel="Ask the tutor">
        <div>UNLOCKED_CHILD</div>
      </RequirePremium>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  hydrate.mockReset();
  activate.mockClear();
});
afterEach(() => cleanup());

describe("RequirePremium — trial CTA + eligibility", () => {
  it("FRESH user sees the trial CTA; clicking startTrial once unlocks the gated child", async () => {
    hydrate.mockResolvedValue(FREE);
    renderGate();
    const cta = await screen.findByText("Start my free 7-day trial");
    expect(screen.getByText(/then free Basic, upgrade anytime/i)).toBeInTheDocument();
    expect(activate).not.toHaveBeenCalled();
    fireEvent.click(cta);
    expect(activate).toHaveBeenCalledTimes(1);
    // The cascade: startTrial flips isPremium → the gated child renders, no navigation.
    await waitFor(() => expect(screen.getByText("UNLOCKED_CHILD")).toBeInTheDocument());
  });

  it("EXPIRED-trial user does NOT see the trial CTA — only the plans path", async () => {
    hydrate.mockResolvedValue(EXPIRED);
    renderGate();
    // Once hydration resolves to expired, the trial CTA must be gone.
    await waitFor(() => expect(screen.queryByText("Start my free 7-day trial")).toBeNull());
    expect(screen.getByText("Unlock Full Access")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Unlock Full Access"));
    expect(screen.getByText("PLANS_MODAL")).toBeInTheDocument();
    expect(activate).not.toHaveBeenCalled();
  });

  it("ACTIVE-trial user is unaffected — gated child renders, no paywall", async () => {
    hydrate.mockResolvedValue(ACTIVE);
    renderGate();
    await waitFor(() => expect(screen.getByText("UNLOCKED_CHILD")).toBeInTheDocument());
    expect(screen.queryByText("Start my free 7-day trial")).toBeNull();
    expect(activate).not.toHaveBeenCalled();
  });

  it("PREMIUM user is unaffected — gated child renders, no paywall", async () => {
    hydrate.mockResolvedValue(PREMIUM);
    renderGate();
    await waitFor(() => expect(screen.getByText("UNLOCKED_CHILD")).toBeInTheDocument());
    expect(screen.queryByText("Start my free 7-day trial")).toBeNull();
    expect(activate).not.toHaveBeenCalled();
  });
});
