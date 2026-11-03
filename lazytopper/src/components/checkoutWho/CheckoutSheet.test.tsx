/**
 * CHECKOUT-WHO-1 - the sheet: signed-in one tap (unchanged checkout), "Buying for someone else?", the single box (mobile or
 * email), the optional second identifier, the read-back Pay label, inline validation, the success / covered screens, and the
 * analytics names (unchanged; only a `recipient: "self" | "other"` param added).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const analytics = vi.hoisted(() => ({ trackNamedEvent: vi.fn(), trackPurchase: vi.fn(), newCheckoutAttemptId: vi.fn(() => "lt_attempt") }));
vi.mock("../../analytics/analytics", () => analytics);
const packAnalytics = vi.hoisted(() => ({ trackPackPurchase: vi.fn() }));
vi.mock("../../lib/packs/packAnalytics", () => packAnalytics);

import CheckoutSheet, { type CheckoutSheetItem } from "./CheckoutSheet";
import type { WhoBuyOutcome } from "../../services/checkoutWho";

const PASS: CheckoutSheetItem = { kind: "pass", sku: "till_boards", label: "Board Pass", description: "Board Pass", priceDisplay: "₹1,917" };
const CBQ: CheckoutSheetItem = { kind: "pack", sku: "pack_cbq", target: "maths", label: "Maths CBQ Pack", description: "x", priceDisplay: "₹199" };

function mount(over: Partial<Parameters<typeof CheckoutSheet>[0]> = {}) {
  const props = {
    item: PASS,
    signedIn: false,
    selfMasked: null,
    onPaySelf: vi.fn(),
    onSignIn: vi.fn(),
    onSignInWithNumber: vi.fn(),
    onSignInWithEmail: vi.fn(),
    onClose: vi.fn(),
    buy: vi.fn(async (): Promise<WhoBuyOutcome> => ({ status: "paid", confirmed: true, amountInr: 1917, paymentId: "pay_1" })),
    ...over,
  };
  render(<CheckoutSheet {...props} />);
  return props;
}
const type = (testId: string, v: string) => fireEvent.change(screen.getByTestId(testId), { target: { value: v } });

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe("signed in", () => {
  it("'For: you · <masked>' and ONE tap into the existing checkout; no recipient order", () => {
    const p = mount({ signedIn: true, selfMasked: "an••••@gmail.com" });
    expect(screen.getByTestId("who-self").textContent).toBe("For: you · an••••@gmail.com");
    expect(screen.queryByTestId("who-first")).toBeNull();
    fireEvent.click(screen.getByTestId("who-pay-self"));
    expect(screen.getByTestId("who-pay-self").textContent).toBe("Pay ₹1,917");
    expect(p.onPaySelf).toHaveBeenCalledTimes(1);
    expect(p.onClose).toHaveBeenCalledTimes(1);
    expect(p.buy).not.toHaveBeenCalled();
    expect(analytics.trackNamedEvent).toHaveBeenCalledWith("guest_pay_option_shown", { recipient: "self" });
  });

  it("a server credit price shows on the self Pay", () => {
    mount({ signedIn: true, selfMasked: null, selfPriceDisplay: "₹1,718" });
    expect(screen.getByTestId("who-pay-self").textContent).toBe("Pay ₹1,718");
  });

  it("'Buying for someone else?' opens the same box; the purchase goes as a recipient order with the payer signed in", async () => {
    const p = mount({ signedIn: true, selfMasked: "an••••@gmail.com" });
    fireEvent.click(screen.getByTestId("who-someone-else"));
    type("who-first", "98765 43210");
    expect(screen.getByTestId("who-pay").textContent).toBe("Pay ₹1,917 for 98765 43210");
    fireEvent.click(screen.getByTestId("who-pay"));
    await screen.findByTestId("who-paid");
    expect(p.buy).toHaveBeenCalledWith(PASS, { phone: "+919876543210", first: "phone" }, true);
    expect(p.onPaySelf).not.toHaveBeenCalled();
    expect(screen.getByTestId("who-paid-line").textContent).toBe("Sign in with +91 98•••••210 — the Board Pass is already there.");
    // The payer is signed in as themselves: Done, not "Sign in".
    expect(screen.getByTestId("who-done")).toBeTruthy();
    expect(screen.queryByTestId("who-signin")).toBeNull();
  });
});

describe("signed out", () => {
  it("phone only: detected, read back, paid, then sign in with that number", async () => {
    const p = mount();
    expect(screen.getByText("Who will use it?")).toBeTruthy();
    expect(screen.getByText("Mobile number or email they sign in with")).toBeTruthy();
    expect((screen.getByTestId("who-pay") as HTMLButtonElement).disabled).toBe(true);
    type("who-first", "98765 43210");
    expect(screen.getByTestId("who-kind").textContent).toBe("Mobile number");
    expect(screen.getByTestId("who-add-second").textContent).toBe("+ Add their email too (optional)");
    fireEvent.click(screen.getByTestId("who-pay"));
    await screen.findByTestId("who-paid");
    expect(p.buy).toHaveBeenCalledWith(PASS, { phone: "+919876543210", first: "phone" }, false);
    expect(analytics.trackNamedEvent).toHaveBeenCalledWith("guest_pay_start", { recipient: "other" });
    expect(analytics.trackNamedEvent).toHaveBeenCalledWith("guest_pay_paid", { recipient: "other" });
    expect(analytics.trackPurchase).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(analytics.trackPurchase.mock.calls)).not.toMatch(/98765|43210/);
    fireEvent.click(screen.getByTestId("who-signin"));
    expect(p.onSignInWithNumber).toHaveBeenCalledWith("9876543210");
  });

  it("email only (a pack): 'Add their mobile too', read back, My packs line, emailed note, sign in by email", async () => {
    const p = mount({ item: CBQ, buy: vi.fn(async (): Promise<WhoBuyOutcome> => ({ status: "paid", confirmed: true, amountInr: 199, paymentId: "pay_2" })) });
    type("who-first", "Anaya.K@gmail.com");
    expect(screen.getByTestId("who-kind").textContent).toBe("Email");
    expect(screen.getByTestId("who-add-second").textContent).toBe("+ Add their mobile too (optional)");
    expect(screen.getByTestId("who-pay").textContent).toBe("Pay ₹199 for Anaya.K@gmail.com");
    fireEvent.click(screen.getByTestId("who-pay"));
    await screen.findByTestId("who-paid");
    expect(p.buy).toHaveBeenCalledWith(CBQ, { email: "anaya.k@gmail.com", first: "email" }, false);
    expect(screen.getByTestId("who-paid-line").textContent).toBe("Sign in with an••••@gmail.com and open My packs to download.");
    expect(screen.getByText("We've emailed this to them too.")).toBeTruthy();
    expect(packAnalytics.trackPackPurchase).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("who-signin"));
    expect(p.onSignInWithEmail).toHaveBeenCalledTimes(1);
  });

  it("both: the second box takes the other kind; an invalid second blocks Pay with an inline error", async () => {
    const p = mount();
    type("who-first", "9876543210");
    fireEvent.click(screen.getByTestId("who-add-second"));
    type("who-second", "anaya@");
    expect(screen.getByTestId("who-second-error").textContent).toBe("Enter a full email address, like name@gmail.com.");
    expect((screen.getByTestId("who-pay") as HTMLButtonElement).disabled).toBe(true);
    type("who-second", "anaya.k@gmail.com");
    expect(screen.queryByTestId("who-second-error")).toBeNull();
    fireEvent.click(screen.getByTestId("who-pay"));
    await screen.findByTestId("who-paid");
    expect(p.buy).toHaveBeenCalledWith(PASS, { phone: "+919876543210", email: "anaya.k@gmail.com", first: "phone" }, false);
    expect(screen.getByTestId("who-paid-line").textContent).toBe("Sign in with +91 98•••••210 or an••••@gmail.com — the Board Pass is already there.");
    // A phone was given: sign in with it (the number prefilled through router state by the caller).
    fireEvent.click(screen.getByTestId("who-signin"));
    expect(p.onSignInWithNumber).toHaveBeenCalledWith("9876543210");
  });

  it("inline validation of the first box after blur; nothing typed twice", () => {
    mount();
    type("who-first", "12345");
    fireEvent.blur(screen.getByTestId("who-first"));
    expect(screen.getByTestId("who-first-error").textContent).toBe("Enter a 10-digit Indian mobile number or an email address.");
    expect(screen.queryByTestId("who-second")).toBeNull();
  });

  it("already covered: one generic line; closed / failed keep the form", async () => {
    const buy = vi.fn(async (): Promise<WhoBuyOutcome> => ({ status: "already_covered" }));
    mount({ buy });
    type("who-first", "9876543210");
    fireEvent.click(screen.getByTestId("who-pay"));
    expect((await screen.findByTestId("who-covered")).textContent).toBe("The account for this already has the Board Pass till the boards. Nothing to pay.");
    cleanup();
    mount({ buy: vi.fn(async (): Promise<WhoBuyOutcome> => ({ status: "dismissed" })) });
    type("who-first", "9876543210");
    fireEvent.click(screen.getByTestId("who-pay"));
    expect(await screen.findByText("Payment window closed. Tap Pay to try again.")).toBeTruthy();
    expect((screen.getByTestId("who-first") as HTMLInputElement).value).toBe("9876543210");
    await waitFor(() => expect(analytics.trackPurchase).not.toHaveBeenCalled());
  });

  it("'Have an account? Sign in first' uses the caller's sign-in", () => {
    const p = mount();
    fireEvent.click(screen.getByTestId("who-sign-in-first"));
    expect(p.onSignIn).toHaveBeenCalledTimes(1);
  });
});
