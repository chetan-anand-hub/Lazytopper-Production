/**
 * PAY-RESCUE-1 - the three Razorpay openers (pass, pack, parent) listen for `payment.failed` WITHOUT resolving
 * the promise, report `afterFailure` only when the student then closes the sheet, and pass `prefill` only with
 * values the account already holds.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buyPass, prefillOption, type BuyDeps, type RazorpayConstructor } from "./checkout";
import { buyPack, type PackBuyDeps } from "./packs";
import { buyPassAsParent, type ParentBuyDeps } from "./parentPay";

// The pending-order marker reads the wall clock; pin it (Date only) so this suite is clock-independent.
beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-11-01T06:30:00.000Z"), toFake: ["Date"] });
});
afterEach(() => {
  vi.useRealTimers();
});

interface Opts {
  prefill?: unknown;
  modal: { ondismiss: () => void };
  handler: (r: unknown) => void;
}

/** A fake Razorpay: `script` runs after open() and may fire `payment.failed` / dismiss / succeed. */
function fakeRazorpay(script: (api: { fail: () => void; dismiss: () => void; pay: () => void }) => void, withOn = true) {
  const seen: { options: Opts | null; onCalls: string[] } = { options: null, onCalls: [] };
  let failedCb: (() => void) | null = null;
  class Fake {
    constructor(options: Opts) {
      seen.options = options;
      if (withOn) {
        (this as unknown as { on: (e: string, cb: () => void) => void }).on = (e, cb) => {
          seen.onCalls.push(e);
          failedCb = cb;
        };
      }
    }
    open() {
      const o = seen.options as Opts;
      script({
        fail: () => failedCb?.(),
        dismiss: () => o.modal.ondismiss(),
        pay: () => o.handler({ razorpay_payment_id: "pay_1", razorpay_order_id: "order_1", razorpay_signature: "sig" }),
      });
    }
  }
  return { ctor: Fake as unknown as RazorpayConstructor, seen };
}

const order = { orderId: "order_1", keyId: "rzp_test", amountPaise: 191700 };
const passDeps = (ctor: RazorpayConstructor, prefill?: BuyDeps["prefill"]): BuyDeps => ({
  createOrder: vi.fn(async () => order),
  loadScript: async () => ctor,
  verify: vi.fn(async () => ({ passEnd: "2027-03-01T00:00:00.000Z" })),
  ...(prefill ? { prefill } : {}),
});

describe("PAY-RESCUE-1 · buyPass", () => {
  it("a failed payment does NOT resolve the promise; closing after it is dismissed with afterFailure", async () => {
    let settled = false;
    const f = fakeRazorpay(({ fail, dismiss }) => {
      fail();
      setTimeout(() => {
        expect(settled).toBe(false); // still waiting: Razorpay keeps the sheet open for a retry
        dismiss();
      }, 5);
    });
    const p = buyPass("till_boards", passDeps(f.ctor)).then((o) => {
      settled = true;
      return o;
    });
    expect(await p).toEqual({ status: "dismissed", afterFailure: true });
    expect(f.seen.onCalls).toEqual(["payment.failed"]);
  });

  it("closing without a failure is a plain dismissed (no afterFailure key)", async () => {
    const f = fakeRazorpay(({ dismiss }) => dismiss());
    expect(await buyPass("till_boards", passDeps(f.ctor))).toEqual({ status: "dismissed" });
  });

  it("a failure followed by a successful retry in the same sheet is still a paid outcome", async () => {
    const f = fakeRazorpay(({ fail, pay }) => {
      fail();
      pay();
    });
    const out = await buyPass("till_boards", passDeps(f.ctor));
    expect(out.status).toBe("paid");
  });

  it("a Razorpay without an `on` hook still works", async () => {
    const f = fakeRazorpay(({ dismiss }) => dismiss(), false);
    expect(await buyPass("till_boards", passDeps(f.ctor))).toEqual({ status: "dismissed" });
  });

  it("prefill: only the values we hold are sent; none -> no prefill key at all", async () => {
    const a = fakeRazorpay(({ dismiss }) => dismiss());
    await buyPass("till_boards", passDeps(a.ctor, async () => ({ email: "kid@example.com", contact: "+919999999999" })));
    expect(a.seen.options?.prefill).toEqual({ email: "kid@example.com", contact: "+919999999999" });

    const b = fakeRazorpay(({ dismiss }) => dismiss());
    await buyPass("till_boards", passDeps(b.ctor, async () => ({ email: "kid@example.com" })));
    expect(b.seen.options?.prefill).toEqual({ email: "kid@example.com" });

    const c = fakeRazorpay(({ dismiss }) => dismiss());
    await buyPass("till_boards", passDeps(c.ctor, async () => ({})));
    expect(c.seen.options && "prefill" in c.seen.options).toBe(false);

    const d = fakeRazorpay(({ dismiss }) => dismiss());
    await buyPass("till_boards", passDeps(d.ctor, async () => Promise.reject(new Error("no auth"))));
    expect(d.seen.options && "prefill" in d.seen.options).toBe(false);

    const e = fakeRazorpay(({ dismiss }) => dismiss());
    await buyPass("till_boards", passDeps(e.ctor)); // injected deps without prefill
    expect(e.seen.options && "prefill" in e.seen.options).toBe(false);
  });

  it("prefillOption never emits an empty prefill", () => {
    expect(prefillOption(undefined)).toEqual({});
    expect(prefillOption({})).toEqual({});
    expect(prefillOption({ contact: "+911234567890" })).toEqual({ prefill: { contact: "+911234567890" } });
  });
});

describe("PAY-RESCUE-1 · buyPack", () => {
  const packDeps = (ctor: RazorpayConstructor, prefill?: PackBuyDeps["prefill"]): PackBuyDeps => ({
    createOrder: vi.fn(async () => order),
    loadScript: async () => ctor,
    verify: vi.fn(async () => ({ packId: "p", sku: "pack_bundle", target: "" })),
    ...(prefill ? { prefill } : {}),
  });

  it("failed then closed -> dismissed + afterFailure; plain close -> dismissed", async () => {
    const f = fakeRazorpay(({ fail, dismiss }) => {
      fail();
      dismiss();
    });
    expect(await buyPack("pack_bundle", undefined, { deps: packDeps(f.ctor) })).toEqual({ status: "dismissed", afterFailure: true });
    const g = fakeRazorpay(({ dismiss }) => dismiss());
    expect(await buyPack("pack_bundle", undefined, { deps: packDeps(g.ctor) })).toEqual({ status: "dismissed" });
  });

  it("prefill is passed through when held", async () => {
    const f = fakeRazorpay(({ dismiss }) => dismiss());
    await buyPack("pack_bundle", undefined, { deps: packDeps(f.ctor, async () => ({ email: "a@b.in" })) });
    expect(f.seen.options?.prefill).toEqual({ email: "a@b.in" });
  });
});

describe("PAY-RESCUE-1 · buyPassAsParent", () => {
  it("subscribes to payment.failed and leaves the outcome unchanged", async () => {
    const f = fakeRazorpay(({ fail, dismiss }) => {
      fail();
      dismiss();
    });
    const deps: ParentBuyDeps = {
      createOrder: vi.fn(async () => order),
      loadScript: async () => f.ctor,
      verify: vi.fn(),
    } as unknown as ParentBuyDeps;
    expect(await buyPassAsParent("t".repeat(43), "till_boards", deps)).toEqual({ status: "dismissed" });
    expect(f.seen.onCalls).toEqual(["payment.failed"]);
    expect(f.seen.options && "prefill" in f.seen.options).toBe(false); // the parent is not the signed-in child
  });
});
