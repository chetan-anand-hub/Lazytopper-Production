// EARLY-PAYWALL-1 - the phone trial strip shows no Board Pass link on trial day 1 (IST), and is unchanged from day 2.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const sub = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1" }, loading: false }) }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => sub.value }));
vi.mock("../UpgradeModal", () => ({ UpgradeModal: () => null }));
vi.mock("../trial/TrialAsk", () => ({ default: () => null }));

import { TrialBanner } from "./TrialBanner";

const HOUR = 60 * 60 * 1000;
const ist = (y: number, mo: number, d: number, h = 0, mi = 0) => Date.UTC(y, mo - 1, d, h, mi) - 5.5 * HOUR;
const START_ISO = new Date(ist(2026, 11, 2, 22, 0)).toISOString();

function set(tier: "trial" | "free", daysLeft: number) {
  sub.value = {
    tier,
    isTrialExpired: false,
    daysLeftInTrial: daysLeft,
    status: { tier, plan: "trial_7day", trialStartDate: START_ISO, trialEndDate: null, premiumSince: null },
  };
}
const linkButton = () => screen.queryByRole("button", { name: /Board Pass|plans|₹/i });

beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TrialBanner (phones) - owner 5 Nov: hide the Board Pass ask on trial day 1", () => {
  it("day 1: the day line stays, the Board Pass link is gone", () => {
    vi.setSystemTime(ist(2026, 11, 2, 23, 0));
    set("trial", 7);
    render(<TrialBanner />);
    expect(screen.getByText(/Day 1 of 7/)).toBeTruthy();
    expect(linkButton()).toBeNull();
  });

  it("day 2: the Board Pass link is back, exactly as before", () => {
    vi.setSystemTime(ist(2026, 11, 3, 12, 0));
    set("trial", 6);
    render(<TrialBanner />);
    expect(linkButton()).not.toBeNull();
  });

  it("a Basic (free, no trial) student sees no strip at all - unaffected", () => {
    vi.setSystemTime(ist(2026, 11, 2, 23, 0));
    set("free", 0);
    const { container } = render(<TrialBanner />);
    expect(container.textContent).toBe("");
  });
});
