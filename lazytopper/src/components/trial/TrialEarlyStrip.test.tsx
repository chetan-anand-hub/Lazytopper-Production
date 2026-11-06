// TRIAL-SELL-1 - the desktop trial strip for trial days 1-3, and its pure model.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const auth = vi.hoisted(() => ({ user: { uid: "u1" } as { uid: string; isLocalSession?: boolean } | null }));
const desktop = vi.hoisted(() => ({ on: true }));
const payments = vi.hoisted(() => ({ on: true }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
vi.mock("../../hooks/useIsDesktop", () => ({ useIsDesktop: () => desktop.on }));
vi.mock("../../services/checkout", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/checkout")>();
  return { ...actual, isPaymentsClientEnabled: () => payments.on };
});
vi.mock("../pricing/PaywallActions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../pricing/PaywallActions")>();
  return {
    ...actual,
    default: (p: { surface: string; askOnly?: boolean }) => (
      <span data-testid="ask-stub" data-surface={p.surface} data-ask-only={String(Boolean(p.askOnly))} />
    ),
  };
});
vi.mock("../../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/subscriptionService")>();
  return { ...actual, hydrateSubscriptionFromCloud: vi.fn(), activateTrial: vi.fn() };
});
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackPaywallAction: vi.fn() };
});

import TrialEarlyStrip, { TRIAL_STRIP_HIDDEN_KEY_PREFIX } from "./TrialEarlyStrip";
import { trialEarlyStripDay, trialEarlyStripDayText, trialEarlyStripOfferText, TRIAL_STRIP_LAST_DAY } from "./trialEarlyStripModel";
import { TRIAL_BAR_FIRST_DAY, trialBannerTiming } from "./trialEndBannerModel";
import { FOUNDING_OFFER_CLOSES_AT_MS } from "../../config/pricing";
import * as svc from "../../services/subscriptionService";
import * as analytics from "../../analytics/analytics";
import type { SubscriptionStatus } from "../../services/subscriptionService";

const hydrate = svc.hydrateSubscriptionFromCloud as unknown as ReturnType<typeof vi.fn>;
const trackPay = analytics.trackPaywallAction as unknown as ReturnType<typeof vi.fn>;

const HOUR = 60 * 60 * 1000;
const ist = (y: number, mo: number, d: number, h = 0, mi = 0) => Date.UTC(y, mo - 1, d, h, mi) - 5.5 * HOUR;
const START = ist(2026, 11, 2, 22, 0); // trial day 1 = Mon 2 Nov (IST)
const START_ISO = new Date(START).toISOString();
const status = (tier: "trial" | "free" | "premium"): SubscriptionStatus =>
  ({
    tier,
    plan: tier === "premium" ? "premium_monthly" : "trial_7day",
    trialStartDate: START_ISO,
    trialEndDate: null,
    premiumSince: null,
  }) as SubscriptionStatus;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TrialEarlyStrip />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(ist(2026, 11, 3, 12)); // trial day 2
  localStorage.clear();
  sessionStorage.clear();
  auth.user = { uid: "u1" };
  desktop.on = true;
  payments.on = true;
  hydrate.mockReset();
  hydrate.mockResolvedValue(status("trial"));
  trackPay.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("trialEarlyStripModel", () => {
  it("shows on IST trial days 1-3 only and hands over to the countdown bar on day 4 (no gap, no overlap)", () => {
    expect(TRIAL_STRIP_LAST_DAY).toBe(TRIAL_BAR_FIRST_DAY - 1);
    expect(trialEarlyStripDay(START_ISO, START + 60_000)).toBe(1);
    expect(trialEarlyStripDay(START_ISO, ist(2026, 11, 3, 0, 1))).toBe(2); // IST midnight rolls the day
    expect(trialEarlyStripDay(START_ISO, ist(2026, 11, 4, 23, 59))).toBe(3);
    const day4 = ist(2026, 11, 5, 0, 1);
    expect(trialEarlyStripDay(START_ISO, day4)).toBeNull();
    expect(trialBannerTiming(START_ISO, day4, TRIAL_BAR_FIRST_DAY)?.dayOfTrial).toBe(4);
  });

  it("says nothing without a real start (none, unparseable, future)", () => {
    const now = ist(2026, 11, 3, 12);
    expect(trialEarlyStripDay(null, now)).toBeNull();
    expect(trialEarlyStripDay("not a date", now)).toBeNull();
    expect(trialEarlyStripDay(new Date(now + 2 * 24 * HOUR).toISOString(), now)).toBeNull();
  });

  it("the copy: real day, config price, founding note only while the offer is open", () => {
    expect(trialEarlyStripDayText(2)).toBe("Trial: day 2 of 7");
    expect(trialEarlyStripOfferText(ist(2026, 11, 3, 12))).toBe("Board Pass ₹1,917 till your boards (founding offer till 30 November)");
    expect(trialEarlyStripOfferText(FOUNDING_OFFER_CLOSES_AT_MS - 1)).toContain("₹1,917");
    expect(trialEarlyStripOfferText(FOUNDING_OFFER_CLOSES_AT_MS)).toBe("Board Pass ₹2,499 + GST till your boards"); // GST-EXCL-1
    // GST-EXCL-1: 6 Nov (before the 00:00 IST 7 Nov cut-off) is today's copy; 7 Nov reads "+ GST".
    expect(trialEarlyStripOfferText(ist(2026, 11, 6, 12))).toBe("Board Pass ₹1,917 till your boards (founding offer till 30 November)");
    expect(trialEarlyStripOfferText(ist(2026, 11, 7, 12))).toBe("Board Pass ₹1,917 + GST till your boards (founding offer till 30 November)");
  });
});

describe("TrialEarlyStrip", () => {
  it("desktop, trial day 2: one line with Pay -> the Board Pass checkout and the parent ask", async () => {
    renderAt("/practice");
    const strip = await screen.findByTestId("trial-early-strip");
    expect(strip.textContent).toContain("Trial: day 2 of 7");
    expect(strip.textContent).toContain("Board Pass ₹1,917 till your boards (founding offer till 30 November)");
    const pay = screen.getByTestId("trial-early-strip-pay");
    expect(pay.getAttribute("href")).toBe("/pricing?buy=board_pass");
    const ask = screen.getByTestId("ask-stub");
    expect(ask.getAttribute("data-ask-only")).toBe("true");
    expect(ask.getAttribute("data-surface")).toBe("trial_strip");
    fireEvent.click(pay); // navigates to /pricing, where the strip is quiet
    expect(trackPay).toHaveBeenCalledWith("pay", "trial_strip");
    expect(screen.queryByTestId("trial-early-strip")).toBeNull();
  });

  it("payments dark: Pay goes to /pricing (no checkout deep link)", async () => {
    payments.on = false;
    renderAt("/practice");
    expect((await screen.findByTestId("trial-early-strip-pay")).getAttribute("href")).toBe("/pricing");
  });

  it("never on phones (ux/TrialBanner keeps the phone strip)", async () => {
    desktop.on = false;
    renderAt("/practice");
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTestId("trial-early-strip")).toBeNull();
  });

  it("never for paid Premium or a Basic (free) account", async () => {
    for (const tier of ["premium", "free"] as const) {
      hydrate.mockResolvedValue(status(tier));
      const r = renderAt("/practice");
      await new Promise((res) => setTimeout(res, 0));
      expect(screen.queryByTestId("trial-early-strip")).toBeNull();
      r.unmount();
    }
  });

  it("never on day 4+ (the countdown bar's days)", async () => {
    vi.setSystemTime(ist(2026, 11, 5, 12));
    renderAt("/practice");
    await new Promise((res) => setTimeout(res, 0));
    expect(screen.queryByTestId("trial-early-strip")).toBeNull();
  });

  it("stays out of the offer, auth and full-screen routes", async () => {
    for (const path of ["/pricing", "/login", "/full-mock/x", "/chapter-test"]) {
      const r = renderAt(path);
      await new Promise((res) => setTimeout(res, 0));
      expect(screen.queryByTestId("trial-early-strip")).toBeNull();
      r.unmount();
    }
  });

  it("'Not today' hides it for the rest of the IST day only", async () => {
    const r = renderAt("/practice");
    fireEvent.click(await screen.findByTestId("trial-early-strip-close"));
    expect(screen.queryByTestId("trial-early-strip")).toBeNull();
    expect(localStorage.getItem(TRIAL_STRIP_HIDDEN_KEY_PREFIX + "u1")).toBe("2026-11-03");
    r.unmount();
    renderAt("/practice");
    await new Promise((res) => setTimeout(res, 0));
    expect(screen.queryByTestId("trial-early-strip")).toBeNull();
    cleanup();
    vi.setSystemTime(ist(2026, 11, 4, 9)); // next IST day, trial day 3
    renderAt("/practice");
    expect((await screen.findByTestId("trial-early-strip")).textContent).toContain("day 3 of 7");
  });
});
