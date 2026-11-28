// @vitest-environment jsdom
/**
 * FU-TOPUP-NO-ANALYTICS (ORDER-DEDUP-2) - the top-up funnel sends four closed-set events, each ONCE: topup_sheet_shown {pack, surface},
 * topup_buy_tap {pack}, topup_paid {pack}, topup_failed {pack, reason: closed|error}. No amount, no order id, nothing about the student.
 * A double tap on Pay is one tap, one order.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const analytics = vi.hoisted(() => ({ trackOnboardingEvent: vi.fn() }));
vi.mock("../../analytics/analytics", () => analytics);
vi.mock("../../services/firebaseClient", () => ({ authClient: { currentUser: { uid: "u1", getIdToken: async () => "t" } }, firestoreDb: null, app: null }));

import TopupSheet from "./TopupSheet";
import type { TopupBuyDeps } from "./topupBuy";
import { __resetOrderInFlightForTests } from "../../services/orderInFlight";
import type { RazorpaySuccess } from "../../services/checkout";

const ORDER = { orderId: "order_T9", keyId: "rzp_test_x", amountPaise: 5800, gst: { baseInr: 49, gstInr: 9, totalInr: 58 } };
const SUCCESS: RazorpaySuccess = { razorpay_payment_id: "pay_9", razorpay_order_id: "order_T9", razorpay_signature: "s" };
const NOW = Date.parse("2026-11-26T12:00:00+05:30");

function deps(mode: "pay" | "dismiss", createOrder: TopupBuyDeps["createOrder"] = vi.fn(async () => ORDER)): TopupBuyDeps {
  class Fake {
    o: Record<string, unknown>;
    constructor(o: Record<string, unknown>) {
      this.o = o;
    }
    on() {}
    open() {
      if (mode === "pay") (this.o.handler as (r: RazorpaySuccess) => void)(SUCCESS);
      else (this.o.modal as { ondismiss: () => void }).ondismiss();
    }
  }
  return {
    createOrder,
    loadScript: async () => Fake as unknown as Awaited<ReturnType<TopupBuyDeps["loadScript"]>>,
    verify: vi.fn(async () => true),
    status: vi.fn(async () => false),
    prefill: async () => ({}),
    wait: async () => undefined,
  };
}

const calls = (name: string) => analytics.trackOnboardingEvent.mock.calls.filter((c) => c[0] === name);

afterEach(() => {
  __resetOrderInFlightForTests();
  cleanup();
  analytics.trackOnboardingEvent.mockReset();
});

describe("top-up analytics", () => {
  it("sheet shown once with the surface; a double tap on Pay is one buy tap, one order, one paid event", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const createOrder = vi.fn(async () => {
      await gate;
      return ORDER;
    });
    render(<TopupSheet onClose={() => undefined} nowMs={NOW} surface="limit" buyDeps={deps("pay", createOrder)} />);
    expect(calls("topup_sheet_shown")).toEqual([["topup_sheet_shown", { pack: "both", surface: "limit" }]]);
    const pay = screen.getByTestId("topup-pay-topup_49");
    fireEvent.click(pay);
    fireEvent.click(pay);
    expect(calls("topup_buy_tap")).toEqual([["topup_buy_tap", { pack: "topup_49" }]]);
    await act(async () => release());
    await screen.findByTestId("topup-paid");
    expect(createOrder).toHaveBeenCalledTimes(1);
    expect(calls("topup_paid")).toEqual([["topup_paid", { pack: "topup_49" }]]);
    expect(calls("topup_failed")).toEqual([]);
  });

  it("closing the Razorpay sheet -> topup_failed {reason: closed}, once; no paid event", async () => {
    render(<TopupSheet onClose={() => undefined} nowMs={NOW} surface="menu" buyDeps={deps("dismiss")} />);
    fireEvent.click(screen.getByTestId("topup-pay-topup_149"));
    await vi.waitFor(() => expect(calls("topup_failed")).toEqual([["topup_failed", { pack: "topup_149", reason: "closed" }]]));
    expect(calls("topup_paid")).toEqual([]);
    expect(calls("topup_sheet_shown")[0][1]).toEqual({ pack: "both", surface: "menu" });
  });

  it("an order error -> topup_failed {reason: error}, once", async () => {
    const createOrder = vi.fn(async () => {
      throw new Error("net");
    });
    render(<TopupSheet onClose={() => undefined} nowMs={NOW} buyDeps={deps("pay", createOrder)} />);
    fireEvent.click(screen.getByTestId("topup-pay-topup_49"));
    await screen.findByTestId("topup-failed");
    expect(calls("topup_failed")).toEqual([["topup_failed", { pack: "topup_49", reason: "error" }]]);
    expect(calls("topup_sheet_shown")[0][1]).toEqual({ pack: "both", surface: "other" });
  });

  it("event props are closed-set slugs only: no amount, no order or payment id", async () => {
    render(<TopupSheet onClose={() => undefined} nowMs={NOW} surface="warn" buyDeps={deps("pay")} />);
    fireEvent.click(screen.getByTestId("topup-pay-topup_49"));
    await screen.findByTestId("topup-paid");
    const sent = JSON.stringify(analytics.trackOnboardingEvent.mock.calls);
    expect(sent).not.toMatch(/order_T9|pay_9|5800|\b58\b|\b49\b(?!")/);
    for (const [, props] of analytics.trackOnboardingEvent.mock.calls) {
      for (const v of Object.values(props as Record<string, unknown>)) expect(String(v)).toMatch(/^(both|limit|menu|warn|other|topup_49|topup_149|closed|error)$/);
    }
  });
});
