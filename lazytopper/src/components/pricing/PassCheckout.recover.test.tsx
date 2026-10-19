/**
 * PAY-RECOVER-1 — the buy area after Razorpay signed a success the server could not confirm.
 * "Checking your payment…" while the status is polled; `paid` -> the existing active copy and
 * exactly one `purchase` with the SERVER's payment id; still pending -> the owner's
 * "still confirming" copy and Check again. Never the failure sentence after a signed success.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

// Pin THIS file's clock (CLOCK_GUARD): the marker's 30-minute expiry reads the wall clock, and
// a pinned clock makes every assertion here independent of the real date.
vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-19T06:30:00.000Z"));
});

const track = vi.hoisted(() => ({
  trackBeginCheckout: vi.fn(),
  trackPurchase: vi.fn(),
  newCheckoutAttemptId: vi.fn(() => "lt_attempt"),
}));
vi.mock("../../analytics/analytics", () => track);

import { CHECK_AGAIN_LABEL, PAY_STATUS_POLL_DELAYS_MS, PassCheckoutView } from "./PassCheckout";
import {
  MAX_STATUS_CHECKS_PER_ORDER,
  PAYMENT_CHECKING_COPY,
  PAYMENT_FAILED_COPY,
  PAYMENT_STILL_CONFIRMING_COPY,
  type BuyOutcome,
  type PayStatusResult,
} from "../../services/checkout";

const PENDING: BuyOutcome = { status: "pending", orderId: "order_R1", paymentId: "pay_R1" };
const SERVER_PAID: PayStatusResult = { state: "paid", passEnd: "2027-01-01T00:00:00.000Z", paymentId: "pay_SERVER", amountInr: 599 };
const FAST = [0, 0, 0, 0];

function view(onCheckStatus: (orderId: string) => Promise<PayStatusResult>, onBuy: () => Promise<BuyOutcome> = async () => PENDING) {
  return render(
    <PassCheckoutView
      signedIn
      offerOpen
      activePassEnd={null}
      onSignIn={() => undefined}
      onBuy={onBuy}
      onCheckStatus={onCheckStatus}
      pollDelaysMs={FAST}
    />,
  );
}
const tapMonth = () => fireEvent.click(screen.getByRole("button", { name: /for a month/i }));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("PAY-RECOVER-1 · PassCheckout pending", () => {
  it("shows 'Checking your payment…' while the status is asked, with the buy buttons held", async () => {
    let answer: (r: PayStatusResult) => void = () => undefined;
    const status = vi.fn(() => new Promise<PayStatusResult>((r) => (answer = r)));
    view(status);
    tapMonth();
    expect(await screen.findByTestId("pass-checkout-checking")).toHaveTextContent(PAYMENT_CHECKING_COPY);
    expect(screen.getByRole("button", { name: /for a month/i })).toBeDisabled();
    expect(document.body.textContent).not.toContain(PAYMENT_FAILED_COPY);
    expect(status).toHaveBeenCalledWith("order_R1");
    await act(async () => answer(SERVER_PAID));
  });

  it("second poll paid -> the active copy + exactly ONE purchase with the server's payment id and amount", async () => {
    const status = vi
      .fn<(orderId: string) => Promise<PayStatusResult>>()
      .mockResolvedValueOnce({ state: "pending" })
      .mockResolvedValueOnce(SERVER_PAID);
    view(status);
    tapMonth();
    expect(await screen.findByTestId("pass-checkout-paid")).toHaveTextContent(/Premium is active until 1 January 2027/);
    expect(status).toHaveBeenCalledTimes(2);
    expect(track.trackPurchase).toHaveBeenCalledTimes(1);
    expect(track.trackPurchase.mock.calls[0][0]).toMatchObject({ passType: "month", valueInr: 599, transactionId: "pay_SERVER" });
    expect(document.body.textContent).not.toContain(PAYMENT_FAILED_COPY);
  });

  it("no purchase fires while the payment is only pending", async () => {
    view(async () => ({ state: "pending" }));
    tapMonth();
    await screen.findByTestId("pass-checkout-confirming");
    expect(track.trackPurchase).not.toHaveBeenCalled();
    expect(screen.queryByTestId("pass-checkout-paid")).toBeNull();
  });

  it("all polls pending -> the 'still confirming' copy + Check again; the failure sentence is ABSENT", async () => {
    const status = vi.fn(async (): Promise<PayStatusResult> => ({ state: "pending" }));
    view(status);
    tapMonth();
    const box = await screen.findByTestId("pass-checkout-confirming");
    expect(box).toHaveTextContent(PAYMENT_STILL_CONFIRMING_COPY);
    expect(screen.getByRole("button", { name: CHECK_AGAIN_LABEL })).toBeTruthy();
    expect(status).toHaveBeenCalledTimes(FAST.length);
    expect(screen.queryByTestId("pass-checkout-failed")).toBeNull();
    expect(document.body.textContent).not.toContain("didn't go through");
  });

  it("unknown answers (Razorpay unreachable, budget spent) also end on 'still confirming', never failed", async () => {
    view(async () => ({ state: "unknown" }));
    tapMonth();
    await screen.findByTestId("pass-checkout-confirming");
    expect(screen.queryByTestId("pass-checkout-failed")).toBeNull();
  });

  it("Check again asks ONCE more; paid -> active copy and one purchase", async () => {
    const status = vi.fn(async (): Promise<PayStatusResult> => ({ state: "pending" }));
    view(status);
    tapMonth();
    await screen.findByTestId("pass-checkout-confirming");
    status.mockResolvedValueOnce(SERVER_PAID);
    fireEvent.click(screen.getByRole("button", { name: CHECK_AGAIN_LABEL }));
    expect(await screen.findByTestId("pass-checkout-paid")).toBeTruthy();
    expect(status).toHaveBeenCalledTimes(FAST.length + 1);
    expect(track.trackPurchase).toHaveBeenCalledTimes(1);
  });

  it("a plain failure (order / script) still shows the owner's failure sentence", async () => {
    const status = vi.fn();
    view(status, async () => ({ status: "failed" }));
    tapMonth();
    expect(await screen.findByTestId("pass-checkout-failed")).toHaveTextContent(PAYMENT_FAILED_COPY);
    expect(status).not.toHaveBeenCalled();
  });

  it("unmounting stops the polls", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date("2026-10-19T06:30:00.000Z"));
    try {
      const status = vi.fn(async (): Promise<PayStatusResult> => ({ state: "pending" }));
      const c = render(
        <PassCheckoutView
          signedIn
          offerOpen
          activePassEnd={null}
          onSignIn={() => undefined}
          onBuy={async () => PENDING}
          onCheckStatus={status}
          pollDelaysMs={[0, 3_000, 10_000]}
        />,
      );
      fireEvent.click(c.getByRole("button", { name: /for a month/i }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(status).toHaveBeenCalledTimes(1);
      c.unmount();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });
      expect(status).toHaveBeenCalledTimes(1);
    } finally {
      // Back to a pinned Date only (real timers for the rest of the file).
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-19T06:30:00.000Z"));
    }
  });

  it("the default schedule is sparse and leaves budget for Check again / return-to-tab", () => {
    expect(PAY_STATUS_POLL_DELAYS_MS[0]).toBe(0);
    expect(PAY_STATUS_POLL_DELAYS_MS.length).toBeLessThan(MAX_STATUS_CHECKS_PER_ORDER);
    expect(MAX_STATUS_CHECKS_PER_ORDER).toBeLessThanOrEqual(6);
    for (let i = 1; i < PAY_STATUS_POLL_DELAYS_MS.length; i += 1) {
      expect(PAY_STATUS_POLL_DELAYS_MS[i]).toBeGreaterThan(PAY_STATUS_POLL_DELAYS_MS[i - 1]);
    }
    expect(PAY_STATUS_POLL_DELAYS_MS[PAY_STATUS_POLL_DELAYS_MS.length - 1]).toBeLessThanOrEqual(30_000);
  });
});

describe("PAY-RECOVER-1 · copy", () => {
  it("never uses the word 'Ask' for the parent route", () => {
    for (const s of [PAYMENT_CHECKING_COPY, PAYMENT_STILL_CONFIRMING_COPY, CHECK_AGAIN_LABEL]) expect(s).not.toMatch(/\bask\b/i);
  });
});
