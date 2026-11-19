// @vitest-environment jsdom
/**
 * SELFPAY-ATTACH-1 (D) - a signed-in Board Pass HOLDER on /pricing (and so on /board-pass, which mounts the same PassCheckout) is told they
 * have it, with the REAL end date, never charged again, and offered "Buy for someone else"; /pricing?buy=board_pass for a holder opens
 * the same card (it used to do nothing). A month-pass holder is unchanged. Checkout-who off: unchanged.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const mockAuth = vi.hoisted(() => ({ user: { uid: "u1", email: "an@gmail.com" } as null | { uid: string; email?: string }, loading: false }));
const mockSub = vi.hoisted(() => ({
  status: { tier: "premium", plan: "pass_till_boards", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: "2027-03-01T00:00:00.000Z" } as Record<string, unknown>,
  hydrated: true,
}));
const checkout = vi.hoisted(() => ({ buyPass: vi.fn() }));
vi.mock("./useMonthPassAvailable", () => ({ useMonthPassAvailable: () => false, fetchMonthPassAvailable: vi.fn(async () => false), resetMonthPassAvailableForTests: () => undefined }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => mockAuth }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => mockSub }));
vi.mock("../../services/subscriptionService", () => ({ hydrateSubscriptionFromCloud: vi.fn(async () => ({})) }));
vi.mock("../../analytics/analytics", () => ({ trackNamedEvent: vi.fn(), trackBeginCheckoutTap: vi.fn(), trackPurchase: vi.fn(), newCheckoutAttemptId: vi.fn(() => "a") }));
vi.mock("../../lib/packs/packAnalytics", () => ({ trackPackPurchase: vi.fn() }));
vi.mock("../../services/packs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/packs")>()),
  fetchMyPacks: vi.fn(async () => ({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null })),
}));
vi.mock("../../services/checkout", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/checkout")>()),
  isPaymentsClientEnabled: () => true,
  buyPass: (...a: unknown[]) => checkout.buyPass(...a),
}));

import PassCheckout from "./PassCheckout";

let where = "";
function Probe() {
  const l = useLocation();
  where = `${l.pathname}${l.search}`;
  return null;
}
function mount(entry = "/pricing") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Probe />
      <Routes>
        <Route path="/pricing" element={<PassCheckout />} />
        <Route path="/" element={<p>home</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  // Date pinned (PassCheckout reads the clock for the price and the pass end); no real clock is read.
  vi.useFakeTimers({ now: new Date("2026-11-12T00:00:00.000Z"), toFake: ["Date"] });
  vi.clearAllMocks();
  vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "1");
  mockAuth.user = { uid: "u1", email: "an@gmail.com" };
  mockSub.status = { tier: "premium", plan: "pass_till_boards", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: "2027-03-01T00:00:00.000Z" };
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("a Board Pass holder", () => {
  it("the existing active note stays; 'Buy for someone else' opens 'You already have the Board Pass' with the real date and no charge", async () => {
    mount();
    expect(screen.getByTestId("pass-checkout-board-pass-active").textContent).toMatch(/^Your Board Pass is active until /);
    fireEvent.click(screen.getByTestId("pass-checkout-holder-buy"));
    expect(await screen.findByText("You already have the Board Pass")).toBeTruthy();
    expect(screen.getByTestId("who-holder-line").textContent).toMatch(/^It's active, valid till .*2027\. There's nothing more to pay\.$/);
    expect(checkout.buyPass).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("who-holder-other"));
    expect(screen.getByTestId("who-first")).toBeTruthy();
  });

  it("'Go to Home' goes to Home through the router", async () => {
    mount();
    fireEvent.click(screen.getByTestId("pass-checkout-holder-buy"));
    fireEvent.click(await screen.findByTestId("who-holder-go"));
    await waitFor(() => expect(where).toBe("/"));
  });

  it("/pricing?buy=board_pass for a holder opens the same card (no checkout) and removes the param", async () => {
    mount("/pricing?buy=board_pass");
    expect(await screen.findByText("You already have the Board Pass")).toBeTruthy();
    expect(where).toBe("/pricing");
    expect(checkout.buyPass).not.toHaveBeenCalled();
  });

  it("checkout-who off: exactly as before (no button, nothing opens)", async () => {
    vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "");
    mount("/pricing?buy=board_pass");
    await waitFor(() => expect(where).toBe("/pricing"));
    expect(screen.queryByTestId("pass-checkout-holder-buy")).toBeNull();
    expect(screen.queryByText("You already have the Board Pass")).toBeNull();
  });

  it("a month-pass holder is unchanged: no holder card; ?buy= still starts the Board Pass upgrade checkout", async () => {
    mockSub.status = { ...mockSub.status, plan: "pass_month", passEnd: "2027-03-01T00:00:00.000Z" };
    checkout.buyPass.mockImplementation(() => new Promise(() => undefined));
    mount("/pricing?buy=board_pass");
    await waitFor(() => expect(checkout.buyPass).toHaveBeenCalled());
    expect(screen.queryByText("You already have the Board Pass")).toBeNull();
  });
});
