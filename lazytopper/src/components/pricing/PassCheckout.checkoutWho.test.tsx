import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, waitFor, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

/**
 * CHECKOUT-WHO-1 / CHECKOUT-SELF-1 - the Board Pass Pay with VITE_CHECKOUT_WHO_ENABLED on: signed in, ONE tap runs the unchanged
 * checkout for the account (buyPass, one begin_checkout, one purchase) and a secondary link opens the someone-else box; signed out (Pay or ?buy=board_pass) the recipient box. Flag
 * OFF: the old flows exactly (signed in -> straight to Razorpay; signed out -> pay-by-phone sheet / sign-in), no sheet.
 */
const mockAuth = vi.hoisted(() => ({ user: null as null | { uid: string; email?: string; phoneNumber?: string; isLocalSession?: boolean }, loading: false }));
const mockSub = vi.hoisted(() => ({
  status: { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: null } as Record<string, unknown>,
  hydrated: true,
}));
const checkout = vi.hoisted(() => ({ buyPass: vi.fn() }));
const flags = vi.hoisted(() => ({ guest: false, who: true, self: false }));
const selfBuy = vi.hoisted(() => ({ fn: vi.fn() }));
const analytics = vi.hoisted(() => ({
  trackNamedEvent: vi.fn(),
  trackBeginCheckoutTap: vi.fn(),
  trackPurchase: vi.fn(),
  newCheckoutAttemptId: vi.fn(() => "lt_attempt"),
}));

vi.mock("./useMonthPassAvailable", () => ({ useMonthPassAvailable: () => false, fetchMonthPassAvailable: vi.fn(async () => false), resetMonthPassAvailableForTests: () => undefined }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => mockAuth }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => mockSub }));
vi.mock("../../services/subscriptionService", () => ({ hydrateSubscriptionFromCloud: vi.fn(async () => ({})) }));
vi.mock("../../analytics/analytics", () => analytics);
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
}));
vi.mock("../../services/checkoutWhoFlag", async (orig) => ({
  ...(await orig<typeof import("../../services/checkoutWhoFlag")>()),
  isCheckoutWhoClientEnabled: () => flags.who,
  isCheckoutSelfClientEnabled: () => flags.who && flags.self,
}));
vi.mock("../../services/checkoutWho", async (orig) => ({
  ...(await orig<typeof import("../../services/checkoutWho")>()),
  buyForSelf: (...a: unknown[]) => selfBuy.fn(...a),
  isSelfAttachClientEnabled: () => flags.who && flags.self,
}));

import PassCheckout, { tillBoardsButtonLabel } from "./PassCheckout";
import * as packsSvc from "../../services/packs";

let where = "";
function Probe() {
  const l = useLocation();
  where = `${l.pathname}${l.search}`;
  return null;
}
function mount(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Probe />
      <Routes>
        <Route path="/pricing" element={<PassCheckout />} />
        <Route path="/login" element={<p>login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-11-04T06:30:00.000Z"), toFake: ["Date"] });
  vi.clearAllMocks();
  mockAuth.user = null;
  flags.guest = false;
  flags.who = true;
  flags.self = false;
  selfBuy.fn.mockReset();
  where = "";
  checkout.buyPass.mockResolvedValue({ status: "paid", passEnd: "2027-03-31T18:29:59.000Z", amountInr: 1917, paymentId: "pay_1" });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CHECKOUT-WHO-1 · flag ON", () => {
  it("signed in: ONE 'Pay ₹…' button buys for the account itself - no 'Who will use it?', one begin_checkout, one purchase", async () => {
    mockAuth.user = { uid: "u1", email: "anaya.k@gmail.com" };
    mount("/pricing");
    fireEvent.click(screen.getByText(/once · valid till 28 Feb 2027/));
    await waitFor(() => expect(checkout.buyPass).toHaveBeenCalledTimes(1));
    expect(checkout.buyPass.mock.calls[0][0]).toBe("till_boards");
    expect(screen.queryByTestId("who-sheet")).toBeNull();
    expect(screen.queryByText("Who will use it?")).toBeNull();
    expect(await screen.findByTestId("pass-checkout-paid")).toBeTruthy();
    expect(analytics.trackBeginCheckoutTap).toHaveBeenCalledTimes(1);
    expect(analytics.trackPurchase).toHaveBeenCalledTimes(1);
  });

  it("signed in: the button amount is the same label source the page used (tillBoardsButtonLabel) when there is no credit", async () => {
    mockAuth.user = { uid: "u1", email: "anaya.k@gmail.com" };
    mount("/pricing");
    const btn = screen.getByText(/once · valid till 28 Feb 2027/);
    expect(btn.textContent).toBe(tillBoardsButtonLabel());
    expect(btn.textContent).toMatch(/^Pay ₹/);
  });

  it("signed in: the secondary link opens the existing someone-else box (no payment started); typing + Pay is a recipient order", async () => {
    mockAuth.user = { uid: "u1", email: "anaya.k@gmail.com" };
    mount("/pricing");
    fireEvent.click(screen.getByTestId("checkout-someone-else"));
    expect(await screen.findByText("Who will use it?")).toBeTruthy();
    expect(screen.getByTestId("who-first")).toBeTruthy();
    expect(screen.queryByTestId("who-self")).toBeNull();
    expect(screen.queryByTestId("who-sign-in-first")).toBeNull();
    expect(checkout.buyPass).not.toHaveBeenCalled();
    expect(analytics.trackBeginCheckoutTap).not.toHaveBeenCalled();
    expect(analytics.trackNamedEvent).toHaveBeenCalledWith("guest_pay_option_shown", { recipient: "other" });
  });

  it("signed in with a pack credit: the one button names the credited total; one tap -> buyPass once, no sheet", async () => {
    mockAuth.user = { uid: "u1", email: "anaya.k@gmail.com" };
    (packsSvc.fetchMyPacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      packs: [], licensee: { name: "", email: "" }, boardPassCredit: { creditInr: 199, payInr: 1718, expiresAtMs: Date.parse("2026-11-20T00:00:00Z") },
    });
    mount("/pricing");
    const btn = await screen.findByText(`Pay ₹${(1718).toLocaleString("en-IN")} once · valid till 28 Feb 2027`);
    fireEvent.click(btn);
    await waitFor(() => expect(checkout.buyPass).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("who-sheet")).toBeNull();
  });

  it("signed in: the link is not offered while a payment is running", async () => {
    mockAuth.user = { uid: "u1", email: "anaya.k@gmail.com" };
    checkout.buyPass.mockReturnValue(new Promise(() => undefined));
    mount("/pricing");
    fireEvent.click(screen.getByText(/once · valid till 28 Feb 2027/));
    await waitFor(() => expect((screen.getByTestId("checkout-someone-else") as HTMLButtonElement).disabled).toBe(true));
  });

  it("signed in on /pricing?buy=board_pass: starts the checkout once for the account (no sheet), param stripped", async () => {
    mockAuth.user = { uid: "u1", phoneNumber: "+919876543210" };
    mount("/pricing?buy=board_pass");
    await waitFor(() => expect(checkout.buyPass).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(where).toBe("/pricing"));
    expect(analytics.trackBeginCheckoutTap).toHaveBeenCalledWith(expect.anything(), true, true);
    expect(screen.queryByTestId("who-sheet")).toBeNull();
  });

  it("signed out: Pay opens 'Who will use it?' (no sign-in redirect, no pay-by-phone sheet)", async () => {
    flags.guest = true;
    mount("/pricing");
    fireEvent.click(screen.getByText(/once · valid till 28 Feb 2027/));
    expect(await screen.findByText("Who will use it?")).toBeTruthy();
    expect(screen.queryByTestId("guest-pay-sheet")).toBeNull();
    expect(where).toBe("/pricing");
  });

  it("signed out on /pricing?buy=board_pass: param stripped, the sheet opens", async () => {
    mount("/pricing?buy=board_pass");
    expect(await screen.findByTestId("who-first")).toBeTruthy();
    await waitFor(() => expect(where).toBe("/pricing"));
  });
});

describe("CHECKOUT-WHO-1 · flag OFF = the old flow", () => {
  it("signed in: Pay goes straight to the existing checkout; no sheet", async () => {
    flags.who = false;
    mockAuth.user = { uid: "u1", email: "anaya.k@gmail.com" };
    mount("/pricing");
    fireEvent.click(screen.getByText(/once · valid till 28 Feb 2027/));
    await waitFor(() => expect(checkout.buyPass).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("who-sheet")).toBeNull();
    expect(screen.queryByTestId("checkout-someone-else")).toBeNull(); // flag off: no new link
  });

  it("signed out, pay-by-phone off: today's sign-in redirect; on: today's pay-by-phone sheet", async () => {
    flags.who = false;
    mount("/pricing?buy=board_pass");
    await waitFor(() => expect(where).toBe("/login?redirect=%2Fpricing%3Fbuy%3Dboard_pass"));
    cleanup();
    flags.guest = true;
    mount("/pricing");
    fireEvent.click(screen.getByText(/once · valid till 28 Feb 2027/));
    expect(await screen.findByTestId("guest-pay-sheet")).toBeTruthy();
    expect(screen.queryByTestId("who-sheet")).toBeNull();
  });
});

describe("CHECKOUT-ONE-TAP-1 - signed out: the Pay tap IS the Pay tap", () => {
  beforeEach(() => {
    flags.self = true;
  });

  it("ONE Pay tap fires the self order straight away: no 'Pay' step, no choice; one begin_checkout; no signed-in buyPass", async () => {
    selfBuy.fn.mockReturnValue(new Promise(() => undefined));
    mount("/pricing");
    fireEvent.click(screen.getByText(/once · valid till 28 Feb 2027/));
    await waitFor(() => expect(selfBuy.fn).toHaveBeenCalledTimes(1));
    expect(selfBuy.fn.mock.calls[0][0]).toMatchObject({ kind: "pass", sku: "till_boards" });
    expect(screen.getByTestId("who-auto-opening")).toBeTruthy();
    expect(screen.queryByTestId("who-pay-self-out")).toBeNull();
    expect(screen.queryByTestId("who-first")).toBeNull();
    expect(screen.queryByTestId("who-someone-else")).toBeNull();
    expect(checkout.buyPass).not.toHaveBeenCalled();
    expect(analytics.trackBeginCheckoutTap).toHaveBeenCalledTimes(1);
    expect(analytics.trackBeginCheckoutTap).toHaveBeenCalledWith(expect.anything(), false, false);
  });

  it("/pricing?buy=board_pass (a link, not a tap): today's Pay step, no order until the tap", async () => {
    mount("/pricing?buy=board_pass");
    const pay = await screen.findByTestId("who-pay-self-out");
    expect(selfBuy.fn).not.toHaveBeenCalled();
    selfBuy.fn.mockReturnValue(new Promise(() => undefined));
    fireEvent.click(pay);
    await waitFor(() => expect(selfBuy.fn).toHaveBeenCalledTimes(1));
  });

  it("self switch off: today's sheet (the identifier box), no order on the tap", async () => {
    flags.self = false;
    mount("/pricing");
    fireEvent.click(screen.getByText(/once · valid till 28 Feb 2027/));
    expect(await screen.findByTestId("who-first")).toBeTruthy();
    expect(selfBuy.fn).not.toHaveBeenCalled();
  });
});
