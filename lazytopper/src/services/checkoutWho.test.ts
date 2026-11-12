/**
 * CHECKOUT-WHO-1 - the browser half of "Who will use it?": detection / normalisation, the Pay read-back, the success line, the
 * order body (no amount, recipient only), the Razorpay prefill rule (never the recipient for a signed-in "someone else"
 * purchase), and the outcome mapping. The flag reader is literal and off by default.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ATTACH_BEFORE_PAY,
  ATTACH_HOLD_MS,
  alreadyHasLine,
  attachCloseConfirm,
  attachPayment,
  isSelfAttachClientEnabled,
  landingPath,
  welcomeLandingPath,
  scheduleHoldEndClaim,
  alreadyCoveredLine,
  buyForRecipient,
  buyForSelf,
  createSelfOrder,
  readSelfContact,
  isCheckoutSelfClientEnabled,
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
  type SelfBuyDeps,
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

describe("PAY-ACCOUNT-1 · client switch and share helpers", () => {
  it("VITE_PAY_AUTO_ACCOUNT_ENABLED needs CHECKOUT-WHO on too; default off", async () => {
    const { isPayAutoAccountClientEnabled } = await import("./checkoutWhoFlag");
    vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "");
    vi.stubEnv("VITE_PAY_AUTO_ACCOUNT_ENABLED", "");
    expect(isPayAutoAccountClientEnabled()).toBe(false);
    vi.stubEnv("VITE_PAY_AUTO_ACCOUNT_ENABLED", "1");
    expect(isPayAutoAccountClientEnabled()).toBe(false);
    vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "1");
    expect(isPayAutoAccountClientEnabled()).toBe(true);
    vi.unstubAllEnvs();
  });

  it("the child's message names WHAT to sign in with (first-entered), never the value; WhatsApp carries only the text", async () => {
    const { childShareText, whatsappShareUrl, landingPath } = await import("./checkoutWho");
    const both = childShareText("Board Pass", { phone: "+919876543210", email: "a@b.in", first: "email" });
    expect(both).toContain("sign in with your email");
    expect(childShareText("Board Pass", { phone: "+919876543210", first: "phone" })).toContain("sign in with your mobile number");
    for (const t of [both]) expect(t).not.toMatch(/98765|a@b\.in/);
    expect(whatsappShareUrl("hi there")).toBe("https://wa.me/?text=hi%20there");
    expect(landingPath("pack")).toBe("/packs?from=pay#my-packs");
    expect(landingPath("pass")).toBe("/");
  });
});

describe("CHECKOUT-SELF-2 - Buy for yourself (the browser half)", () => {
  const SUCCESS = { razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: "s" };
  function selfDeps(over: Partial<SelfBuyDeps> = {}, success: unknown = SUCCESS) {
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
    const d: SelfBuyDeps = {
      createOrder: vi.fn(async () => ({ orderId: "order_1", keyId: "k", amountPaise: 5800 })),
      loadScript: async () => Razorpay as never,
      verify: vi.fn(async () => ({ ok: true, selfContact: { phone: "+919876543210", email: "a@b.in", first: "phone" } })),
      ...over,
    };
    return { d, opened };
  }

  it("flag: on with CHECKOUT_WHO, off with the kill switch or when the sheet itself is off", () => {
    vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "1");
    vi.stubEnv("VITE_CHECKOUT_SELF_DISABLED", "");
    expect(isCheckoutSelfClientEnabled()).toBe(true);
    vi.stubEnv("VITE_CHECKOUT_SELF_DISABLED", "1");
    expect(isCheckoutSelfClientEnabled()).toBe(false);
    vi.stubEnv("VITE_CHECKOUT_SELF_DISABLED", "");
    vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "");
    expect(isCheckoutSelfClientEnabled()).toBe(false);
  });

  it("the order body is sku (+ target) + self:true: no amount, no phone, no email, no recipient", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, orderId: "order_1", keyId: "k", amountPaise: 5800 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await createSelfOrder(CBQ)).toEqual({ orderId: "order_1", keyId: "k", amountPaise: 5800 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/pay/guest/order");
    expect(JSON.parse(String(init.body))).toEqual({ sku: "pack_cbq", target: "maths", self: true });
  });

  it("paid: Razorpay opens with the server amount and NO prefill; the contact is what the SERVER read off the payment", async () => {
    const { d, opened } = selfDeps();
    const out = await buyForSelf(CBQ, d);
    expect(out).toEqual({ status: "paid", confirmed: true, contact: { phone: "+919876543210", email: "a@b.in", first: "phone" }, amountInr: 58, paymentId: "pay_1" });
    expect(opened[0].amount).toBe(5800);
    expect(opened[0].prefill).toBeUndefined();
    expect(opened[0].readonly).toBeUndefined();
  });

  it("outcomes: dismissed; verify fails -> paid unconfirmed with no contact; nothing usable -> contact null; failures map", async () => {
    expect(await buyForSelf(CBQ, selfDeps({}, null).d)).toEqual({ status: "dismissed" });
    expect(await buyForSelf(CBQ, selfDeps({ verify: vi.fn(async () => { throw new Error("x"); }) }).d)).toMatchObject({ status: "paid", confirmed: false, contact: null });
    expect(await buyForSelf(CBQ, selfDeps({ verify: vi.fn(async () => ({ ok: true, selfContact: null })) }).d)).toMatchObject({ confirmed: true, contact: null });
    for (const [status, body, want] of [
      [409, { ok: false, error: "payment_unavailable" }, "unavailable"],
      [409, { ok: false, error: "payment_rejected", reason: "self_requires_signed_out" }, "failed"],
      [500, { ok: false }, "failed"],
    ] as const) {
      vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
      expect(await buyForSelf(CBQ, { ...selfDeps().d, createOrder: createSelfOrder })).toEqual({ status: want });
    }
  });

  it("readSelfContact re-validates the shape: phone / email / both, junk -> null", () => {
    expect(readSelfContact({ phone: "+919876543210", first: "phone" })).toEqual({ phone: "+919876543210", first: "phone" });
    expect(readSelfContact({ email: "A@B.in", first: "email" })).toEqual({ email: "a@b.in", first: "email" });
    expect(readSelfContact({ phone: "+919876543210", email: "a@b.in", first: "email" })).toEqual({ phone: "+919876543210", email: "a@b.in", first: "email" });
    for (const bad of [null, undefined, 5, {}, { phone: "123" }, { email: "nope" }]) expect(readSelfContact(bad)).toBeNull();
  });
});

describe("SELFPAY-ATTACH-1 - pay first, then say who (the browser half)", () => {
  const SUCCESS = { razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: "ab".repeat(32) };
  const deps = (verifyBody: Record<string, unknown>): SelfBuyDeps => ({
    createOrder: vi.fn(async () => ({ orderId: "order_1", keyId: "k", amountPaise: 5800 })),
    loadScript: async () =>
      class {
        o: { handler: (s: unknown) => void };
        constructor(o: { handler: (s: unknown) => void }) {
          this.o = o;
        }
        open() {
          this.o.handler(SUCCESS);
        }
      } as never,
    verify: vi.fn(async () => verifyBody),
  });

  it("flag: on with Buy for yourself; VITE_CHECKOUT_SELF_ATTACH_DISABLED=1 or the sheet off turns it off", () => {
    vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "1");
    vi.stubEnv("VITE_CHECKOUT_SELF_DISABLED", "");
    vi.stubEnv("VITE_CHECKOUT_SELF_ATTACH_DISABLED", "");
    expect(isSelfAttachClientEnabled()).toBe(true);
    vi.stubEnv("VITE_CHECKOUT_SELF_ATTACH_DISABLED", "1");
    expect(isSelfAttachClientEnabled()).toBe(false);
    vi.stubEnv("VITE_CHECKOUT_SELF_ATTACH_DISABLED", "");
    vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "");
    expect(isSelfAttachClientEnabled()).toBe(false);
  });

  it("the order carries attach:true only while the flag is on (still no amount / phone / email)", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, orderId: "order_1", keyId: "k", amountPaise: 5800 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "1");
    await createSelfOrder(CBQ);
    expect(JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body))).toEqual({ sku: "pack_cbq", target: "maths", self: true, attach: true });
    vi.stubEnv("VITE_CHECKOUT_SELF_ATTACH_DISABLED", "1");
    await createSelfOrder(CBQ);
    expect(JSON.parse(String((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body))).not.toHaveProperty("attach");
  });

  it("a verified payment whose choice is open returns the proof (memory only); an answer without it does not", async () => {
    const open = await buyForSelf(PASS, deps({ ok: true, selfContact: { phone: "+919876543210", first: "phone" }, attach: { attached: false, holdUntilMs: 1 } }));
    expect(open).toMatchObject({ status: "paid", confirmed: true, attach: { orderId: "order_1", paymentId: "pay_1", signature: "ab".repeat(32) } });
    const old = await buyForSelf(PASS, deps({ ok: true, selfContact: { phone: "+919876543210", first: "phone" } }));
    expect(old).not.toHaveProperty("attach");
    const done = await buyForSelf(PASS, deps({ ok: true, selfContact: null, attach: { attached: true } }));
    expect(done).not.toHaveProperty("attach");
  });

  it("attachPayment: body = proof + choice (+ recipient); ok / already_has / invalid / failed", async () => {
    const proof = { orderId: "order_1", paymentId: "pay_1", signature: "ab".repeat(32) };
    const f = vi.fn();
    f.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true, phoneMasked: "98•••••210" }) });
    expect(await attachPayment(proof, "me", null, f as never)).toEqual({ status: "ok", phoneMasked: "98•••••210" });
    expect(f.mock.calls[0][0]).toBe("/api/pay/guest/attach");
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ ...proof, choice: "me" });
    f.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: false, reason: "already_has" }) });
    expect(await attachPayment(proof, "other", { phone: "+919123456789", first: "phone" }, f as never)).toEqual({ status: "already_has" });
    expect(JSON.parse(f.mock.calls[1][1].body).recipient).toEqual({ phone: "+919123456789", first: "phone" });
    f.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ ok: false, reason: "invalid_recipient" }) });
    expect((await attachPayment(proof, "other", { email: "a@b.in", first: "email" }, f as never)).status).toBe("invalid");
    f.mockRejectedValueOnce(new Error("offline"));
    expect(await attachPayment(proof, "me", null, f as never)).toEqual({ status: "failed" });
  });

  it("copy and landing: the mock-up's words; Board Pass lands on Home (mobile Home is /browse), a pack on My packs, both with the welcome flag", () => {
    expect(ATTACH_BEFORE_PAY).toBe("After paying, you'll choose who uses it: you or someone else.");
    expect(alreadyHasLine("pass", false)).toBe("This number already has the Board Pass till the boards.");
    expect(alreadyHasLine("pack", false)).toBe("This number already owns this pack.");
    expect(attachCloseConfirm("98•••••210")).toBe("Your payment is safe. Sign in with 98•••••210 to use it.");
    expect(ATTACH_HOLD_MS).toBe(600000);
    expect(welcomeLandingPath("pass", true)).toBe("/?welcome=board_pass");
    expect(welcomeLandingPath("pass", false)).toBe("/browse?welcome=board_pass");
    expect(welcomeLandingPath("pack", true)).toBe("/packs?from=pay&welcome=pack#my-packs");
    expect(landingPath("pass")).toBe("/");
  });

  it("F5: a pack landing carries the bought pack's catalogue id (never anything odd)", () => {
    expect(welcomeLandingPath("pack", true, "pack_mock:maths")).toBe("/packs?from=pay&welcome=pack&pack=pack_mock%3Amaths#my-packs");
    expect(welcomeLandingPath("pack", false, "a b&c=d")).toBe("/packs?from=pay&welcome=pack#my-packs");
    expect(welcomeLandingPath("pass", true, "pack_mock:maths")).toBe("/?welcome=board_pass");
  });

  it("F1: the hold-end claim runs once at the hold's end for a signed-in user, then re-reads the subscription; signed out does nothing", async () => {
    const timers: Array<{ fn: () => void; ms: number }> = [];
    const mk = (uid: string, claimed: unknown[] | null) => ({
      uid: vi.fn(async () => uid),
      claim: vi.fn(async () => claimed),
      afterClaim: vi.fn(async () => undefined),
      setTimer: (fn: () => void, ms: number) => void timers.push({ fn, ms }),
      now: () => 1_000_000,
    });
    const signedIn = mk("u1", [{ orderId: "o1" }]);
    scheduleHoldEndClaim(1_000_000 + 600_000, signedIn);
    expect(timers[0].ms).toBe(602_000);
    expect(signedIn.claim).not.toHaveBeenCalled();
    timers[0].fn();
    await vi.waitFor(() => expect(signedIn.afterClaim).toHaveBeenCalledWith("u1"));
    expect(signedIn.claim).toHaveBeenCalledTimes(1);
    const out = mk("", null);
    scheduleHoldEndClaim(1_000_000 + 1000, out);
    timers[1].fn();
    await new Promise((r) => setTimeout(r, 5));
    expect(out.claim).not.toHaveBeenCalled();
    const empty = mk("u2", []);
    scheduleHoldEndClaim(Number.NaN, empty);
    expect(timers).toHaveLength(2);
    scheduleHoldEndClaim(1_000_000, empty);
    timers[2].fn();
    await vi.waitFor(() => expect(empty.claim).toHaveBeenCalled());
    expect(empty.afterClaim).not.toHaveBeenCalled();
  });

  it("F1: a verified attach order schedules the hold-end claim from the server's holdUntilMs", async () => {
    const scheduleHoldEnd = vi.fn();
    const out = await buyForSelf(PASS, { ...deps({ ok: true, selfContact: null, attach: { attached: false, holdUntilMs: 12345 } }), scheduleHoldEnd });
    expect(out).toMatchObject({ status: "paid", attach: { signature: expect.any(String) } });
    expect(scheduleHoldEnd).toHaveBeenCalledWith(12345);
  });
});
