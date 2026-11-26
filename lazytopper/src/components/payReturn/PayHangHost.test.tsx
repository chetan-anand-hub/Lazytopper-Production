/**
 * PAY-HANG-1 - after the bar's "Check payment status" answers PAID, the checkout sheet shows ITS paid state (the same screen Razorpay's own
 * handler leads to) - never the "closed / pay again" step or a rescue card.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetOrderInFlightForTests } from "../../services/orderInFlight"; // ORDER-DEDUP-1: an open (never-awaited) buy must not leak into the next test
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const analytics = vi.hoisted(() => ({ trackNamedEvent: vi.fn(), trackPurchase: vi.fn(), newCheckoutAttemptId: vi.fn(() => "lt_attempt"), trackOnboardingEvent: vi.fn() }));
vi.mock("../../analytics/analytics", () => analytics);
vi.mock("../../lib/packs/packAnalytics", () => ({ trackPackPurchase: vi.fn() }));

import GuestPaySheet from "../guestPay/GuestPaySheet";
import CheckoutSheet, { type CheckoutSheetItem } from "../checkoutWho/CheckoutSheet";
import { buyAsGuest, type GuestItem } from "../../services/guestPay";
import { buyForSelf } from "../../services/checkoutWho";
import { HANG_ARM_MS, resetPayReturnForTests } from "../../services/payReturn";

const PROOF = "AbCdEfGhIjKlMnOpQrStUvWxYz012345";
const ORDER = { orderId: "order_A", keyId: "rzp_test", amountPaise: 11700, statusProof: PROOF };
const RECEIPT = { orderId: "order_A", paymentId: "pay_A", signature: "ab12" };
const PACK: GuestItem = { kind: "pack", sku: "pack_cbq", target: "maths", label: "Maths CBQ Pack", description: "CBQ pack" };
const ITEM: CheckoutSheetItem = { ...PACK, priceDisplay: "₹117" };

function fakeCtor() {
  return function Rz(this: unknown, opts: { modal: { ondismiss: () => void } }) {
    return { open: () => undefined, close: () => opts.modal.ondismiss(), on: () => undefined };
  } as never;
}
function visibility(state: "hidden" | "visible") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
}
async function returnFromUpiAndCheck() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(50);
  });
  visibility("hidden");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
  visibility("visible");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(HANG_ARM_MS + 100);
  });
  const check = document.querySelector<HTMLButtonElement>('[data-testid="pay-hang-check"]');
  expect(check).not.toBeNull();
  await act(async () => {
    check?.click();
    await vi.advanceTimersByTimeAsync(400);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetPayReturnForTests();
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({ ok: true, status: "paid_unclaimed", receipt: RECEIPT }), { status: 200 }));
});
afterEach(() => {
  __resetOrderInFlightForTests();
  cleanup();
  visibility("visible");
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("PAY-HANG-1 · a paid answer leaves the sheets in their paid state", () => {
  it("GuestPaySheet (pay by phone): paid screen, no 'closed' step, no way to pay again", async () => {
    const buy = (item: GuestItem, phone: string) => buyAsGuest(item, phone, { createOrder: async () => ORDER, loadScript: async () => fakeCtor(), verify: async () => undefined });
    render(<GuestPaySheet item={PACK} onSignInFirst={vi.fn()} onSignInWithNumber={vi.fn()} onClose={vi.fn()} buy={buy} />);
    fireEvent.click(screen.getByTestId("guest-pay-phone"));
    fireEvent.change(screen.getByTestId("guest-pay-input"), { target: { value: "9876543210" } });
    fireEvent.click(screen.getByTestId("guest-pay-continue"));
    await returnFromUpiAndCheck();
    expect(screen.getByTestId("guest-pay-paid")).toBeTruthy();
    expect(screen.queryByTestId("guest-pay-continue")).toBeNull();
    expect(screen.queryByTestId("guest-pay-input")).toBeNull();
  });
  it("CheckoutSheet ('Buy for yourself', signed out): paid screen, the Pay button is gone", async () => {
    const buySelf = (item: GuestItem) => buyForSelf(item, { createOrder: async () => ORDER, loadScript: async () => fakeCtor(), verify: async () => ({}) } as never);
    render(<CheckoutSheet item={ITEM} signedIn={false} selfFirst buySelf={buySelf} selfMasked={null} onPaySelf={vi.fn()} onSignIn={vi.fn()} onSignInWithNumber={vi.fn()} onSignInWithEmail={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId("who-pay-self-out"));
    await returnFromUpiAndCheck();
    expect(screen.getByTestId("who-paid")).toBeTruthy();
    expect(screen.queryByTestId("who-pay-self-out")).toBeNull();
  });
});
