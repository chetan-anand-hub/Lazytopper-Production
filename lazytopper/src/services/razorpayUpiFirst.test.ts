/**
 * RZP-UPI-FIRST-1 - every `new Razorpay({...})` site passes the UPI-first display `config` (all methods still shown), and
 * passes no `config` key at all under the kill switch VITE_RZP_UPI_FIRST_DISABLED=1.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./priceConfirm", async () => {
  const actual = await vi.importActual<typeof import("./priceConfirm")>("./priceConfirm");
  return { ...actual, confirmServerPrice: vi.fn(async () => true) };
});

import { razorpayUpiFirstOption } from "./razorpayDisplay";
import { buyPass } from "./checkout";
import { buyPack } from "./packs";
import { buyAsGuest } from "./guestPay";
import { buyForRecipient, buyForSelf } from "./checkoutWho";
import { buyPassAsParent } from "./parentPay";
import { buyPackAsParent } from "./parentPayPack";

const ASCII = /^[\x20-\x7E]*$/;
const GST = { baseInr: 1917, gstInr: 345, totalInr: 2262 };
const ORDER = { orderId: "order_1", keyId: "k", amountPaise: 226200, gst: GST };
const SUCCESS = { razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: "s" };

afterEach(() => vi.unstubAllEnvs());

/** A fake Razorpay constructor that records the options object and dismisses at once. */
function fake() {
  const opened: Array<Record<string, unknown>> = [];
  const ctor = class {
    o: { modal: { ondismiss: () => void } } & Record<string, unknown>;
    constructor(o: { modal: { ondismiss: () => void } } & Record<string, unknown>) {
      this.o = o;
      opened.push(o);
    }
    open() {
      this.o.modal.ondismiss();
    }
    on() {
      /* payment.failed listener */
    }
  };
  return { ctor: ctor as never, opened };
}

describe("razorpayUpiFirstOption", () => {
  it("is a UPI block first with every default block still shown", () => {
    const c = razorpayUpiFirstOption().config;
    expect(c?.display.blocks.upi.instruments).toEqual([{ method: "upi" }]);
    expect(c?.display.sequence).toEqual(["block.upi"]);
    expect(c?.display.preferences.show_default_blocks).toBe(true);
  });
  it("kill switch returns no config key", () => {
    vi.stubEnv("VITE_RZP_UPI_FIRST_DISABLED", "1");
    expect("config" in razorpayUpiFirstOption()).toBe(false);
  });
});

describe("every new Razorpay({...}) site passes the UPI-first config", () => {
  const sites: Array<[string, (c: never) => Promise<unknown>]> = [
    ["checkout.buyPass", (c) => buyPass("till_boards", { createOrder: async () => ORDER, loadScript: async () => c, verify: async () => ({ passEnd: "x" }) } as never)],
    ["packs.buyPack", (c) => buyPack("pack_chapter", "triangles", { chapterName: "Triangles", deps: { createOrder: async () => ORDER, loadScript: async () => c, verify: async () => ({}) } as never })],
    ["guestPay.buyAsGuest", (c) => buyAsGuest({ kind: "pack", sku: "pack_mock", target: "maths", label: "L", description: "Maths Mock Pack · 8 papers" } as never, "9876543948", { createOrder: async () => ORDER, loadScript: async () => c, verify: async () => undefined } as never)],
    ["checkoutWho.buyForRecipient", (c) => buyForRecipient({ kind: "pass", sku: "till_boards", label: "Board Pass", description: "Board Pass · x" } as never, { phone: "+919876543210", first: "phone" }, true, { createOrder: async () => ORDER, loadScript: async () => c, verify: async () => undefined } as never)],
    ["checkoutWho.buyForSelf", (c) => buyForSelf({ kind: "pass", sku: "till_boards", label: "Board Pass", description: "Board Pass · x" } as never, { createOrder: async () => ORDER, loadScript: async () => c, verify: async () => ({ ok: true }) } as never)],
    ["parentPay.buyPassAsParent", (c) => buyPassAsParent("tok", "month", { createOrder: async () => ORDER, loadScript: async () => c, verify: async () => ({ passEnd: "x", firstName: "A" }) } as never)],
    ["parentPayPack.buyPackAsParent", (c) => buyPackAsParent("tok", "Maths CBQ Pack", { createOrder: async () => ORDER, loadScript: async () => c, verify: async () => ({ firstName: "A", duplicate: false }) } as never)],
  ];
  it.each(sites)("%s", async (_name, run) => {
    const f = fake();
    await run(f.ctor);
    expect(f.opened).toHaveLength(1);
    const c = f.opened[0].config as ReturnType<typeof razorpayUpiFirstOption>["config"];
    expect(c?.display.blocks.upi.instruments).toEqual([{ method: "upi" }]);
    expect(c?.display.sequence).toEqual(["block.upi"]);
    expect(c?.display.preferences.show_default_blocks).toBe(true);
    // nothing else is changed or hidden
    expect(c?.display).not.toHaveProperty("hide");
    expect(f.opened[0].amount).toBe(226200);
    expect(f.opened[0].order_id).toBe("order_1");
  });
  it.each(sites)("kill switch: %s passes no config key", async (_name, run) => {
    vi.stubEnv("VITE_RZP_UPI_FIRST_DISABLED", "1");
    const f = fake();
    await run(f.ctor);
    expect(f.opened).toHaveLength(1);
    expect("config" in f.opened[0]).toBe(false);
  });
});
