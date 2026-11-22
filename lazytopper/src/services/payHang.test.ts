/**
 * PAY-HANG-1 - a buyer who cancelled in the UPI app and came back to a Razorpay sheet that keeps "waiting" is never stuck:
 * after a real app switch + 20 s our bar offers "Check status" (one status call per tap) and "Try again"; Razorpay's own `timeout`
 * closes the sheet eventually and that close checks the order; every entry point passes the timeout; the kill switch removes all of it.
 */
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import {
  HANG_ARM_MS,
  PAY_HANG_CHECK_ERROR,
  PAY_HANG_EVENT,
  PAY_HANG_PAID,
  PAY_HANG_PROMPT,
  PAY_HANG_WAITING,
  PAY_RETURN_FAILED,
  RAZORPAY_TIMEOUT_SECONDS,
  readPendingOrders,
  resetPayReturnForTests,
  type HangEventDetail,
} from "./payReturn";
import { readReceiptProof } from "./paidReceiptProof";
import { buyAsGuest, type GuestItem } from "./guestPay";
import { buyForRecipient, buyForSelf } from "./checkoutWho";
import { buyPass } from "./checkout";
import { buyPack } from "./packs";
import { buyPassAsParent } from "./parentPay";
import { buyPackAsParent } from "./parentPayPack";

vi.mock("./firebaseClient", () => ({ authClient: { currentUser: { getIdToken: async () => "tok" } } }));

const PROOF = "AbCdEfGhIjKlMnOpQrStUvWxYz012345";
const ORDER = { orderId: "order_A", keyId: "rzp_test", amountPaise: 11700, statusProof: PROOF };
const RECEIPT = { orderId: "order_A", paymentId: "pay_A", signature: "ab12" };
const GITEM: GuestItem = { kind: "pack", sku: "pack_cbq", target: "maths", label: "CBQ", description: "CBQ pack" };

type Opts = { handler: (r: unknown) => void; modal: { ondismiss: () => void }; timeout?: number };
/** A fake Razorpay: close() calls ondismiss like the real sheet does. */
function fakeRazorpay() {
  const seen: { opts: Opts | null; open: number; close: number } = { opts: null, open: 0, close: 0 };
  const ctor = function Rz(this: unknown, opts: Opts) {
    seen.opts = opts;
    return {
      open: () => {
        seen.open += 1;
      },
      close: () => {
        seen.close += 1;
        opts.modal.ondismiss();
      },
      on: () => undefined,
    };
  } as unknown as never;
  return { seen, ctor };
}

const flush = () => vi.advanceTimersByTimeAsync(1);
function visibility(state: "hidden" | "visible") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
}
const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));
const bar = () => document.querySelector('[data-testid="pay-hang-bar"]');
const line = () => document.querySelector('[data-testid="pay-hang-line"]')?.textContent ?? "";
const btn = (id: string) => document.querySelector<HTMLButtonElement>(`[data-testid="pay-hang-${id}"]`);
let fetchSpy: MockInstance<typeof fetch>;

async function openGuestSheet(order: typeof ORDER | Omit<typeof ORDER, "statusProof"> = ORDER) {
  const rz = fakeRazorpay();
  const outcome = buyAsGuest(GITEM, "9876543210", { createOrder: async () => order, loadScript: async () => rz.ctor, verify: async () => undefined });
  await flush();
  await flush();
  expect(rz.seen.open).toBe(1);
  return { rz, outcome };
}
async function appSwitchAndBack() {
  visibility("hidden");
  await vi.advanceTimersByTimeAsync(3000);
  visibility("visible");
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetPayReturnForTests();
  fetchSpy = vi.spyOn(globalThis, "fetch");
});
afterEach(() => {
  visibility("visible");
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("PAY-HANG-1 · when the bar appears", () => {
  it("hidden -> visible, then 20 s with the sheet still open: the bar appears; not a moment before", async () => {
    const { rz } = await openGuestSheet();
    await appSwitchAndBack();
    await vi.advanceTimersByTimeAsync(HANG_ARM_MS - 100);
    expect(bar()).toBeNull();
    await vi.advanceTimersByTimeAsync(200);
    expect(bar()).not.toBeNull();
    expect(line()).toBe(PAY_HANG_PROMPT);
    expect(btn("check")?.textContent).toBe("Check status");
    expect(btn("retry")?.textContent).toBe("Try again");
    expect(bar()?.getAttribute("role")).toBe("region");
    expect(rz.seen.close).toBe(0);
  });
  it("no app switch (never hidden): no bar, however long the sheet stays open", async () => {
    await openGuestSheet();
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(HANG_ARM_MS * 3);
    expect(bar()).toBeNull();
  });
  it("hidden again before the 20 s are up: the clock restarts from the next return", async () => {
    await openGuestSheet();
    await appSwitchAndBack();
    await vi.advanceTimersByTimeAsync(10_000);
    visibility("hidden");
    await vi.advanceTimersByTimeAsync(HANG_ARM_MS * 2);
    expect(bar()).toBeNull();
    visibility("visible");
    await vi.advanceTimersByTimeAsync(HANG_ARM_MS + 100);
    expect(bar()).not.toBeNull();
  });
  it("pageshow also counts as the return", async () => {
    await openGuestSheet();
    visibility("hidden");
    visibility("visible");
    await vi.advanceTimersByTimeAsync(HANG_ARM_MS + 100);
    expect(bar()).not.toBeNull();
  });
  it("the sheet already closed (buyer cancelled inside it / handler fired): no bar", async () => {
    const { rz, outcome } = await openGuestSheet();
    await appSwitchAndBack();
    rz.seen.opts?.modal.ondismiss();
    await vi.advanceTimersByTimeAsync(HANG_ARM_MS * 2);
    expect(bar()).toBeNull();
    expect((await outcome).status).toBe("dismissed");
  });
  it("the sheet closes while the bar is up: the bar goes away with it", async () => {
    const { rz } = await openGuestSheet();
    await appSwitchAndBack();
    await vi.advanceTimersByTimeAsync(HANG_ARM_MS + 100);
    expect(bar()).not.toBeNull();
    rz.seen.opts?.handler({ razorpay_order_id: "order_A", razorpay_payment_id: "pay_A", razorpay_signature: "ab" });
    await flush();
    expect(bar()).toBeNull();
  });
});

describe("PAY-HANG-1 · Check status", () => {
  async function barUp() {
    const o = await openGuestSheet();
    await appSwitchAndBack();
    await vi.advanceTimersByTimeAsync(HANG_ARM_MS + 100);
    return o;
  }
  const hangEvents: HangEventDetail[] = [];
  const take = (handled: boolean) => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<HangEventDetail>).detail;
      hangEvents.push({ ...d });
      d.handled = handled;
    };
    window.addEventListener(PAY_HANG_EVENT, on);
    return () => window.removeEventListener(PAY_HANG_EVENT, on);
  };
  beforeEach(() => {
    hangEvents.length = 0;
  });

  it("paid: ONE call carrying the order proof, the sheet is closed, the receipt proof is stored, the resume view gets 'paid'", async () => {
    const off = take(true);
    const { rz } = await barUp();
    fetchSpy.mockImplementation(() => reply(200, { ok: true, status: "paid_unclaimed", receipt: RECEIPT }));
    btn("check")?.click();
    await flush();
    await flush();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/pay/guest/order-status");
    expect(JSON.parse(String(init.body))).toEqual({ orderId: "order_A", proof: PROOF });
    expect(rz.seen.close).toBe(1);
    expect(readReceiptProof()).toEqual(RECEIPT);
    expect(readPendingOrders()).toEqual([]);
    expect(hangEvents).toHaveLength(1);
    expect(hangEvents[0]).toMatchObject({ kind: "paid", receipt: RECEIPT });
    expect(bar()).toBeNull();
    off();
  });
  it("failed: the sheet is closed and the resume view gets 'failed' for the same item (Try again reopens it)", async () => {
    const off = take(true);
    const { rz } = await barUp();
    fetchSpy.mockImplementation(() => reply(200, { ok: true, status: "failed", reason: "no_attempt" }));
    btn("check")?.click();
    await flush();
    await flush();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(rz.seen.close).toBe(1);
    expect(hangEvents[0]).toMatchObject({ kind: "failed", entry: { orderId: "order_A", buy: { kind: "pack", sku: "pack_cbq", target: "maths" } } });
    expect(readPendingOrders()).toEqual([]);
    off();
  });
  it("failed on a page with no resume mounted: a plain bar says so, with Try again", async () => {
    const { rz } = await barUp();
    fetchSpy.mockImplementation(() => reply(200, { ok: true, status: "failed" }));
    btn("check")?.click();
    await flush();
    await flush();
    expect(rz.seen.close).toBe(1);
    expect(line()).toBe(PAY_RETURN_FAILED);
    expect(btn("retry")).not.toBeNull();
  });
  it("paid on a page with no resume mounted: a plain bar says Payment received", async () => {
    await barUp();
    fetchSpy.mockImplementation(() => reply(200, { ok: true, status: "paid_unclaimed", receipt: RECEIPT }));
    btn("check")?.click();
    await flush();
    await flush();
    expect(line()).toBe(PAY_HANG_PAID);
  });
  it("pending: the message, the sheet stays open, the bar stays, and each tap is exactly one call", async () => {
    const { rz } = await barUp();
    fetchSpy.mockImplementation(() => reply(200, { ok: true, status: "pending", reason: "in_progress" }));
    btn("check")?.click();
    await flush();
    await flush();
    expect(line()).toBe(PAY_HANG_WAITING);
    expect(rz.seen.close).toBe(0);
    expect(bar()).not.toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(btn("check")?.textContent).toBe("Check again");
    btn("check")?.click();
    await flush();
    await flush();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
  it("a double tap while the call is out is still one call", async () => {
    await barUp();
    let release: (r: Response) => void = () => undefined;
    fetchSpy.mockImplementation(() => new Promise<Response>((r) => (release = r)));
    const check = btn("check");
    check?.click();
    check?.click();
    await flush();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(btn("check")).toBeNull(); // no button while the call is out
    release(new Response(JSON.stringify({ ok: true, status: "pending" }), { status: 200 }));
    await flush();
    await flush();
    expect(line()).toBe(PAY_HANG_WAITING);
  });
  it("a hiccup (network / rate limit): says so, keeps the bar and the sheet", async () => {
    const { rz } = await barUp();
    fetchSpy.mockImplementation(() => reply(429, { ok: false }));
    btn("check")?.click();
    await flush();
    await flush();
    expect(line()).toBe(PAY_HANG_CHECK_ERROR);
    expect(rz.seen.close).toBe(0);
    expect(btn("check")).not.toBeNull();
  });
  it("Try again: closes the sheet and reopens the same checkout through the ?buy= arrival (a new order)", async () => {
    const navigate = vi.fn();
    const rz = fakeRazorpay();
    // the guest checkout with the navigate seam is reached through beginPendingCheckout's deps
    const { beginPendingCheckout } = await import("./payReturn");
    const pending = beginPendingCheckout({ orderId: "order_A", statusProof: PROOF }, { kind: "pack", sku: "pack_cbq", target: "maths" }, true, { navigate });
    pending.watch({ close: () => { rz.seen.close += 1; pending.dismissed(); } });
    await appSwitchAndBack();
    await vi.advanceTimersByTimeAsync(HANG_ARM_MS + 100);
    btn("retry")?.click();
    expect(rz.seen.close).toBe(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate.mock.calls[0][0]).toContain("buy=pack_cbq");
    expect(navigate.mock.calls[0][0]).toContain("t=maths");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(bar()).toBeNull();
  });
});

describe("PAY-HANG-1 · Razorpay's own timeout", () => {
  it("every entry point passes the timeout option", async () => {
    const seenAll: Array<[string, number | undefined]> = [];
    const mk = (name: string) => {
      const rz = fakeRazorpay();
      const ctor = function (this: unknown, o: Opts) {
        seenAll.push([name, o.timeout]);
        return { open: () => o.modal.ondismiss(), close: () => undefined, on: () => undefined };
      } as unknown as never;
      void rz;
      return ctor;
    };
    const order = { ...ORDER };
    await buyAsGuest(GITEM, "9876543210", { createOrder: async () => order, loadScript: async () => mk("guest"), verify: async () => undefined });
    await buyForRecipient(GITEM, { kind: "phone", phone: "9876543210" } as never, false, { createOrder: async () => order, loadScript: async () => mk("recipient"), verify: async () => undefined } as never);
    await buyForSelf(GITEM, { createOrder: async () => order, loadScript: async () => mk("self"), verify: async () => ({}) } as never);
    await buyPass("month", { createOrder: async () => order, loadScript: async () => mk("pass"), verify: async () => ({ passEnd: "x" }) } as never);
    await buyPack("pack_cbq" as never, "maths", { deps: { createOrder: async () => order, loadScript: async () => mk("pack"), verify: async () => ({}) } as never });
    await buyPassAsParent("tok", "month", { createOrder: async () => order, loadScript: async () => mk("parent"), verify: async () => ({ passEnd: "x", firstName: "A" }) });
    await buyPackAsParent("tok", "Pack", { createOrder: async () => order, loadScript: async () => mk("parentPack"), verify: async () => ({ firstName: "A", duplicate: false }) });
    expect(seenAll.map((x) => x[0])).toEqual(["guest", "recipient", "self", "pass", "pack", "parent", "parentPack"]);
    for (const [, t] of seenAll) expect(t).toBe(RAZORPAY_TIMEOUT_SECONDS);
  });
  it("the sheet closed by the timeout keeps the note and asks the resume to check the order first; a buyer's own close still drops it", async () => {
    const events: string[] = [];
    window.addEventListener(PAY_HANG_EVENT, (e) => events.push((e as CustomEvent<HangEventDetail>).detail.kind));
    const { rz, outcome } = await openGuestSheet();
    await vi.advanceTimersByTimeAsync(RAZORPAY_TIMEOUT_SECONDS * 1000);
    rz.seen.opts?.modal.ondismiss();
    expect((await outcome).status).toBe("dismissed");
    expect(events).toEqual(["resume"]);
    expect(readPendingOrders().map((e) => e.orderId)).toEqual(["order_A"]);
    // the buyer closing it early: dropped, nothing to check
    events.length = 0;
    window.localStorage.clear();
    const second = await openGuestSheet();
    second.rz.seen.opts?.modal.ondismiss();
    await second.outcome;
    expect(events).toEqual([]);
    expect(readPendingOrders()).toEqual([]);
  });
});

describe("PAY-HANG-1 · signed-in pass checkout and no-status checkouts", () => {
  it("signed-in pass: Check status uses the existing status call, paid closes the sheet", async () => {
    const rz = fakeRazorpay();
    const post = vi.spyOn(globalThis, "fetch").mockImplementation(() => reply(200, { ok: true, state: "paid", passEnd: "2027-01-01T00:00:00.000Z" }));
    const out = buyPass("month", { createOrder: async () => ({ orderId: "order_P", keyId: "k", amountPaise: 59900 }), loadScript: async () => rz.ctor, verify: async () => ({ passEnd: "x" }) } as never);
    await flush();
    await flush();
    await appSwitchAndBack();
    await vi.advanceTimersByTimeAsync(HANG_ARM_MS + 100);
    btn("check")?.click();
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(rz.seen.close).toBe(1));
    expect(String(post.mock.calls[0][0])).toBe("/api/pay/status");
    expect(rz.seen.close).toBe(1);
    expect((await out).status).toBe("dismissed");
  });
  it("a checkout with no status route (parent link): the bar offers only Try again", async () => {
    const rz = fakeRazorpay();
    void buyPassAsParent("tok", "month", { createOrder: async () => ({ orderId: "order_Q", keyId: "k", amountPaise: 100 }), loadScript: async () => rz.ctor, verify: async () => ({ passEnd: "x", firstName: "A" }) });
    await flush();
    await flush();
    await appSwitchAndBack();
    await vi.advanceTimersByTimeAsync(HANG_ARM_MS + 100);
    expect(btn("check")).toBeNull();
    expect(btn("retry")).not.toBeNull();
    btn("retry")?.click();
    expect(rz.seen.close).toBe(1);
  });
});

describe("PAY-HANG-1 · kill switch", () => {
  it("VITE_PAY_HANG_DISABLED=1: no timeout option, no bar", async () => {
    vi.stubEnv("VITE_PAY_HANG_DISABLED", "1");
    const { rz } = await openGuestSheet();
    expect(rz.seen.opts && "timeout" in rz.seen.opts).toBe(false);
    await appSwitchAndBack();
    await vi.advanceTimersByTimeAsync(HANG_ARM_MS * 3);
    expect(bar()).toBeNull();
  });
});
