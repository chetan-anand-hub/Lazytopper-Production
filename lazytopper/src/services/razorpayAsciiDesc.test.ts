/**
 * RZP-ASCII-DESC-1 - the `description` handed to Razorpay Checkout is ASCII-only, so the webhook body Razorpay signs is ASCII
 * and the raw-body HMAC verifies (a non-ASCII description made every webhook fail `bad_signature`).
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./priceConfirm", async () => {
  const actual = await vi.importActual<typeof import("./priceConfirm")>("./priceConfirm");
  return { ...actual, confirmServerPrice: vi.fn(async () => true) };
});

import { razorpayDescription, razorpaySheetDescription, toRazorpayAscii } from "./priceConfirm";
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

describe("toRazorpayAscii", () => {
  it.each([
    ["Board Pass · ₹2,262", "Board Pass - Rs 2,262"],
    ["a – b — c", "a - b - c"],
    ["it’s “good” ‘x’", "it's \"good\" 'x'"],
    ["2 × 3", "2 x 3"],
    ["a b", "a b"],
    ["café ✓ ok", "caf ok"],
    ["  spaced   out  ", "spaced out"],
  ])("%j -> %j", (input, want) => {
    expect(toRazorpayAscii(input)).toBe(want);
    expect(toRazorpayAscii(input)).toMatch(ASCII);
  });
  it("the Board Pass GST description becomes the ASCII sheet text", () => {
    expect(razorpaySheetDescription("Board Pass till your boards", ORDER)).toBe("Board Pass till your boards - Rs 1,917 + Rs 345 GST (18%) = Rs 2,262");
  });
  it("razorpayDescription itself is unchanged (still carries the middle dot and the rupee sign)", () => {
    expect(razorpayDescription("X", ORDER)).toBe("X · ₹1,917 + ₹345 GST (18%) = ₹2,262");
  });
  it("kill switch VITE_RZP_ASCII_DESC_DISABLED=1 returns the old description", () => {
    vi.stubEnv("VITE_RZP_ASCII_DESC_DISABLED", "1");
    expect(razorpaySheetDescription("X", ORDER)).toBe(razorpayDescription("X", ORDER));
  });
});

describe("every new Razorpay({...}) site passes an ASCII description for a GST order", () => {
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
    const d = String(f.opened[0].description);
    expect(d).toMatch(ASCII);
    expect(d).toContain("Rs 2,262");
    for (const k of ["name", "key", "currency"]) expect(String(f.opened[0][k])).toMatch(ASCII);
  });
  it("with the kill switch on, the old (non-ASCII) description is passed", async () => {
    vi.stubEnv("VITE_RZP_ASCII_DESC_DISABLED", "1");
    const f = fake();
    await buyPass("till_boards", { createOrder: async () => ORDER, loadScript: async () => f.ctor, verify: async () => ({ passEnd: "x" }) } as never);
    expect(String(f.opened[0].description)).toContain("₹2,262");
  });
});
void SUCCESS;
