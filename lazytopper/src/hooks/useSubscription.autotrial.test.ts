import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";

// [FU-SUBSCRIPTION-AUTOTRIAL-ONMOUNT] — a student's 7-day trial must start ONLY when
// they choose to (startTrial), never silently on mount. The bug auto-called
// activateTrial(uid) inside the cloud-hydration .then() for any signed-in user with no
// trial record, burning trial days the moment any page mounted this hook.
//
// These tests read REAL hook behaviour: the service's pure functions (loadSubscription,
// getDaysLeftInTrial, isPremiumAccess, applyExpiry) run for real; only the async cloud
// read is stubbed (to inject each of the four states deterministically, no firestore)
// and activateTrial is a spy WRAPPING the real impl (so it both records calls and still
// performs a genuine write when startTrial invokes it).
const USER = { uid: "u1" };
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: USER }) }));

vi.mock("../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/subscriptionService")>();
  return {
    ...actual,
    activateTrial: vi.fn((uid: string) => actual.activateTrial(uid)),
    hydrateSubscriptionFromCloud: vi.fn(),
  };
});

import { useSubscription } from "./useSubscription";
import * as svc from "../services/subscriptionService";
import type { SubscriptionStatus } from "../services/subscriptionService";

const hydrate = svc.hydrateSubscriptionFromCloud as unknown as ReturnType<typeof vi.fn>;
const activateSpy = svc.activateTrial as unknown as ReturnType<typeof vi.fn>;

const DAY = 24 * 60 * 60 * 1000;
const FREE: SubscriptionStatus = { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null };
// SEC-2: a trial's END is DERIVED from its START plus the TRIAL_DAYS constant and is
// no longer stored, so a fixture may only set the START. The previous version of this
// helper set a start of "now" AND an end of now + daysLeft — i.e. a 5-day trial that
// began today, which is not a state the product can produce. That inconsistency was
// only expressible because the length was a stored, client-writable field, which is
// the defect SEC-2 removed. A trial with `daysLeft` remaining is one that started
// (TRIAL_DAYS - daysLeft) days ago.
function activeTrial(daysLeft: number): SubscriptionStatus {
  const startedAgo = (svc.TRIAL_DAYS - daysLeft) * DAY;
  return { tier: "trial", plan: "trial_7day", trialStartDate: new Date(Date.now() - startedAgo).toISOString(), trialEndDate: null, premiumSince: null };
}
const EXPIRED: SubscriptionStatus = { tier: "free", plan: "none", trialStartDate: new Date(Date.now() - 10 * DAY).toISOString(), trialEndDate: new Date(Date.now() - 3 * DAY).toISOString(), premiumSince: null };
const PREMIUM: SubscriptionStatus = { tier: "premium", plan: "premium_monthly", trialStartDate: null, trialEndDate: null, premiumSince: new Date().toISOString() };

beforeEach(() => {
  localStorage.clear();
  hydrate.mockReset();
  activateSpy.mockClear(); // clear call records but KEEP the real-wrapping impl
});
afterEach(() => cleanup());

describe("useSubscription — trial activation is user-initiated only", () => {
  it("FRESH user: mounting does NOT auto-activate a trial (stays free, not expired)", async () => {
    hydrate.mockResolvedValue(FREE);
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(hydrate).toHaveBeenCalled());
    await waitFor(() => expect(result.current.status.tier).toBe("free"));
    expect(activateSpy).not.toHaveBeenCalled(); // ← mutation target: restoring auto-activate fails here
    expect(result.current.isTrialActive).toBe(false);
    expect(result.current.isTrialExpired).toBe(false); // free is NOT expired
    expect(result.current.isPremium).toBe(false);
    expect(result.current.daysLeftInTrial).toBe(0);
  });

  it("startTrial() activates exactly once, only when invoked", async () => {
    hydrate.mockResolvedValue(FREE);
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.status.tier).toBe("free"));
    expect(activateSpy).not.toHaveBeenCalled();
    act(() => { result.current.startTrial(); });
    expect(activateSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.isTrialActive).toBe(true));
    expect(result.current.tier).toBe("trial");
  });

  it("ACTIVE trial: keeps daysLeft + isTrialActive, no auto re-activate", async () => {
    hydrate.mockResolvedValue(activeTrial(5));
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.isTrialActive).toBe(true));
    expect(result.current.daysLeftInTrial).toBe(5);
    expect(result.current.isPremium).toBe(true); // trial grants premium access
    expect(activateSpy).not.toHaveBeenCalled();
  });

  it("EXPIRED trial: reads as expired (free tier + trialStartDate set), not re-activated", async () => {
    hydrate.mockResolvedValue(EXPIRED);
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.isTrialExpired).toBe(true));
    expect(result.current.isTrialActive).toBe(false);
    expect(result.current.isPremium).toBe(false);
    expect(result.current.daysLeftInTrial).toBe(0);
    expect(activateSpy).not.toHaveBeenCalled();
  });

  it("PREMIUM user: unaffected, no trial activation", async () => {
    hydrate.mockResolvedValue(PREMIUM);
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.isPremium).toBe(true));
    expect(result.current.tier).toBe("premium");
    expect(activateSpy).not.toHaveBeenCalled();
  });
});
