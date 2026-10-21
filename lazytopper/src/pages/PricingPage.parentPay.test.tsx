/**
 * ASK-PARENTS-PAY-1 — where the two halves mount on /pricing.
 *
 *   "Share QR code" / "Forward link to parents" (PAYWALL-PAY-1): signed-in, hydrated, NOT
 *   Premium (Basic or trial), flags on.
 *   The parent's page: `/pricing#pp=<token>` with flags on. Otherwise the plans page exactly
 *   as before — with the flags off a pay-link address is just /pricing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { SubscriptionStatus } from "../services/subscriptionService";

// The page reads the clock (the till-boards quote). This file PINS its own clock rather than
// joining the date-sensitive list: only Date is faked (timers stay real for findBy*).
vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-18T10:00:00+05:30"));
});

const authState: { user: { uid: string } | null } = { user: null };

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, loading: false }),
}));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
vi.mock("../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/subscriptionService")>();
  return { ...actual, hydrateSubscriptionFromCloud: vi.fn() };
});
vi.mock("../services/parentPay", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/parentPay")>();
  return {
    ...actual,
    viewParentLink: vi.fn(async () => ({ firstName: "Aarav", prices: { month: 599, till_boards: 2396 }, expiresAt: "2026-10-21T10:00:00.000Z" })),
  };
});

import PricingPage from "./PricingPage";
import * as svc from "../services/subscriptionService";

const hydrate = svc.hydrateSubscriptionFromCloud as unknown as ReturnType<typeof vi.fn>;
const UID = "uid-parent-pay-1";
const STORAGE_KEY = `lazytopper.subscription.v1:${UID}`;
const DAY = 24 * 60 * 60 * 1000;
const TOKEN = "Q".repeat(43);

function status(over: Partial<SubscriptionStatus>): SubscriptionStatus {
  return { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null, ...over };
}
const FREE = status({});
const TRIAL = status({ tier: "trial", plan: "trial_7day", trialStartDate: new Date(Date.now() - 2 * DAY).toISOString() });
const PREMIUM = status({ tier: "premium", plan: "premium_monthly", premiumSince: new Date(Date.now() - DAY).toISOString() });

function cloudHolds(cloud: SubscriptionStatus) {
  hydrate.mockImplementation(async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cloud));
    return cloud;
  });
}

async function renderAt(entry: string) {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/pricing" element={<PricingPage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

function flags(on: boolean) {
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
  vi.stubEnv("VITE_PARENT_PAY_ENABLED", on ? "1" : "");
}

beforeEach(() => {
  localStorage.clear();
  authState.user = null;
  hydrate.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("PricingPage — Share QR code / Forward link to parents (PAYWALL-PAY-1)", () => {
  it.each([
    ["Basic", FREE],
    ["trial", TRIAL],
  ])("shown to a signed-in %s student when switched on — next to the passes' own Pay buttons", async (_label, sub) => {
    flags(true);
    authState.user = { uid: UID };
    cloudHolds(sub);
    await renderAt("/pricing");
    expect(await screen.findByTestId("pricing-parent-share")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share QR code" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Forward link to parents" })).toBeInTheDocument();
    // "Pay" on /pricing is the pass tiles' own buttons — never a second, separate Pay.
    expect(screen.queryByTestId("paywall-pay")).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Pay / }).length).toBeGreaterThan(0);
    // ★ The owner's ruling: never the word "Ask" next to parents.
    expect(document.body.textContent || "").not.toMatch(/\bask\b[^.]*parent/i);
  });

  it("never shown to a Premium student", async () => {
    flags(true);
    authState.user = { uid: UID };
    cloudHolds(PREMIUM);
    await renderAt("/pricing");
    await screen.findByText("Premium is active.");
    expect(screen.queryByTestId("pricing-parent-share")).toBeNull();
  });

  it("never shown signed out, nor while switched off", async () => {
    flags(true);
    await renderAt("/pricing");
    expect(screen.queryByTestId("pricing-parent-share")).toBeNull();
    cleanup();
    flags(false);
    authState.user = { uid: UID };
    cloudHolds(FREE);
    await renderAt("/pricing");
    await screen.findByRole("heading", { level: 1, name: "Simple, Student-Friendly Plans" });
    expect(screen.queryByTestId("pricing-parent-share")).toBeNull();
    expect(screen.queryByRole("button", { name: "Share QR code" })).toBeNull();
  });
});

describe("PricingPage — the parent's link", () => {
  it("/pricing#pp=<token> with the switch on: the parent's page, not the plans", async () => {
    flags(true);
    await renderAt(`/pricing#pp=${TOKEN}`);
    expect(await screen.findByRole("heading", { level: 1, name: "Pay for Aarav's LazyTopper Premium" })).toBeInTheDocument();
    expect(screen.queryByText("Simple, Student-Friendly Plans")).toBeNull();
  });

  it("switched off, or a malformed token: the plans page exactly as before", async () => {
    flags(false);
    await renderAt(`/pricing#pp=${TOKEN}`);
    expect(screen.getByRole("heading", { level: 1, name: "Simple, Student-Friendly Plans" })).toBeInTheDocument();
    cleanup();
    flags(true);
    await renderAt(`/pricing#pp=short`);
    expect(screen.getByRole("heading", { level: 1, name: "Simple, Student-Friendly Plans" })).toBeInTheDocument();
  });
});
