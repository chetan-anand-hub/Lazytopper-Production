// ASK-FIX-1 - the trial-ended screen as a student meets it, and the countdown bar.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const auth = vi.hoisted(() => ({ user: { uid: "u1" } as { uid: string; isLocalSession?: boolean } | null }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
vi.mock("../../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/subscriptionService")>();
  return { ...actual, hydrateSubscriptionFromCloud: vi.fn(), activateTrial: vi.fn() };
});
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return { ...actual, getSessionRecordsFromCloud: vi.fn() };
});
vi.mock("../feedback/feedbackPromptHost", () => ({ requestFeedbackPrompt: vi.fn(), notifyPaywallDismissed: vi.fn() }));
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return {
    ...actual,
    trackTrialEndScreen: vi.fn(),
    trackPaywallAction: vi.fn(),
    trackTrialBannerShown: vi.fn(),
    trackTrialBannerClick: vi.fn(),
  };
});

import TrialEndScreen from "./TrialEndScreen";
import TrialCountdownBar from "./TrialCountdownBar";
import { __resetTrialEndScreenForTests } from "./trialEndScreenModel";
import { __resetPaidLandingForTests, isPaidLandingSearch, notePaidLanding, trialAskRouteAllowed } from "./trialAskRoutes";
import { landingPath, PAID_PACKS_LANDING } from "../../services/checkoutWho";
import { emailLinkFinishUrl } from "../../services/linkSignInEmail";
import * as svc from "../../services/subscriptionService";
import * as records from "../../services/sessionRecords";
import type { SubscriptionStatus } from "../../services/subscriptionService";

// SELF-PAY-LAND-1 - a buyer who paid signed out and signed in lands on My packs with NO trial-ended screen in between.
const hydrate = svc.hydrateSubscriptionFromCloud as unknown as ReturnType<typeof vi.fn>;
const readRecords = records.getSessionRecordsFromCloud as unknown as ReturnType<typeof vi.fn>;
const HOUR = 60 * 60 * 1000;
const START = Date.UTC(2026, 5, 1, 4, 30);
const expired = { tier: "free", plan: "trial_7day", trialStartDate: new Date(START).toISOString(), trialEndDate: null, premiumSince: null } as SubscriptionStatus;

function renderAt(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><TrialEndScreen /><TrialCountdownBar /></MemoryRouter>);
}
async function settle() {
  await waitFor(() => expect(hydrate).toHaveBeenCalled());
  const pending = hydrate.mock.results.map((r) => r.value as Promise<unknown>);
  await act(async () => {
    await Promise.all(pending);
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.UTC(2026, 5, 9, 6, 30));
  localStorage.clear();
  __resetTrialEndScreenForTests();
  __resetPaidLandingForTests();
  auth.user = { uid: "u1" };
  hydrate.mockReset();
  readRecords.mockReset();
  readRecords.mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  void HOUR;
});

describe("SELF-PAY-LAND-1 routing", () => {
  it("the pack landing is My packs marked from=pay (phone OTP, email code, email link and the receipt links all use it); the Board Pass goes Home", () => {
    expect(landingPath("pack")).toBe("/packs?from=pay#my-packs");
    expect(PAID_PACKS_LANDING).toBe("/packs?from=pay#my-packs");
    expect(landingPath("pass")).toBe("/");
    expect(emailLinkFinishUrl("https://x.in", PAID_PACKS_LANDING)).toBe("https://x.in/login?finish=link&redirect=" + encodeURIComponent("/packs?from=pay#my-packs"));
    expect(emailLinkFinishUrl("https://x.in", "https://evil.example")).toBe("https://x.in/login?finish=link&redirect=%2F");
  });
  it("only from=pay counts", () => {
    expect(isPaidLandingSearch("?from=pay")).toBe(true);
    expect(isPaidLandingSearch("?x=1&from=pay")).toBe(true);
    expect(isPaidLandingSearch("?from=other")).toBe(false);
    expect(isPaidLandingSearch("")).toBe(false);
    expect(isPaidLandingSearch(null)).toBe(false);
  });
  it("noting the landing holds the trial asks for this load only", () => {
    expect(trialAskRouteAllowed("/packs")).toBe(true);
    notePaidLanding("?from=pay");
    expect(trialAskRouteAllowed("/packs")).toBe(false);
    expect(trialAskRouteAllowed("/")).toBe(false);
    __resetPaidLandingForTests(); // a later load
    expect(trialAskRouteAllowed("/packs")).toBe(true);
  });
});

describe("SELF-PAY-LAND-1 interstitial suppression", () => {
  it("existing account with an EXPIRED trial: ordinary /packs visit shows the screen (rules unchanged) ...", async () => {
    hydrate.mockResolvedValue(expired);
    renderAt("/packs#my-packs");
    expect(await screen.findByRole("heading", { name: "Your free trial is over" })).toBeInTheDocument();
  });
  it("... but the paid landing /packs?from=pay#my-packs shows no screen and no countdown bar", async () => {
    hydrate.mockResolvedValue(expired);
    renderAt("/packs?from=pay#my-packs");
    await settle();
    expect(screen.queryByTestId("trial-end-screen")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Your free trial is over" })).toBeNull();
    expect(readRecords).not.toHaveBeenCalled();
  });
  it("brand-new account with no trial on record: nothing shows either way", async () => {
    hydrate.mockResolvedValue({ tier: "free", plan: "free", trialStartDate: null, trialEndDate: null, premiumSince: null } as unknown as SubscriptionStatus);
    renderAt("/packs?from=pay#my-packs");
    await settle();
    expect(screen.queryByTestId("trial-end-screen")).toBeNull();
    expect(readRecords).not.toHaveBeenCalled();
  });
});
