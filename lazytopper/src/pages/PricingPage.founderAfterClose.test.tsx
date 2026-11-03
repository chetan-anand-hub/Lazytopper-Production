/**
 * PRICING-1 — after the founding offer closes (00:00 IST 1 Dec 2026), a student who ALREADY
 * holds the founding rate (the server-written sticky `foundingMember`) is still CHARGED the
 * founding rate, so /pricing must still SHOW them that rate, the lock promise and a "Pay ₹599"
 * button. A student who does not hold it sees the list price. Neither sees the end-date line
 * or the "Founding member offer" badge once the offer is closed to new buyers.
 *
 * Date is pinned (Date only; timers stay real for findBy*). Payments are switched on so the
 * real PassCheckout buttons render.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { SubscriptionStatus } from "../services/subscriptionService";

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-12-05T10:00:00+05:30"));
});

const authState: { user: { uid: string } | null } = { user: null };
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, loading: false }),
}));
// PRICE-FIXED-1: the month pass shows only for an account the server says has a PAID month order.
const monthState = vi.hoisted(() => ({ buyer: true }));
vi.mock("../components/pricing/useMonthPassAvailable", () => ({
  useMonthPassAvailable: () => monthState.buyer,
  fetchMonthPassAvailable: async () => monthState.buyer,
  resetMonthPassAvailableForTests: () => undefined,
}));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
vi.mock("../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/subscriptionService")>();
  return { ...actual, hydrateSubscriptionFromCloud: vi.fn() };
});

import PricingPage from "./PricingPage";
import * as svc from "../services/subscriptionService";
import {
  FOUNDING_LOCK_COPY,
  PRICE_MONTHLY_FOUNDING_DISPLAY,
  PRICE_MONTHLY_LIST_DISPLAY,
} from "../config/pricing";

const hydrate = svc.hydrateSubscriptionFromCloud as unknown as ReturnType<typeof vi.fn>;
const UID = "uid-founder-after-close";
const STORAGE_KEY = `lazytopper.subscription.v1:${UID}`;

function status(over: Partial<SubscriptionStatus>): SubscriptionStatus {
  return { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null, ...over };
}

async function renderAs(sub: SubscriptionStatus) {
  authState.user = { uid: UID };
  hydrate.mockImplementation(async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
    return sub;
  });
  await act(async () => {
    render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <Routes>
          <Route path="/pricing" element={<PricingPage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
  await screen.findByTestId("pricing-passes");
  return document.querySelector('[data-testid="pricing-board-pass"]') as HTMLElement;
}

beforeEach(() => {
  localStorage.clear();
  authState.user = null;
  monthState.buyer = true;
  hydrate.mockReset();
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("PricingPage after 1 Dec 2026", () => {
  it("a FOUNDING month buyer sees the founding rate, the lock promise and a Pay button at that rate — what the server charges", async () => {
    const premium = await renderAs(status({ foundingMember: true }));
    expect(premium.querySelector('[data-testid="pricing-monthly-price"] .lt-pricing-amount')?.textContent).toBe(
      PRICE_MONTHLY_FOUNDING_DISPLAY,
    );
    expect(premium.textContent).toContain(FOUNDING_LOCK_COPY);
    expect(await screen.findByRole("button", { name: `Pay ${PRICE_MONTHLY_FOUNDING_DISPLAY} for a month` })).toBeInTheDocument();
    // The offer is closed to NEW buyers: no badge, no end-date line.
    expect(premium.querySelector(".lt-pricing-founding-flag")).toBeNull();
    expect(premium.querySelector('[data-testid="pricing-founding-until"]')).toBeNull();
  });

  it("a month buyer WITHOUT the founding rate sees the list price, no lock promise, and a Pay button at the list price", async () => {
    const premium = await renderAs(status({}));
    expect(premium.querySelector('[data-testid="pricing-monthly-price"] .lt-pricing-amount')?.textContent).toBe(
      PRICE_MONTHLY_LIST_DISPLAY,
    );
    expect(premium.textContent).not.toContain(FOUNDING_LOCK_COPY);
    expect(await screen.findByRole("button", { name: `Pay ${PRICE_MONTHLY_LIST_DISPLAY} for a month` })).toBeInTheDocument();
    expect(premium.querySelector(".lt-pricing-founding-flag")).toBeNull();
    expect(premium.querySelector('[data-testid="pricing-founding-until"]')).toBeNull();
  });

  it("PRICE-FIXED-1: a student who is NOT a month buyer sees only the Board Pass at the after-founding price: no month tile, no 599/999, no founding label", async () => {
    monthState.buyer = false;
    const premium = await renderAs(status({ foundingMember: true }));
    expect(premium.querySelector('[data-testid="pricing-monthly-price"]')).toBeNull();
    expect(premium.textContent).not.toMatch(/599|999|for a month/);
    expect(premium.textContent).toContain("₹2,499");
    expect(premium.querySelector('[data-testid="till-boards-founding-label"]')).toBeNull();
    expect(premium.querySelector('[data-testid="till-boards-deadline"]')).toBeNull();
    expect(await screen.findByRole("button", { name: "Pay ₹2,499 once till your boards" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /for a month/i })).toBeNull();
  });
});
