/**
 * CHECKOUT-WHO-1 - the browser half of "Who will use it?": detection / normalisation, the Pay read-back, the success line, the
 * order body (no amount, recipient only), the Razorpay prefill rule (never the recipient for a signed-in "someone else"
 * purchase), and the outcome mapping. The flag reader is literal and off by default.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  alreadyCoveredLine,
  buyForRecipient,
  createWhoOrder,
  detectIdentifier,
  isCheckoutWhoClientEnabled,
  maskEmail,
  maskedIds,
  normaliseEmail,
  paidLine,
  payReadBack,
  readRecipient,
  selfLine,
  whoPrefill,
  WHO_UNAVAILABLE,
  type WhoBuyDeps,
} from "./checkoutWho";
import { alsoSignInLine, maskEmail as flagMaskEmail } from "./checkoutWhoFlag";
import { isCheckoutWhoCopyOn } from "../components/pricing/pricingPlansCopy";
import type { GuestItem } from "./guestPay";

const PASS: GuestItem = { kind: "pass", sku: "till_boards", label: "Board Pass", description: "Board Pass" };
const CBQ: GuestItem = { kind: "pack", sku: "pack_cbq", target: "maths", label: "Maths CBQ Pack", description: "Maths CBQ Pack" };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("flag", () => {
  it("off unless VITE_CHECKOUT_WHO_ENABLED is truthy; the /pricing copy helper follows the SAME reader", () => {
    vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "");
    expect(isCheckoutWhoClientEnabled()).toBe(false);
    expect(isCheckoutWhoCopyOn()).toBe(false);
    vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "enabled");
    expect(isCheckoutWhoClientEnabled()).toBe(false);
    vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "1");
    expect(isCheckoutWhoClientEnabled()).toBe(true);
    expect(isCheckoutWhoCopyOn()).toBe(true);
  });
});

describe("detection / normalisation", () => {
  it("one box: digits are a mobile, an @ or any letter an email", () => {
    expect(detectIdentifier("98765 43210")).toEqual({ kind: "phone", value: "+919876543210" });
    expect(detectIdentifier("+91 98765-43210")).toEqual({ kind: "phone", value: "+919876543210" });
    expect(detectIdentifier("09876543210")).toEqual({ kind: "phone", value: "+919876543210" });
    expect(detectIdentifier("98765")).toEqual({ kind: "phone", value: null });
    expect(detectIdentifier("5876543210")).toEqual({ kind: "phone", value: null });
    expect(detectIdentifier(" Anaya.K@Gmail.com ")).toEqual({ kind: "email", value: "anaya.k@gmail.com" });
    expect(detectIdentifier("anaya")).toEqual({ kind: "email", value: null });
    expect(detectIdentifier("a@b")).toEqual({ kind: "email", value: null });
    expect(detectIdentifier("   ")).toEqual({ kind: null, value: null });
    expect(normaliseEmail("X@Y.IN")).toBe("x@y.in");
    expect(maskEmail("anaya.k@gmail.com")).toBe("an••••@gmail.com");
  });

  it("two boxes: the second must be the OTHER kind and valid; the first-entered kind is kept", () => {
    expect(readRecipient("98765 43210", "")).toEqual({ phone: "+919876543210", first: "phone" });
    expect(readRecipient("anaya.k@gmail.com", "")).toEqual({ email: "anaya.k@gmail.com", first: "email" });
    expect(readRecipient("98765 43210", "Anaya.K@gmail.com")).toEqual({ phone: "+919876543210", email: "anaya.k@gmail.com", first: "phone" });
    expect(readRecipient("anaya.k@gmail.com", "9876543210")).toEqual({ phone: "+919876543210", email: "anaya.k@gmail.com", first: "email" });
    expect(readRecipient("98765 43210", "9876543211")).toBeNull();
    expect(readRecipient("98765 43210", "bad@")).toBeNull();
    expect(readRecipient("123", "")).toBeNull();
    expect(maskedIds({ phone: "+919876543210", email: "anaya.k@gmail.com", first: "email" })).toEqual(["an••••@gmail.com", "+91 98•••••210"]);
  });
});

describe("copy", () => {
  it("the Pay button reads back exactly what was typed", () => {
    expect(payReadBack("₹1,917", "98765 43210")).toBe("Pay ₹1,917 for 98765 43210");
    expect(payReadBack("₹199", "  Anaya.K@gmail.com ")).toBe("Pay ₹199 for Anaya.K@gmail.com");
    expect(payReadBack("₹1,917", "")).toBe("Pay ₹1,917");
  });

  it("success, self and covered lines (owner prototype)", () => {
    expect(paidLine("pass", ["+91 98•••••210", "an••••@gmail.com"])).toBe("Sign in with +91 98•••••210 or an••••@gmail.com — the Board Pass is already there.");
    expect(paidLine("pack", ["an••••@gmail.com"])).toBe("Sign in with an••••@gmail.com and open My packs to download.");
    expect(selfLine("an••••@gmail.com")).toBe("For: you · an••••@gmail.com");
    expect(selfLine(null)).toBe("For: you");
    expect(alreadyCoveredLine("pass")).toBe(WHO_UNAVAILABLE);
    expect(alreadyCoveredLine("pack")).toBe(WHO_UNAVAILABLE);
    expect(WHO_UNAVAILABLE).toBe("This can't be bought for that number or email right now. If the student already has it, they can sign in to check.");
    expect(alsoSignInLine("an••••@gmail.com", "email")).toBe("Also sign in with an••••@gmail.com? Confirm it once from that inbox (or with Google), then either works.");
    expect(alsoSignInLine("+91 98•••••210")).toBe("Also sign in with +91 98•••••210? Confirm it once with an SMS code, then either works.");
  });
});

describe("the order body and the Razorpay prefill", () => {
  it("the order sends the SKU, target and recipient - never an amount; signed out: no auth header", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, orderId: "order_1", keyId: "k", amountPaise: 19900 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const order = await createWhoOrder(CBQ, { email: "anaya.k@gmail.com", first: "email" }, false);
    expect(order).toEqual({ orderId: "order_1", keyId: "k", amountPaise: 19900 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/pay/guest/order");
    expect(JSON.parse(String(init.body))).toEqual({ sku: "pack_cbq", target: "maths", recipient: { email: "anaya.k@gmail.com", first: "email" } });
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("someone else (signed in): NO prefill of the recipient; signed out: what was typed, editable (no readonly)", () => {
    const r = { phone: "+919876543210", email: "anaya.k@gmail.com", first: "phone" as const };
    expect(whoPrefill(r, true)).toEqual({});
    expect(whoPrefill(r, false)).toEqual({ prefill: { contact: "+919876543210", email: "anaya.k@gmail.com" } });
  });

  function deps(over: Partial<WhoBuyDeps> = {}, success: unknown = { razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: "s" }) {
    const opened: Array<Record<string, unknown>> = [];
    const Razorpay = class {
      opts: Record<string, unknown>;
      constructor(o: Record<string, unknown>) {
        this.opts = o;
        opened.push(o);
      }
      open() {
        const o = this.opts as { handler: (s: unknown) => void; modal: { ondismiss: () => void } };
        if (success) o.handler(success);
        else o.modal.ondismiss();
      }
    };
    const d: WhoBuyDeps = {
      createOrder: vi.fn(async () => ({ orderId: "order_1", keyId: "k", amountPaise: 191700 })),
      loadScript: async () => Razorpay as never,
      verify: vi.fn(async () => undefined),
      ...over,
    };
    return { d, opened };
  }

  it("paid: server amount, verify called, Razorpay gets no recipient for a signed-in payer", async () => {
    const { d, opened } = deps();
    const out = await buyForRecipient(PASS, { phone: "+919876543210", first: "phone" }, true, d);
    expect(out).toEqual({ status: "paid", confirmed: true, amountInr: 1917, paymentId: "pay_1" });
    expect(opened[0].amount).toBe(191700);
    expect(opened[0].prefill).toBeUndefined();
    expect(opened[0].readonly).toBeUndefined();
    expect(d.verify).toHaveBeenCalledTimes(1);
  });

  it("outcomes: dismissed, verify fails -> paid unconfirmed, 409s and failures map", async () => {
    expect(await buyForRecipient(PASS, { phone: "+919876543210", first: "phone" }, false, deps({}, null).d)).toEqual({ status: "dismissed" });
    const v = deps({ verify: vi.fn(async () => { throw new Error("x"); }) });
    expect((await buyForRecipient(PASS, { phone: "+919876543210", first: "phone" }, false, v.d)).status).toBe("paid");
    expect(await buyForRecipient(PASS, { phone: "+919876543210", first: "phone" }, false, v.d)).toMatchObject({ confirmed: false });
    for (const [status, body, want] of [
      [409, { ok: false, error: "already_covered" }, "already_covered"],
      [409, { ok: false, error: "payment_unavailable" }, "unavailable"],
      [400, { ok: false, reason: "invalid_recipient" }, "invalid"],
      [500, { ok: false }, "failed"],
    ] as const) {
      vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
      const out = await buyForRecipient(PASS, { phone: "+919876543210", first: "phone" }, false, { ...deps().d, createOrder: createWhoOrder });
      expect(out).toEqual({ status: want });
    }
  });
});

describe("CHECKOUT-WHO-2 · email helpers live in the import-free flag module", () => {
  it("checkoutWho re-exports the SAME maskEmail", () => {
    expect(maskEmail).toBe(flagMaskEmail);
    expect(flagMaskEmail("Anaya.K@Gmail.com")).toBe("an••••@gmail.com");
  });
});
