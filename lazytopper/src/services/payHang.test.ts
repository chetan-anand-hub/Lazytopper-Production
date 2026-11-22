/**
 * PAY-HANG-1 - a buyer who cancelled in the UPI app and came back to a Razorpay sheet that keeps "waiting" is never stuck:
 * after a real app switch + 20 s our bar offers "Check status" (one status call per tap) and "Try again"; Razorpay's own `timeout`
 * closes the sheet eventually and that close checks the order; every entry point passes the timeout; the kill switch removes all of it.
 */
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import {
  HANG_ARM_MS,
  HANG_CHECK_COOLDOWN_MS,
  HANG_CHECK_MAX,
  HANG_CLOSE_WAIT_MS,
  PAY_HANG_CHECK,
  PAY_HANG_CHECK_ERROR,
  PAY_HANG_EVENT,
  PAY_HANG_LIMIT,
  PAY_HANG_NONE,
  PAY_HANG_NO_ROUTE,
  PAY_HANG_PAID,
  PAY_HANG_PROMPT,
  PAY_HANG_STUCK,
  PAY_HANG_WAITING,
  PAY_RETURN_FAILED,
  RAZORPAY_TIMEOUT_SECONDS,
  beginPendingCheckout,
  isCheckoutSheetOpen,
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
function fakeRazorpay(cooperative = true) {
  const seen: { opts: Opts | null; open: number; close: number } = { opts: null, open: 0, close: 0 };
  const ctor = function Rz(this: unknown, opts: Opts) {
    seen.opts = opts;
    return {
      open: () => {
        seen.open += 1;
      },
      close: () => {
        seen.close += 1;
        if (cooperative) opts.modal.ondismiss();
      },
      on: () => undefined,
    };
  } as unknown as never;
  return { seen, ctor };
}

const offs: Array<() => void> = [];
function onHang(fn: (e: Event) => void) {
  window.addEventListener(PAY_HANG_EVENT, fn);
  offs.push(() => window.removeEventListener(PAY_HANG_EVENT, fn));
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
  offs.splice(0).forEach((f) => f());
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
    expect(btn("check")?.textContent).toBe(PAY_HANG_CHECK);
    expect(btn("hide")).not.toBeNull();
    expect(btn("retry")).toBeNull(); // never a way to pay again before the server says "failed"
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

describe("PAY-HANG-1 · Check payment status (guest, with a status route)", () => {
  async function barUp() {
    const o = await openGuestSheet();
    await appSwitchAndBack();
    await vi.advanceTimersByTimeAsync(HANG_ARM_MS + 100);
    return o;
  }
  const answer = (body: unknown, status = 200) => fetchSpy.mockImplementation(() => reply(status, body));
  const tap = async () => {
    btn("check")?.click();
    await flush();
    await flush();
  };

  it("paid: ONE call with the order proof; the checkout's OWN paid flow runs (verify gets the receipt as Razorpay's result), the sheet is closed, no event, no repay", async () => {
    const verify = vi.fn(async () => undefined);
    const rz = fakeRazorpay();
    const events: string[] = [];
    onHang((e) => events.push((e as CustomEvent<HangEventDetail>).detail.kind));
    const outcome = buyAsGuest(GITEM, "9876543210", { createOrder: async () => ORDER, loadScript: async () => rz.ctor, verify });
    await flush();
    await flush();
    await appSwitchAndBack();
    await vi.advanceTimersByTimeAsync(HANG_ARM_MS + 100);
    answer({ ok: true, status: "paid_unclaimed", receipt: RECEIPT });
    await tap();
    await vi.advanceTimersByTimeAsync(300);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/pay/guest/order-status");
    expect(JSON.parse(String(init.body))).toEqual({ orderId: "order_A", proof: PROOF });
    const done = await outcome;
    expect(done).toMatchObject({ status: "paid", confirmed: true, orderId: "order_A" });
    expect(verify).toHaveBeenCalledWith({ razorpay_payment_id: "pay_A", razorpay_order_id: "order_A", razorpay_signature: "ab12" });
    expect(rz.seen.close).toBe(1);
    expect(readReceiptProof()).toEqual(RECEIPT);
    expect(readPendingOrders()).toEqual([]);
    expect(isCheckoutSheetOpen()).toBe(false);
    expect(events).toEqual([]);
    expect(bar()).toBeNull();
  });
  it("failed: the sheet is closed, the NOTE IS KEPT (a late success still resumes), the resume view gets 'failed' with Try again for the same item", async () => {
    const events: HangEventDetail[] = [];
    onHang((e) => {
      const d = (e as CustomEvent<HangEventDetail>).detail;
      events.push({ ...d });
      d.handled = true;
    });
    const { rz } = await barUp();
    answer({ ok: true, status: "failed", reason: "no_attempt" });
    await tap();
    await vi.advanceTimersByTimeAsync(300);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(rz.seen.close).toBe(1);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "failed", entry: { orderId: "order_A", buy: { kind: "pack", sku: "pack_cbq", target: "maths" } } });
    expect(readPendingOrders().map((e) => e.orderId)).toEqual(["order_A"]);
    expect(isCheckoutSheetOpen()).toBe(false);
  });
  it("failed on a page with no resume mounted: the bar says so and offers Try again HERE - the only place the bar ever does", async () => {
    await barUp();
    answer({ ok: true, status: "failed" });
    await tap();
    await vi.advanceTimersByTimeAsync(300);
    expect(line()).toBe(PAY_RETURN_FAILED);
    expect(btn("retry")).not.toBeNull();
    expect(btn("hide")).not.toBeNull();
  });
  it("pending: the message, the sheet stays open, NO Try again, each tap one call, and a 10 s cooldown between taps", async () => {
    const { rz } = await barUp();
    answer({ ok: true, status: "pending", reason: "in_progress" });
    await tap();
    expect(line()).toBe(PAY_HANG_WAITING);
    expect(rz.seen.close).toBe(0);
    expect(btn("retry")).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(btn("check")?.textContent).toBe("Check again");
    expect(btn("check")?.disabled).toBe(true); // cooling down
    btn("check")?.click();
    await flush();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(HANG_CHECK_COOLDOWN_MS + 100);
    expect(btn("check")?.disabled).toBe(false);
    await tap();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
  it("gone (404 / 403 / 410) and error / rate limit: say so, never 'failed', never Try again, the sheet stays", async () => {
    const { rz } = await barUp();
    for (const status of [404, 403, 410, 429, 500]) {
      answer({ ok: false }, status);
      await tap();
      expect(line()).toBe(PAY_HANG_CHECK_ERROR);
      expect(btn("retry")).toBeNull();
      expect(rz.seen.close).toBe(0);
      await vi.advanceTimersByTimeAsync(HANG_CHECK_COOLDOWN_MS + 100);
    }
    fetchSpy.mockImplementation(() => Promise.reject(new Error("offline")));
    await tap();
    expect(line()).toBe(PAY_HANG_CHECK_ERROR);
    expect(btn("retry")).toBeNull();
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
  it(`at most ${HANG_CHECK_MAX} status calls per order on this page, then a reload line (no more calls)`, async () => {
    await barUp();
    answer({ ok: true, status: "pending" });
    for (let i = 0; i < HANG_CHECK_MAX; i += 1) {
      await tap();
      await vi.advanceTimersByTimeAsync(HANG_CHECK_COOLDOWN_MS + 100);
    }
    expect(fetchSpy).toHaveBeenCalledTimes(HANG_CHECK_MAX);
    expect(line()).toBe(PAY_HANG_LIMIT);
    expect(btn("check")).toBeNull();
    expect(btn("reload")).not.toBeNull();
    expect(btn("retry")).toBeNull();
  });
  it("Hide: the bar goes away, nothing else happens (no call, the sheet stays open, it does not come back)", async () => {
    const { rz } = await barUp();
    btn("hide")?.click();
    expect(bar()).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(rz.seen.close).toBe(0);
    await appSwitchAndBack();
    await vi.advanceTimersByTimeAsync(HANG_ARM_MS * 2);
    expect(bar()).toBeNull();
  });
  it("without a mounted resume view a 'paid' answer from a hook-less checkout gets the plain Payment received bar", async () => {
    const rz = fakeRazorpay();
    const pending = beginPendingCheckout({ orderId: "order_A", statusProof: PROOF }, { kind: "pack", sku: "pack_cbq", target: "maths" });
    pending.watch({ close: () => { rz.seen.close += 1; pending.dismissed(); } }); // no hooks: nobody takes the paid answer
    await appSwitchAndBack();
    await vi.advanceTimersByTimeAsync(HANG_ARM_MS + 100);
    answer({ ok: true, status: "paid_unclaimed", receipt: RECEIPT });
    await tap();
    await vi.advanceTimersByTimeAsync(300);
    expect(line()).toBe(PAY_HANG_PAID);
    expect(rz.seen.close).toBe(1);
  });
  it("B5: a close() that does NOT close the sheet - our bar stays with Reload, the open-sheet count is released, the host promise is released", async () => {
    const rz = fakeRazorpay(false); // close() does nothing
    const leftover = document.createElement("div");
    leftover.className = "razorpay-container";
    document.body.appendChild(leftover);
    const outcome = buyAsGuest(GITEM, "9876543210", { createOrder: async () => ORDER, loadScript: async () => rz.ctor, verify: async () => undefined });
    await flush();
    await flush();
    await appSwitchAndBack();
    await vi.advanceTimersByTimeAsync(HANG_ARM_MS + 100);
    expect(isCheckoutSheetOpen()).toBe(true);
    answer({ ok: true, status: "failed" });
    await tap();
    await vi.advanceTimersByTimeAsync(HANG_CLOSE_WAIT_MS + 500);
    expect(rz.seen.close).toBe(1);
    expect(line()).toBe(PAY_HANG_STUCK);
    expect(btn("reload")).not.toBeNull();
    expect(btn("retry")).toBeNull();
    expect(isCheckoutSheetOpen()).toBe(false); // never stuck > 0
    expect((await outcome).status).toBe("dismissed"); // the checkout is not left hanging either
    expect(readPendingOrders().map((e) => e.orderId)).toEqual(["order_A"]); // and the note is kept
  });
  it("a sheet that Razorpay merely hides (display:none) counts as closed", async () => {
    const hiddenSheet = document.createElement("div");
    hiddenSheet.className = "razorpay-container";
    hiddenSheet.style.display = "none";
    document.body.appendChild(hiddenSheet);
    const events: string[] = [];
    onHang((e) => {
      events.push((e as CustomEvent<HangEventDetail>).detail.kind);
      (e as CustomEvent<HangEventDetail>).detail.handled = true;
    });
    await barUp();
    answer({ ok: true, status: "failed" });
    await tap();
    await vi.advanceTimersByTimeAsync(300);
    expect(events).toEqual(["failed"]);
    expect(line()).not.toBe(PAY_HANG_STUCK);
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
    onHang((e) => events.push((e as CustomEvent<HangEventDetail>).detail.kind));
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
  async function passSheet() {
    const rz = fakeRazorpay();
    const out = buyPass("month", { createOrder: async () => ({ orderId: "order_P", keyId: "k", amountPaise: 59900 }), loadScript: async () => rz.ctor, verify: async () => ({ passEnd: "x" }) } as never);
    await flush();
    await flush();
    await appSwitchAndBack();
    await vi.advanceTimersByTimeAsync(HANG_ARM_MS + 100);
    return { rz, out };
  }
  it("Check payment status uses the existing status call; paid closes the sheet and the flow continues as PENDING (the host holds the Pay buttons and confirms), never 'dismissed'", async () => {
    const post = vi.spyOn(globalThis, "fetch").mockImplementation(() => reply(200, { ok: true, state: "paid", passEnd: "2027-01-01T00:00:00.000Z" }));
    const { rz, out } = await passSheet();
    btn("check")?.click();
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(rz.seen.close).toBe(1));
    expect(String(post.mock.calls[0][0])).toBe("/api/pay/status");
    expect(await out).toEqual({ status: "pending", orderId: "order_P" });
  });
  it("no payment found: 'No payment found yet' - not 'couldn't check', no Try again, the sheet stays", async () => {
    const post = vi.spyOn(globalThis, "fetch").mockImplementation(() => reply(200, { ok: true, state: "unknown" }));
    const { rz } = await passSheet();
    btn("check")?.click();
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(line()).toBe(PAY_HANG_NONE));
    expect(btn("retry")).toBeNull();
    expect(rz.seen.close).toBe(0);
  });
  it("a checkout with no status route (signed-in pack, parent link): only the wait line + Reload + Hide - never Try again, never a new order, never a close", async () => {
    for (const start of [
      (rz: ReturnType<typeof fakeRazorpay>) => void buyPassAsParent("tok", "month", { createOrder: async () => ({ orderId: "order_Q", keyId: "k", amountPaise: 100 }), loadScript: async () => rz.ctor, verify: async () => ({ passEnd: "x", firstName: "A" }) }),
      (rz: ReturnType<typeof fakeRazorpay>) => void buyPackAsParent("tok", "Pack", { createOrder: async () => ({ orderId: "order_R", keyId: "k", amountPaise: 100 }), loadScript: async () => rz.ctor, verify: async () => ({ firstName: "A", duplicate: false }) }),
      (rz: ReturnType<typeof fakeRazorpay>) => void buyPack("pack_cbq" as never, "maths", { deps: { createOrder: async () => ({ orderId: "order_S", keyId: "k", amountPaise: 100 }), loadScript: async () => rz.ctor, verify: async () => ({}) } as never }),
    ]) {
      document.body.innerHTML = "";
      const rz = fakeRazorpay();
      start(rz);
      await flush();
      await flush();
      await appSwitchAndBack();
      await vi.advanceTimersByTimeAsync(HANG_ARM_MS + 100);
      expect(line()).toBe(PAY_HANG_NO_ROUTE);
      expect(btn("check")).toBeNull();
      expect(btn("retry")).toBeNull();
      expect(btn("reload")).not.toBeNull();
      expect(btn("hide")).not.toBeNull();
      expect(rz.seen.close).toBe(0);
      visibility("visible");
    }
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
