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
const flags = vi.hoisted(() => ({ guest: false, who: true }));
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
}));

import PassCheckout, { tillBoardsButtonLabel } from "./PassCheckout";
import * as packsSvc from "../../services/packs";
import { waOptInOrderFields } from "../../services/waOptIn";

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
  where = "";
  checkout.buyPass.mockResolvedValue({ status: "paid", passEnd: "2027-03-31T18:29:59.000Z", amountInr: 1917, paymentId: "pay_1" });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("WHATSAPP-OPTIN-1 - Board Pass checkout: the WhatsApp block above Pay", () => {
  it("signed in: block above Pay, unticked; Pay is one tap with it empty (nothing pending); valid + ticked is pending when buyPass runs", async () => {
    mockAuth.user = { uid: "u1", email: "anaya.k@gmail.com" };
    const seen: unknown[] = [];
    checkout.buyPass.mockImplementation(async () => {
      seen.push(waOptInOrderFields());
      return { status: "dismissed" };
    });
    mount("/pricing");
    const pay = screen.getByText(/once · valid till 28 Feb 2027/);
    const block = screen.getByTestId("pass-wa-optin");
    expect(block.compareDocumentPosition(pay) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect((screen.getByTestId("pass-wa-consent") as HTMLInputElement).checked).toBe(false);
    fireEvent.click(pay);
    await waitFor(() => expect(checkout.buyPass).toHaveBeenCalledTimes(1));
    expect(seen).toEqual([{}]);
    fireEvent.change(screen.getByTestId("pass-wa-number"), { target: { value: "+91 98765 43210" } });
    fireEvent.click(screen.getByTestId("pass-wa-consent"));
    await waitFor(() => expect((screen.getByText(/once · valid till 28 Feb 2027/) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByText(/once · valid till 28 Feb 2027/));
    await waitFor(() => expect(checkout.buyPass).toHaveBeenCalledTimes(2));
    expect(seen[1]).toEqual({ waOptIn: { phone: "9876543210", consent: true } });
  });

  it("signed out: the block is there, and Pay still opens the sheet in ONE tap", async () => {
    mount("/pricing");
    expect((screen.getByTestId("pass-wa-consent") as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByText(/once · valid till 28 Feb 2027/));
    expect(await screen.findByTestId("who-sheet")).toBeTruthy();
  });
});
