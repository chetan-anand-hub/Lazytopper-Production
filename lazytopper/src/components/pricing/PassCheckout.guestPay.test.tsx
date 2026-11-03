import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, waitFor, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

/**
 * PAY-PHONE-1 - the Board Pass: signed out (Pay button or /pricing?buy=board_pass) asks "How do you want to pay?" while
 * paying by phone is on; off, today's sign-in redirect is unchanged. PAY-PHONE-1 (C): after the checkout is closed
 * without paying, a prominent "Pay ₹…" stays at the top and reopens checkout.
 */
const mockAuth = vi.hoisted(() => ({ user: null as null | { uid: string; isLocalSession?: boolean }, loading: false }));
const mockSub = vi.hoisted(() => ({
  status: { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: null } as Record<string, unknown>,
  hydrated: true,
}));
const checkout = vi.hoisted(() => ({ buyPass: vi.fn() }));
const flags = vi.hoisted(() => ({ guest: true }));
const guestBuy = vi.hoisted(() => ({ buyAsGuest: vi.fn() }));

vi.mock("./useMonthPassAvailable", () => ({ useMonthPassAvailable: () => false, fetchMonthPassAvailable: vi.fn(async () => false), resetMonthPassAvailableForTests: () => undefined }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => mockAuth }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => mockSub }));
vi.mock("../../services/subscriptionService", () => ({ hydrateSubscriptionFromCloud: vi.fn(async () => ({})) }));
vi.mock("../../analytics/analytics", () => ({
  trackNamedEvent: vi.fn(),
  trackBeginCheckout: vi.fn(),
  trackPurchase: vi.fn(),
  newCheckoutAttemptId: vi.fn(() => "lt_attempt"),
}));
vi.mock("../../services/packs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/packs")>()),
  fetchMyPacks: vi.fn(async () => ({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null })),
}));
vi.mock("../../services/checkout", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/checkout")>()),
  isPaymentsClientEnabled: () => true,
  buyPass: (...a: unknown[]) => checkout.buyPass(...a),
}));
vi.mock("../../services/guestPay", async (orig) => ({
  ...(await orig<typeof import("../../services/guestPay")>()),
  isGuestPayClientEnabled: () => flags.guest,
  buyAsGuest: (...a: unknown[]) => guestBuy.buyAsGuest(...a),
}));

import PassCheckout, { repayBoardPassLabel } from "./PassCheckout";

let where = "";
let loginState: unknown;
function Probe() {
  const l = useLocation();
  where = `${l.pathname}${l.search}`;
  return null;
}
function LoginProbe() {
  loginState = useLocation().state;
  return <p>login</p>;
}
function mount(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Probe />
      <Routes>
        <Route path="/pricing" element={<PassCheckout />} />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-11-02T06:30:00.000Z"), toFake: ["Date"] });
  vi.clearAllMocks();
  mockAuth.user = null;
  flags.guest = true;
  where = "";
  loginState = undefined;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("PAY-PHONE-1 · Board Pass signed out", () => {
  it("guest pay on: the Pay button opens the pay sheet, no redirect", async () => {
    mount("/pricing");
    fireEvent.click(screen.getByText(/once till your boards/));
    expect(await screen.findByTestId("guest-pay-sheet")).toBeTruthy();
    expect(where).toBe("/pricing");
  });

  it("guest pay on: /pricing?buy=board_pass strips the param and opens the pay sheet", async () => {
    mount("/pricing?buy=board_pass");
    expect(await screen.findByTestId("guest-pay-sheet")).toBeTruthy();
    await waitFor(() => expect(where).toBe("/pricing"));
  });

  it("a LOCAL (non-cloud) session on /pricing?buy=board_pass gets the pay sheet, not a dead click (review fix 9)", async () => {
    mockAuth.user = { uid: "local-dev", isLocalSession: true };
    mount("/pricing?buy=board_pass");
    expect(await screen.findByTestId("guest-pay-sheet")).toBeTruthy();
    await waitFor(() => expect(where).toBe("/pricing"));
  });

  it("GUEST-SIGNIN-RETURNING-1: 'This number already has an account' -> sign in carries the existing-account flag (number in router state only)", async () => {
    guestBuy.buyAsGuest.mockResolvedValue({ status: "account_exists", phoneMasked: "+91 98•••••948", phone: "+919876543948" });
    mount("/pricing");
    fireEvent.click(screen.getByText(/once till your boards/));
    fireEvent.click(await screen.findByText("Pay now with your phone number"));
    fireEvent.change(screen.getByTestId("guest-pay-input"), { target: { value: "9876543948" } });
    fireEvent.click(screen.getByTestId("guest-pay-continue"));
    fireEvent.click(await screen.findByTestId("guest-pay-exists-signin"));
    expect(await screen.findByText("login")).toBeTruthy();
    expect(loginState).toEqual({ guestPayPhone: "9876543948", guestPayExisting: true });
    expect(where).not.toContain("9876543948");
  });

  it("guest pay off: today's redirect to sign-in, unchanged", async () => {
    flags.guest = false;
    mount("/pricing?buy=board_pass");
    await waitFor(() => expect(where).toBe("/login?redirect=%2Fpricing%3Fbuy%3Dboard_pass"));
    expect(screen.queryByTestId("guest-pay-sheet")).toBeNull();
  });
});

describe("PAY-PHONE-1 (C) · after a closed Board Pass checkout", () => {
  it("a prominent Pay button stays at the top and reopens checkout", async () => {
    mockAuth.user = { uid: "u1" };
    checkout.buyPass.mockResolvedValue({ status: "dismissed" });
    mount("/pricing");
    fireEvent.click(screen.getByText(/once till your boards/));
    const repay = await screen.findByTestId("pass-checkout-repay");
    expect(repayBoardPassLabel()).toBe("Pay ₹1,917");
    const btn = repay.querySelector("button") as HTMLButtonElement;
    expect(btn.textContent).toBe("Pay ₹1,917");
    expect(screen.getByTestId("pass-checkout-rescue")).toBeTruthy();
    fireEvent.click(btn);
    await waitFor(() => expect(checkout.buyPass).toHaveBeenCalledTimes(2));
    expect(checkout.buyPass.mock.calls[1][0]).toBe("till_boards");
  });
});
