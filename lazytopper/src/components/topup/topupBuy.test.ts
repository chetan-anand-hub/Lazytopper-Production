// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { buyTopup, type TopupBuyDeps } from "./topupBuy";
import type { RazorpaySuccess } from "../../services/checkout";

const ORDER = { orderId: "order_T1", keyId: "rzp_test_x", amountPaise: 5800, gst: { baseInr: 49, gstInr: 9, totalInr: 58 } };
const SUCCESS: RazorpaySuccess = { razorpay_payment_id: "pay_1", razorpay_order_id: "order_T1", razorpay_signature: "abc" };

/** A fake Razorpay constructor whose open() calls the handler (paid) or the dismiss hook. */
function fakeRazorpay(mode: "pay" | "dismiss") {
  const seen: { options?: Record<string, unknown> } = {};
  class Fake {
    options: Record<string, unknown>;
    constructor(options: Record<string, unknown>) {
      this.options = options;
      seen.options = options;
    }
    open() {
      if (mode === "pay") (this.options.handler as (r: RazorpaySuccess) => void)(SUCCESS);
      else (this.options.modal as { ondismiss: () => void }).ondismiss();
    }
    on() {}
  }
  return { ctor: Fake as unknown as ReturnType<TopupBuyDeps["loadScript"]> extends Promise<infer C> ? C : never, seen };
}

function deps(over: Partial<TopupBuyDeps> & { mode?: "pay" | "dismiss" } = {}) {
  const fake = fakeRazorpay(over.mode ?? "pay");
  const d: TopupBuyDeps = {
    createOrder: vi.fn(async () => ORDER),
    loadScript: async () => fake.ctor,
    verify: vi.fn(async () => true),
    status: vi.fn(async () => false),
    prefill: async () => ({}),
    wait: async () => undefined,
    ...over,
  };
  return { d, fake };
}

beforeEach(() => sessionStorage.clear());

describe("TOPUP-GO-1 buyTopup", () => {
  it("sends only the pack key, charges the SERVER's order amount, and is paid only when the server verifies", async () => {
    const { d, fake } = deps();
    const out = await buyTopup("topup_49", d);
    expect(d.createOrder).toHaveBeenCalledWith("topup_49");
    expect(fake.seen.options).toMatchObject({ amount: 5800, order_id: "order_T1", currency: "INR" });
    expect(d.verify).toHaveBeenCalledWith(SUCCESS);
    expect(out).toEqual({ status: "paid", orderId: "order_T1" });
  });

  it("closing the checkout is 'dismissed' and verifies nothing", async () => {
    const { d } = deps({ mode: "dismiss" });
    expect(await buyTopup("topup_149", d)).toEqual({ status: "dismissed" });
    expect(d.verify).not.toHaveBeenCalled();
  });

  it("a signed success whose verify errors falls back to the order status, then to 'pending' - never 'failed'", async () => {
    const a = deps({ verify: vi.fn(async () => { throw new Error("net"); }), status: vi.fn(async () => true) });
    expect(await buyTopup("topup_49", a.d)).toEqual({ status: "paid", orderId: "order_T1" });
    const b = deps({ verify: vi.fn(async () => false), status: vi.fn(async () => false) });
    expect(await buyTopup("topup_49", b.d)).toEqual({ status: "pending", orderId: "order_T1" });
    expect(b.d.status).toHaveBeenCalledTimes(3);
  });

  it("an order that cannot be made (server 403 / 404 / network) is 'failed' and Razorpay never opens", async () => {
    const { d, fake } = deps({ createOrder: vi.fn(async () => { throw new Error("request failed: 403"); }) });
    expect(await buyTopup("topup_49", d)).toEqual({ status: "failed" });
    expect(fake.seen.options).toBeUndefined();
  });
});
