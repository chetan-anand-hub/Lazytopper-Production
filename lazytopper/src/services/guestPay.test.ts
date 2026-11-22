/**
 * PAY-PHONE-1 — the browser half of "Pay now with your phone number": dark by default, the number normalised and masked,
 * Razorpay opened with the number prefilled READ-ONLY, honest outcomes, and the claim once per session.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GUEST_CLAIMED_EVENT,
  buyAsGuest,
  claimOncePerSession,
  isGuestPayClientEnabled,
  maskIndianMobile,
  normaliseIndianMobile,
  resetGuestClaimSessionForTests,
  tenDigits,
  type GuestBuyDeps,
  type GuestItem,
} from "./guestPay";

/** META-IC-1: every order-create body now carries `adSignals` (cookie ids + the checkout attempt id); these tests pin the REST of the body. */
const withoutAdSignals = (b: Record<string, unknown>): Record<string, unknown> => {
  const { adSignals: _adSignals, ...rest } = b;
  return rest;
};

const ITEM: GuestItem = { kind: "pack", sku: "pack_mock", target: "maths", label: "Mock Pack · Maths", description: "Maths Mock Pack · 8 board-pattern mock papers" };

describe("SELFPAY-ATTACH-HOLD-1 · a claim that finds an order still held", () => {
  it("claims once more just after the hold ends (page open), and stops when nothing is held; no timer without a hint", async () => {
    vi.useFakeTimers();
    try {
      vi.doMock("./checkout", async (orig) => ({ ...(await orig<typeof import("./checkout")>()), authHeaders: async () => ({ Authorization: "Bearer t" }) }));
      const mod = await import("./guestPay");
      mod.resetGuestClaimSessionForTests();
      const endsMs = Date.now() + 60_000;
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, claimed: [], held: [{ holdEndsMs: endsMs }] }), { status: 200 }));
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true, claimed: [{ orderId: "o1", kind: "pass", sku: "board_pass", target: null }] }), { status: 200 }));
      const seen: unknown[] = [];
      const onClaimed = (e: Event) => seen.push((e as CustomEvent).detail);
      window.addEventListener(mod.GUEST_CLAIMED_EVENT, onClaimed);
      expect(await mod.claimOncePerSession("uHeld")).toEqual([]);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      // the uid is marked claimed: a plain second call does nothing (this is the bug), only the timer re-claims
      expect(await mod.claimOncePerSession("uHeld")).toEqual([]);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(59_000);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(4_000);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(120_000);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      window.removeEventListener(mod.GUEST_CLAIMED_EVENT, onClaimed);
      expect(seen).toHaveLength(1);
      // no hint, no timer
      fetchSpy.mockClear();
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true, claimed: [] }), { status: 200 }));
      await mod.claimOncePerSession("uPlain", { force: true });
      await vi.advanceTimersByTimeAsync(20 * 60_000);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      fetchSpy.mockRestore();
      mod.resetGuestClaimSessionForTests();
      vi.doUnmock("./checkout");
    } finally {
      vi.useRealTimers();
    }
  });

  it("a hold end more than 15 minutes away schedules nothing (not clamped); exactly 15 minutes does", async () => {
    vi.useFakeTimers();
    try {
      vi.doMock("./checkout", async (orig) => ({ ...(await orig<typeof import("./checkout")>()), authHeaders: async () => ({ Authorization: "Bearer t" }) }));
      const mod = await import("./guestPay");
      mod.resetGuestClaimSessionForTests();
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({ ok: true, claimed: [], held: [{ holdEndsMs: Date.now() + 15 * 60_000 + 1 }] }), { status: 200 }));
      await mod.claimOncePerSession("uWild");
      await vi.advanceTimersByTimeAsync(2 * 60 * 60_000);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      fetchSpy.mockImplementation(async () => new Response(JSON.stringify({ ok: true, claimed: [], held: [{ holdEndsMs: Date.now() + 15 * 60_000 }] }), { status: 200 }));
      await mod.claimOncePerSession("uEdge");
      await vi.advanceTimersByTimeAsync(15 * 60_000 + 3000);
      expect(fetchSpy.mock.calls.length).toBeGreaterThan(2);
      fetchSpy.mockRestore();
      mod.resetGuestClaimSessionForTests();
      vi.doUnmock("./checkout");
    } finally {
      vi.useRealTimers();
    }
  });

  it("a hold that is STILL reported is retried at most three times, one timer at a time", async () => {
    vi.useFakeTimers();
    try {
      vi.doMock("./checkout", async (orig) => ({ ...(await orig<typeof import("./checkout")>()), authHeaders: async () => ({ Authorization: "Bearer t" }) }));
      const mod = await import("./guestPay");
      mod.resetGuestClaimSessionForTests();
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({ ok: true, claimed: [], held: [{ holdEndsMs: Date.now() + 1000 }] }), { status: 200 }));
      await mod.claimOncePerSession("uStuck");
      await vi.advanceTimersByTimeAsync(60 * 60_000);
      expect(fetchSpy).toHaveBeenCalledTimes(4);
      fetchSpy.mockRestore();
      mod.resetGuestClaimSessionForTests();
      vi.doUnmock("./checkout");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("PUT-ON-THIS-ACCOUNT-1 · the offer after a sign-in claim that found nothing", () => {
  it("offers only when this tab holds a receipt proof AND the claim attached nothing AND the switch is on; otherwise nothing changes", async () => {
    const show = vi.fn();
    vi.doMock("../components/checkoutWho/PutOnAccountPrompt", () => ({ showPutOnAccountPrompt: show }));
    const proofMod = await import("./paidReceiptProof");
    const mod = await import("./guestPay");
    const settle = () => new Promise((r) => setTimeout(r, 20));
    // no proof: no offer
    mod.resetGuestClaimSessionForTests();
    await mod.claimOncePerSession("uA", { claim: async () => [] });
    await settle();
    expect(show).not.toHaveBeenCalled();
    // proof + nothing attached: offered, for THIS uid
    proofMod.storeReceiptProof({ orderId: "order_1", paymentId: "pay_1", signature: "ab".repeat(32) });
    mod.resetGuestClaimSessionForTests();
    await mod.claimOncePerSession("uB", { claim: async () => [] });
    await settle();
    expect(show).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith("uB");
    // the claim attached something: no offer
    show.mockClear();
    mod.resetGuestClaimSessionForTests();
    await mod.claimOncePerSession("uC", { claim: async () => [{ orderId: "o", kind: "pass", sku: "till_boards", target: null }] });
    await settle();
    expect(show).not.toHaveBeenCalled();
    // a failed claim (null): no offer
    mod.resetGuestClaimSessionForTests();
    await mod.claimOncePerSession("uD", { claim: async () => null });
    await settle();
    expect(show).not.toHaveBeenCalled();
    // kill switch
    vi.stubEnv("VITE_PUT_ON_ACCOUNT_DISABLED", "1");
    mod.resetGuestClaimSessionForTests();
    await mod.claimOncePerSession("uE", { claim: async () => [] });
    await settle();
    expect(show).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
    proofMod.clearReceiptProof();
    vi.doUnmock("../components/checkoutWho/PutOnAccountPrompt");
  });
});

function fakeRazorpay(outcome: "success" | "dismiss") {
  const seen: Record<string, unknown>[] = [];
  class FakeRazorpay {
    opts: Record<string, unknown>;
    constructor(opts: Record<string, unknown>) {
      this.opts = opts;
      seen.push(opts);
    }
    on() {}
    open() {
      const o = this.opts as { handler: (r: unknown) => void; modal: { ondismiss: () => void } };
      if (outcome === "success") o.handler({ razorpay_payment_id: "pay_1", razorpay_order_id: "order_1", razorpay_signature: "ab" });
      else o.modal.ondismiss();
    }
  }
  return { seen, ctor: FakeRazorpay as unknown as Awaited<ReturnType<GuestBuyDeps["loadScript"]>> };
}

function deps(over: Partial<GuestBuyDeps> & { outcome?: "success" | "dismiss" } = {}) {
  const rz = fakeRazorpay(over.outcome ?? "success");
  const d: GuestBuyDeps = {
    createOrder: vi.fn(async () => ({ orderId: "order_1", keyId: "rzp_test", amountPaise: 9900 })),
    loadScript: async () => rz.ctor,
    verify: vi.fn(async () => undefined),
    ...over,
  };
  return { d, seen: rz.seen };
}

// The claim path lazily mounts PackReadyToast; a unit test of guestPay must not render it (a late render after the
// test's DOM is torn down raised "window is not defined" and failed random CI shards).
vi.mock("../components/packs/PackReadyToast", () => ({ showPackReadyToast: vi.fn(), closePackReadyToastForTests: vi.fn() }));
beforeEach(() => resetGuestClaimSessionForTests());
afterEach(() => vi.unstubAllEnvs());

describe("PAY-PHONE-1 · flags", () => {
  it("is on only when BOTH VITE_PAYMENTS_ENABLED and VITE_GUEST_PAY_ENABLED are on", () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    vi.stubEnv("VITE_GUEST_PAY_ENABLED", "1");
    expect(isGuestPayClientEnabled()).toBe(true);
    vi.stubEnv("VITE_GUEST_PAY_ENABLED", "");
    expect(isGuestPayClientEnabled()).toBe(false);
    vi.stubEnv("VITE_GUEST_PAY_ENABLED", "1");
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "");
    expect(isGuestPayClientEnabled()).toBe(false);
  });
});

describe("PAY-PHONE-1 · the number", () => {
  it.each([
    ["9876543948", "+919876543948"],
    ["+91 98765 43948", "+919876543948"],
    ["09876543948", "+919876543948"],
    ["919876543948", "+919876543948"],
    ["5876543948", null],
    ["987654394", null],
    ["+449876543948", null],
    ["98765abc48", null],
    ["", null],
  ])("normalises %s -> %s (mirror of the server)", (raw, want) => {
    expect(normaliseIndianMobile(raw)).toBe(want);
  });
  it("masks the middle and gives the 10 digits for the sign-in field", () => {
    expect(maskIndianMobile("9876543948")).toBe("+91 98•••••948");
    expect(tenDigits("+919876543948")).toBe("9876543948");
    expect(maskIndianMobile("bad")).toBe("");
  });
});

describe("PAY-PHONE-1 · buyAsGuest", () => {
  it("opens Razorpay with the server order, the number prefilled and READ-ONLY, and the item's description", async () => {
    const { d, seen } = deps();
    const out = await buyAsGuest(ITEM, "98765 43948", d);
    expect(d.createOrder).toHaveBeenCalledWith(ITEM, "+919876543948");
    expect(seen[0]).toMatchObject({
      amount: 9900,
      order_id: "order_1",
      description: "Maths Mock Pack - 8 board-pattern mock papers", // RZP-ASCII-DESC-1: the sheet text is ASCII-only
      prefill: { contact: "+919876543948" },
      readonly: { contact: true },
    });
    expect(out).toEqual({ status: "paid", confirmed: true, phoneMasked: "+91 98•••••948", phone: "+919876543948", amountInr: 99, paymentId: "pay_1", orderId: "order_1" });
  });

  it("a bad number never reaches the server", async () => {
    const { d } = deps();
    expect(await buyAsGuest(ITEM, "12345", d)).toEqual({ status: "invalid_phone" });
    expect(d.createOrder).not.toHaveBeenCalled();
  });

  it("closing the sheet is dismissed; a verify error AFTER Razorpay's signed success is still paid (unconfirmed), never failed", async () => {
    expect((await buyAsGuest(ITEM, "9876543948", deps({ outcome: "dismiss" }).d)).status).toBe("dismissed");
    const out = await buyAsGuest(ITEM, "9876543948", deps({ verify: vi.fn(async () => { throw new Error("502"); }) }).d);
    expect(out).toMatchObject({ status: "paid", confirmed: false, phoneMasked: "+91 98•••••948" });
  });

  it("an order refused as already paid on this number says so (no checkout opens); a 5xx is failed", async () => {
    const { createGuestOrder } = await import("./guestPay");
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: "payment_unavailable" }), { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: "x" }), { status: 502 }));
    const { d, seen } = deps({ createOrder: createGuestOrder });
    expect(await buyAsGuest(ITEM, "9876543948", d)).toEqual({ status: "already_paid", phoneMasked: "+91 98•••••948", phone: "+919876543948" });
    expect(await buyAsGuest(ITEM, "9876543948", d)).toEqual({ status: "failed" });
    expect(seen).toHaveLength(0);
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: "account_exists" }), { status: 409 }));
    expect(await buyAsGuest(ITEM, "9876543948", d)).toEqual({ status: "account_exists", phoneMasked: "+91 98•••••948", phone: "+919876543948" });
    const sent = JSON.parse(String((fetchSpy.mock.calls[0][1] as RequestInit).body));
    expect(withoutAdSignals(sent)).toEqual({ sku: "pack_mock", target: "maths", phone: "+919876543948" });
    fetchSpy.mockRestore();
  });
});

describe("PAY-PHONE-1 · claim once per session", () => {
  it("claims once per uid, fires the claimed event when something attached, retries after a failure, and `force` runs again", async () => {
    const heard: number[] = [];
    const onClaimed = (e: Event) => heard.push((e as CustomEvent<{ count: number }>).detail.count);
    window.addEventListener(GUEST_CLAIMED_EVENT, onClaimed);
    const failing = vi.fn(async () => null);
    expect(await claimOncePerSession("u1", { claim: failing })).toBeNull();
    const ok = vi.fn(async () => [{ orderId: "o1", kind: "pack" as const, sku: "pack_mock", target: "maths" }]);
    expect(await claimOncePerSession("u1", { claim: ok })).toHaveLength(1);
    expect(await claimOncePerSession("u1", { claim: ok })).toEqual([]);
    expect(ok).toHaveBeenCalledTimes(1);
    await claimOncePerSession("u1", { claim: ok, force: true });
    expect(ok).toHaveBeenCalledTimes(2);
    expect(heard).toEqual([1, 1]);
    window.removeEventListener(GUEST_CLAIMED_EVENT, onClaimed);
  });

  it("PACK-READY-1: the event detail names what was claimed (kind, sku, target, display name) and carries no phone / order / payment id", async () => {
    const heard: unknown[] = [];
    const onClaimed = (e: Event) => heard.push((e as CustomEvent).detail);
    window.addEventListener(GUEST_CLAIMED_EVENT, onClaimed);
    await claimOncePerSession("u-ready", {
      claim: async () => [
        { orderId: "order_SECRET", kind: "pack" as const, sku: "pack_bundle", target: null },
        { orderId: "order_SECRET2", kind: "pass" as const, sku: "till_boards", target: null },
      ],
    });
    window.removeEventListener(GUEST_CLAIMED_EVENT, onClaimed);
    expect(heard).toEqual([
      {
        count: 2,
        items: [
          { kind: "pack", sku: "pack_bundle", target: null, name: "Maths + Science Bundle" },
          { kind: "pass", sku: "till_boards", target: null, name: "Board Pass" },
        ],
      },
    ]);
    expect(JSON.stringify(heard)).not.toMatch(/order_|pay_|\+91|\d{10}/);
  });

  it("PACK-READY-1: claimedItemName covers every pack sku", async () => {
    const { claimedItemName } = await import("./guestPay");
    expect(claimedItemName("pack", "pack_mock", "science")).toBe("Mock Pack \u00b7 Science");
    expect(claimedItemName("pack", "pack_cbq", "maths")).toBe("Maths CBQ Pack");
    expect(claimedItemName("pack", "pack_subject", "maths")).toBe("Subject Pack \u00b7 Maths");
    expect(claimedItemName("pack", "pack_chapter", "trigonometry")).toBe("Chapter Pack");
    expect(claimedItemName("pack", "pack_x", null)).toBe("PDF pack");
  });

  it("parallel calls share one request", async () => {
    let resolve: (v: []) => void = () => undefined;
    const slow = vi.fn(() => new Promise<[]>((r) => { resolve = r; }));
    const a = claimOncePerSession("u2", { claim: slow });
    const b = claimOncePerSession("u2", { claim: slow });
    await vi.waitFor(() => expect(slow).toHaveBeenCalled());
    resolve([]);
    await Promise.all([a, b]);
    expect(slow).toHaveBeenCalledTimes(1);
  });

  it("the claim request carries NO phone: an empty body and the ID token only", async () => {
    vi.doMock("./checkout", async (orig) => ({ ...(await orig<typeof import("./checkout")>()), authHeaders: async () => ({ Authorization: "Bearer t" }) }));
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, claimed: [] }), { status: 200 }));
    const { claimGuestPurchases } = await import("./guestPay");
    await claimGuestPurchases();
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe("{}");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t");
    fetchSpy.mockRestore();
    vi.doUnmock("./checkout");
  });
});

describe("PAY-PHONE-1 review fix 1 · the claim waits for the sign-up trial write", () => {
  it("does not call the claim until the in-flight trial write has settled", async () => {
    const order: string[] = [];
    let release: () => void = () => undefined;
    const write = new Promise<void>((r) => { release = r; });
    vi.doMock("./subscriptionService", () => ({
      whenTrialWriteSettled: () => write.then(() => { order.push("trial settled"); }),
      // PACK-READY-1 (#1523): the lazily mounted PackReadyToast reads these; a partial mock made it throw
      // an uncaught error that failed whichever CI shard this file landed in.
      onSubscriptionHydrated: () => () => undefined,
      isPaidPremium: () => false,
      loadSubscription: async () => null,
    }));
    vi.resetModules();
    const mod = await import("./guestPay");
    const p = mod.claimOncePerSession("u-new", { claim: async () => { order.push("claim"); return []; } });
    await new Promise((r) => setTimeout(r, 10));
    expect(order).toEqual([]);
    release();
    await p;
    expect(order).toEqual(["trial settled", "claim"]);
    vi.doUnmock("./subscriptionService");
  });
});

describe("CHECKOUT-WHO-1 · a claim that also named a phone", () => {
  it("keeps the MASKED 'also sign in' for THAT uid only and fires the event; an old-flow claim (no alsoSignIn) keeps nothing", async () => {
    vi.doMock("./checkout", async (orig) => ({ ...(await orig<typeof import("./checkout")>()), authHeaders: async () => ({ Authorization: "Bearer t" }) }));
    const mod = await import("./guestPay");
    const { ALSO_SIGNIN_EVENT } = await import("./checkoutWhoFlag");
    const seen: unknown[] = [];
    const onAlso = (e: Event) => seen.push((e as CustomEvent).detail);
    window.addEventListener(ALSO_SIGNIN_EVENT, onAlso);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, claimed: [{ orderId: "o1", kind: "pack", sku: "pack_cbq", target: "maths" }], alsoSignIn: { kind: "phone", masked: "+91 98•••••948" } }), { status: 200 }),
    );
    await mod.claimOncePerSession("uKid");
    expect(seen).toEqual([{ kind: "phone", masked: "+91 98•••••948" }]);
    expect(mod.readAlsoSignIn("uKid")).toEqual({ kind: "phone", masked: "+91 98•••••948" });
    expect(mod.readAlsoSignIn("uOther")).toBeNull();
    mod.clearAlsoSignIn();
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true, claimed: [] }), { status: 200 }));
    await mod.claimOncePerSession("uOld", { force: true });
    expect(mod.readAlsoSignIn("uOld")).toBeNull();
    expect(seen).toHaveLength(1);
    window.removeEventListener(ALSO_SIGNIN_EVENT, onAlso);
    fetchSpy.mockRestore();
    vi.doUnmock("./checkout");
  });
});

describe("CHECKOUT-WHO-2 · an email 'also sign in' is accepted too", () => {
  it("kind email, masked, for that uid only", async () => {
    vi.doMock("./checkout", async (orig) => ({ ...(await orig<typeof import("./checkout")>()), authHeaders: async () => ({ Authorization: "Bearer t" }) }));
    const mod = await import("./guestPay");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, claimed: [], alsoSignIn: { kind: "email", masked: "an••••@gmail.com" } }), { status: 200 }),
    );
    await mod.claimOncePerSession("uPhone", { force: true });
    expect(mod.readAlsoSignIn("uPhone")).toEqual({ kind: "email", masked: "an••••@gmail.com" });
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true, claimed: [], alsoSignIn: { kind: "sms", masked: "x" } }), { status: 200 }));
    mod.clearAlsoSignIn();
    await mod.claimOncePerSession("uPhone", { force: true });
    expect(mod.readAlsoSignIn("uPhone")).toBeNull();
    fetchSpy.mockRestore();
    vi.doUnmock("./checkout");
  });
});

describe("PAY-ACCOUNT-1 · the first sign-in of an account made at payment", () => {
  it("firstSignIn (once, from the server): kept for THAT uid until taken; trialStarted -> the subscription is re-read; never otherwise", async () => {
    vi.doMock("./checkout", async (orig) => ({ ...(await orig<typeof import("./checkout")>()), authHeaders: async () => ({ Authorization: "Bearer t" }) }));
    const sub = { whenTrialWriteSettled: vi.fn(async () => undefined), hydrateSubscriptionFromCloud: vi.fn(async () => ({})) };
    vi.doMock("./subscriptionService", () => sub);
    const mod = await import("./guestPay");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    // An existing (client-made) account: no firstSignIn -> nothing to take, nothing re-read.
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true, claimed: [] }), { status: 200 }));
    await mod.claimOncePerSession("uExisting");
    expect(mod.takeFirstSignIn("uExisting")).toBeNull();
    // firstSignIn false -> nothing either.
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true, claimed: [], firstSignIn: false }), { status: 200 }));
    await mod.claimOncePerSession("uFalse");
    expect(mod.takeFirstSignIn("uFalse")).toBeNull();
    await new Promise((r) => setTimeout(r, 0));
    expect(sub.hydrateSubscriptionFromCloud).not.toHaveBeenCalled();

    // The account made at payment, first sign-in, the server started the trial: re-read so it shows; taken ONCE, by THAT uid.
    const UID = "pay-0123456789abcdef01234567";
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true, claimed: [], firstSignIn: true, trialStarted: true }), { status: 200 }));
    await mod.claimOncePerSession(UID);
    await vi.waitFor(() => expect(sub.hydrateSubscriptionFromCloud).toHaveBeenCalledWith(UID));
    expect(mod.takeFirstSignIn("uOther")).toBeNull();
    expect(mod.takeFirstSignIn(UID)).toEqual({ trialStarted: true });
    expect(mod.takeFirstSignIn(UID)).toBeNull();

    // A reload / later sign-in: the server already marked it and says nothing -> nothing to take.
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true, claimed: [] }), { status: 200 }));
    resetGuestClaimSessionForTests();
    await mod.claimOncePerSession(UID);
    expect(mod.takeFirstSignIn(UID)).toBeNull();
    expect(sub.hydrateSubscriptionFromCloud).toHaveBeenCalledTimes(1);

    fetchSpy.mockRestore();
    vi.doUnmock("./checkout");
    vi.doUnmock("./subscriptionService");
  });

  it("a Board Pass account (trialStarted false): the sign-up is still counted, nothing re-read for a trial", async () => {
    vi.doMock("./checkout", async (orig) => ({ ...(await orig<typeof import("./checkout")>()), authHeaders: async () => ({ Authorization: "Bearer t" }) }));
    const sub = { whenTrialWriteSettled: vi.fn(async () => undefined), hydrateSubscriptionFromCloud: vi.fn(async () => ({})) };
    vi.doMock("./subscriptionService", () => sub);
    const mod = await import("./guestPay");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, claimed: [], firstSignIn: true, trialStarted: false }), { status: 200 }));
    await mod.claimOncePerSession("pay-aaaaaaaaaaaaaaaaaaaaaaaa");
    expect(mod.takeFirstSignIn("pay-aaaaaaaaaaaaaaaaaaaaaaaa")).toEqual({ trialStarted: false });
    await new Promise((r) => setTimeout(r, 0));
    expect(sub.hydrateSubscriptionFromCloud).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    vi.doUnmock("./checkout");
    vi.doUnmock("./subscriptionService");
  });
});
