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

const ITEM: GuestItem = { kind: "pack", sku: "pack_mock", target: "maths", label: "Mock Pack · Maths", description: "Maths Mock Pack · 8 board-pattern mock papers" };

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
      description: ITEM.description,
      prefill: { contact: "+919876543948" },
      readonly: { contact: true },
    });
    expect(out).toEqual({ status: "paid", confirmed: true, phoneMasked: "+91 98•••••948", phone: "+919876543948", amountInr: 99, paymentId: "pay_1" });
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
    expect(sent).toEqual({ sku: "pack_mock", target: "maths", phone: "+919876543948" });
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
