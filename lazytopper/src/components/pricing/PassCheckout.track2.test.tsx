import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";

/**
 * TRACK-2 — the checkout events at PassCheckout's call sites. `purchase` fires ONLY in the
 * server-verified `paid` branch; `begin_checkout` fires on the pay tap.
 */
const track = vi.hoisted(() => ({
  trackBeginCheckout: vi.fn(),
  trackPurchase: vi.fn(),
  newCheckoutAttemptId: vi.fn(() => "lt_attempt"),
}));
vi.mock("../../analytics/analytics", () => track);

import { PassCheckoutView } from "./PassCheckout";
import { PRICE_MONTHLY_FOUNDING_INR, PRICE_MONTHLY_LIST_INR } from "../../config/pricing";
import type { BuyOutcome } from "../../services/checkout";

const PAID: BuyOutcome = { status: "paid", passEnd: "2027-01-01T00:00:00.000Z" };

function view(onBuy: () => Promise<BuyOutcome>, offerOpen = true, activePassEnd: string | null = null) {
  return render(
    <PassCheckoutView signedIn offerOpen={offerOpen} activePassEnd={activePassEnd} onSignIn={() => undefined} onBuy={onBuy} />,
  );
}
const tapMonth = (c: ReturnType<typeof view>) => fireEvent.click(c.getByRole("button", { name: /for a month/i }));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("TRACK-2 · PassCheckout events", () => {
  it("begin_checkout fires on the tap, before the purchase resolves", async () => {
    let finish: (o: BuyOutcome) => void = () => undefined;
    const c = view(() => new Promise<BuyOutcome>((r) => (finish = r)));
    tapMonth(c);
    expect(track.trackBeginCheckout).toHaveBeenCalledTimes(1);
    expect(track.trackBeginCheckout.mock.calls[0][0]).toMatchObject({ passType: "month", valueInr: PRICE_MONTHLY_FOUNDING_INR });
    expect(track.trackPurchase).not.toHaveBeenCalled();
    finish({ status: "dismissed" });
  });

  it("the list price is sent when the founding offer is closed", () => {
    const c = view(async () => ({ status: "dismissed" }), false);
    tapMonth(c);
    expect(track.trackBeginCheckout.mock.calls[0][0]).toMatchObject({ valueInr: PRICE_MONTHLY_LIST_INR });
  });

  it("purchase fires once on paid, with value and transaction id", async () => {
    const c = view(async () => PAID);
    tapMonth(c);
    await waitFor(() => expect(track.trackPurchase).toHaveBeenCalledTimes(1));
    expect(track.trackPurchase.mock.calls[0][0]).toMatchObject({
      passType: "month",
      valueInr: PRICE_MONTHLY_FOUNDING_INR,
      transactionId: "lt_attempt",
    });
  });

  it.each<[string, BuyOutcome]>([
    ["failed", { status: "failed" }],
    ["dismissed (cancel)", { status: "dismissed" }],
  ])("purchase never fires on %s", async (_n, outcome) => {
    const c = view(async () => outcome);
    tapMonth(c);
    await waitFor(() => expect(track.trackBeginCheckout).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(track.trackPurchase).not.toHaveBeenCalled();
  });

  it("purchase never fires for an already-active pass that is only displayed", () => {
    view(async () => PAID, true, "2099-01-01T00:00:00.000Z");
    expect(track.trackPurchase).not.toHaveBeenCalled();
    expect(track.trackBeginCheckout).not.toHaveBeenCalled();
  });

  it("a signed-out tap goes to sign-in and fires neither event", () => {
    const onSignIn = vi.fn();
    const c = render(
      <PassCheckoutView signedIn={false} offerOpen activePassEnd={null} onSignIn={onSignIn} onBuy={async () => PAID} />,
    );
    fireEvent.click(c.getByRole("button", { name: /for a month/i }));
    expect(onSignIn).toHaveBeenCalled();
    expect(track.trackBeginCheckout).not.toHaveBeenCalled();
  });
});
