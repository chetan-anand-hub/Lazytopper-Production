/**
 * PAY-RETURN-1 - the device-side note of a pending checkout and its resume: stored when a signed-out sheet opens, dropped when the sheet
 * reports, found again after a RESET page, asked of the server with a short poll, and dead behind its kill switch.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PENDING_STORE_KEY,
  PENDING_TTL_MS,
  POLL_GAP_MS,
  POLL_TRIES,
  beginPendingCheckout,
  buyTargetOf,
  fetchOrderStatus,
  forgetPendingOrder,
  hostSlug,
  isCheckoutSheetOpen,
  readPendingOrders,
  rememberPendingOrder,
  resetPayReturnForTests,
  resumePendingPayment,
  showPayReturnHint,
} from "./payReturn";
import { readReceiptProof } from "./paidReceiptProof";
import { buyAsGuest, type GuestBuyDeps, type GuestItem } from "./guestPay";
import { __resetOrderInFlightForTests } from "./orderInFlight";
import { buyForRecipient, buyForSelf, type SelfBuyDeps, type WhoBuyDeps } from "./checkoutWho";

const PROOF = "AbCdEfGhIjKlMnOpQrStUvWxYz012345";
const ITEM = { kind: "pack" as const, sku: "pack_cbq", target: "maths" };
const NOW = 1_800_000_000_000;
const RECEIPT = { orderId: "order_A", paymentId: "pay_A", signature: "ab12" };
const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetPayReturnForTests();
});
afterEach(() => {
  __resetOrderInFlightForTests(); // ORDER-DEDUP-1: the never-settling buys below must not leak into the next test
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("PAY-RETURN-1 · the pending note", () => {
  it("one entry per order, newest first, holding only ids + the per-order proof + a page slug + what reopens the checkout", () => {
    rememberPendingOrder({ orderId: "order_A", proof: PROOF, item: ITEM }, NOW);
    rememberPendingOrder({ orderId: "order_B", proof: PROOF, item: { kind: "pass" } }, NOW + 1000);
    rememberPendingOrder({ orderId: "order_A", proof: PROOF, item: ITEM }, NOW + 2000);
    const list = readPendingOrders(NOW + 3000);
    expect(list.map((e) => e.orderId)).toEqual(["order_A", "order_B"]);
    expect(list[0].buy).toEqual({ kind: "pack", sku: "pack_cbq", target: "maths" });
    expect(list[1].buy).toEqual({ kind: "pass" });
    const raw = window.localStorage.getItem(PENDING_STORE_KEY) ?? "";
    for (const forbidden of ["phone", "email", "signature", "paymentId", "pay_"]) expect(raw.toLowerCase()).not.toContain(forbidden.toLowerCase());
  });
  it("lives 30 minutes: an older entry is not returned and is removed from storage", () => {
    rememberPendingOrder({ orderId: "order_A", proof: PROOF, item: ITEM }, NOW);
    expect(readPendingOrders(NOW + PENDING_TTL_MS)).toHaveLength(1);
    expect(readPendingOrders(NOW + PENDING_TTL_MS + 1)).toEqual([]);
    expect(window.localStorage.getItem(PENDING_STORE_KEY)).toBeNull();
  });
  it("malformed storage and malformed entries are ignored, never thrown", () => {
    window.localStorage.setItem(PENDING_STORE_KEY, "{not json");
    expect(readPendingOrders(NOW)).toEqual([]);
    window.localStorage.setItem(PENDING_STORE_KEY, JSON.stringify([{ orderId: "bad id!", proof: PROOF, startedAt: NOW }, { orderId: "order_Z", proof: "short", startedAt: NOW }, null, 7]));
    expect(readPendingOrders(NOW)).toEqual([]);
    rememberPendingOrder({ orderId: "bad id!", proof: PROOF, item: ITEM }, NOW);
    rememberPendingOrder({ orderId: "order_A", proof: "short", item: ITEM }, NOW);
    expect(readPendingOrders(NOW)).toEqual([]);
  });
  it("forget removes just that order", () => {
    rememberPendingOrder({ orderId: "order_A", proof: PROOF, item: ITEM }, NOW);
    rememberPendingOrder({ orderId: "order_B", proof: PROOF, item: ITEM }, NOW);
    forgetPendingOrder("order_A");
    expect(readPendingOrders(NOW).map((e) => e.orderId)).toEqual(["order_B"]);
  });
  it("host slug comes from the path only", () => {
    expect(hostSlug("/packs")).toBe("packs");
    expect(hostSlug("/cbq-packs")).toBe("cbq_packs");
    expect(hostSlug("/pricing/")).toBe("pricing");
    expect(hostSlug("/board-pass")).toBe("board_pass");
    expect(hostSlug("/for-parents")).toBe("for_parents");
    expect(hostSlug("/anything-else")).toBe("other");
  });
  it("buyTargetOf: the Board Pass, or a pack with its sku and target", () => {
    expect(buyTargetOf({ kind: "pass" })).toEqual({ kind: "pass" });
    expect(buyTargetOf(ITEM)).toEqual({ kind: "pack", sku: "pack_cbq", target: "maths" });
  });
  it("kill switch VITE_PAY_RETURN_DISABLED=1: nothing stored, nothing read, no hint", () => {
    vi.stubEnv("VITE_PAY_RETURN_DISABLED", "1");
    rememberPendingOrder({ orderId: "order_A", proof: PROOF, item: ITEM }, NOW);
    expect(window.localStorage.getItem(PENDING_STORE_KEY)).toBeNull();
    vi.unstubAllEnvs();
    rememberPendingOrder({ orderId: "order_A", proof: PROOF, item: ITEM }, NOW);
    vi.stubEnv("VITE_PAY_RETURN_DISABLED", "1");
    expect(readPendingOrders(NOW)).toEqual([]);
    expect(showPayReturnHint()).toBe(false);
  });
});

describe("PAY-RETURN-1 · fetchOrderStatus", () => {
  it("maps the server's answers; 403/404/410 are 'gone', other trouble is 'error'", async () => {
    const entry = { orderId: "order_A", proof: PROOF };
    const call = async (status: number, body: unknown) => fetchOrderStatus(entry, (async () => new Response(JSON.stringify(body), { status })) as typeof fetch);
    expect(await call(200, { ok: true, status: "paid_unclaimed", receipt: RECEIPT })).toEqual({ kind: "paid", receipt: RECEIPT });
    expect(await call(200, { ok: true, status: "paid_unclaimed" })).toEqual({ kind: "pending", reason: "recording" });
    expect(await call(200, { ok: true, status: "failed", reason: "payment_timed_out" })).toEqual({ kind: "failed", reason: "payment_timed_out" });
    expect(await call(200, { ok: true, status: "pending", reason: "in_progress" })).toEqual({ kind: "pending", reason: "in_progress" });
    for (const s of [403, 404, 410]) expect(await call(s, { ok: false })).toEqual({ kind: "gone" });
    expect(await call(500, { ok: false })).toEqual({ kind: "error" });
    expect(await call(429, { ok: false })).toEqual({ kind: "error" });
    expect(await fetchOrderStatus(entry, (async () => { throw new Error("offline"); }) as typeof fetch)).toEqual({ kind: "error" });
  });
  it("sends only the order id and the proof", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ ok: true, status: "pending" }), { status: 200 }));
    await fetchOrderStatus({ orderId: "order_A", proof: PROOF }, f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledWith("/api/pay/guest/order-status", expect.objectContaining({ method: "POST", body: JSON.stringify({ orderId: "order_A", proof: PROOF }) }));
  });
});

describe("PAY-RETURN-1 · resumePendingPayment", () => {
  const seed = () => rememberPendingOrder({ orderId: "order_A", proof: PROOF, item: ITEM }, Date.now());
  const sleeps: number[] = [];
  const sleep = async (ms: number) => void sleeps.push(ms);
  beforeEach(() => {
    sleeps.length = 0;
  });
  it("nothing pending: no request at all", async () => {
    const f = vi.fn();
    expect(await resumePendingPayment({ fetchImpl: f as unknown as typeof fetch, sleep })).toEqual({ kind: "none" });
    expect(f).not.toHaveBeenCalled();
  });
  it("paid: the receipt proof is kept for this tab (the existing purchase card reads it) and the note is dropped", async () => {
    seed();
    const f = vi.fn(() => reply(200, { ok: true, status: "paid_unclaimed", receipt: RECEIPT }));
    const out = await resumePendingPayment({ fetchImpl: f as unknown as typeof fetch, sleep });
    expect(out.kind).toBe("paid");
    expect(readReceiptProof()).toEqual(RECEIPT);
    expect(readPendingOrders()).toEqual([]);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("pending right after the return is polled: 3 tries ~10 s apart, then 'pending' and the note STAYS", async () => {
    seed();
    const f = vi.fn(() => reply(200, { ok: true, status: "pending", reason: "in_progress" }));
    const out = await resumePendingPayment({ fetchImpl: f as unknown as typeof fetch, sleep });
    expect(out.kind).toBe("pending");
    expect(f).toHaveBeenCalledTimes(POLL_TRIES);
    expect(sleeps).toEqual([POLL_GAP_MS, POLL_GAP_MS]);
    expect((POLL_TRIES - 1) * POLL_GAP_MS).toBe(10_000);
    expect(readPendingOrders()).toHaveLength(1);
    expect(readReceiptProof()).toBeNull();
  });
  it("pending then paid on the second try", async () => {
    seed();
    const answers = [{ ok: true, status: "pending" }, { ok: true, status: "paid_unclaimed", receipt: RECEIPT }];
    const f = vi.fn(() => reply(200, answers.shift()));
    const out = await resumePendingPayment({ fetchImpl: f as unknown as typeof fetch, sleep });
    expect(out.kind).toBe("paid");
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("failed / timed out: reported once and the note is dropped (no endless 'didn't complete' on every reload)", async () => {
    seed();
    const f = vi.fn(() => reply(200, { ok: true, status: "failed", reason: "payment_timed_out" }));
    const out = await resumePendingPayment({ fetchImpl: f as unknown as typeof fetch, sleep });
    expect(out).toMatchObject({ kind: "failed", reason: "payment_timed_out" });
    expect(readPendingOrders()).toEqual([]);
    expect(await resumePendingPayment({ fetchImpl: f as unknown as typeof fetch, sleep })).toEqual({ kind: "none" });
  });
  it("gone (expired / switched off server-side): dropped quietly; a network hiccup keeps the note and retries", async () => {
    seed();
    expect(await resumePendingPayment({ fetchImpl: (() => reply(410, { ok: false })) as unknown as typeof fetch, sleep })).toEqual({ kind: "none" });
    expect(readPendingOrders()).toEqual([]);
    seed();
    const f = vi.fn(() => Promise.reject(new Error("offline")));
    expect((await resumePendingPayment({ fetchImpl: f as unknown as typeof fetch, sleep })).kind).toBe("pending");
    expect(f).toHaveBeenCalledTimes(POLL_TRIES);
    expect(readPendingOrders()).toHaveLength(1);
  });
  it("an expired note (30 min) is never asked about", async () => {
    rememberPendingOrder({ orderId: "order_A", proof: PROOF, item: ITEM }, Date.now() - PENDING_TTL_MS - 1000);
    const f = vi.fn();
    expect(await resumePendingPayment({ fetchImpl: f as unknown as typeof fetch, sleep })).toEqual({ kind: "none" });
    expect(f).not.toHaveBeenCalled();
  });
  it("no resume while a Razorpay sheet is open in this page; it resumes once the sheet settles", async () => {
    seed();
    const open = beginPendingCheckout({ orderId: "order_B", statusProof: PROOF }, ITEM);
    expect(isCheckoutSheetOpen()).toBe(true);
    const f = vi.fn(() => reply(200, { ok: true, status: "pending" }));
    expect(await resumePendingPayment({ fetchImpl: f as unknown as typeof fetch, sleep })).toEqual({ kind: "none" });
    expect(f).not.toHaveBeenCalled();
    open.settle();
    expect(isCheckoutSheetOpen()).toBe(false);
  });
  it("a sheet that opens mid-poll stops the poll", async () => {
    seed();
    let n = 0;
    const f = vi.fn(() => {
      n += 1;
      if (n === 1) beginPendingCheckout({ orderId: "order_C" }, ITEM, false);
      return reply(200, { ok: true, status: "pending" });
    });
    expect(await resumePendingPayment({ fetchImpl: f as unknown as typeof fetch, sleep })).toEqual({ kind: "none" });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("kill switch: no request even with a note", async () => {
    seed();
    vi.stubEnv("VITE_PAY_RETURN_DISABLED", "1");
    const f = vi.fn();
    expect(await resumePendingPayment({ fetchImpl: f as unknown as typeof fetch, sleep })).toEqual({ kind: "none" });
    expect(f).not.toHaveBeenCalled();
  });
});

/* ── the three signed-out checkouts leave the note while the sheet is open, and clear it when it reports ── */
type Opts = { handler: (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void; modal: { ondismiss: () => void } };
function fakeRazorpay(onOpen: (opts: Opts) => void) {
  return (function Rz(this: unknown, opts: Opts) {
    return { open: () => onOpen(opts), on: () => undefined };
  }) as unknown as ReturnType<GuestBuyDeps["loadScript"]> extends Promise<infer R> ? R : never;
}
const ORDER = { orderId: "order_A", keyId: "rzp_test", amountPaise: 4900, statusProof: PROOF };
const SUCCESS = { razorpay_order_id: "order_A", razorpay_payment_id: "pay_A", razorpay_signature: "ab" };
const GITEM: GuestItem = { kind: "pack", sku: "pack_cbq", target: "maths", label: "CBQ", description: "CBQ pack" };

describe("PAY-RETURN-1 · the checkouts leave and clear the note", () => {
  const guestDeps = (onOpen: (o: Opts) => void, order: typeof ORDER | Omit<typeof ORDER, "statusProof"> = ORDER): GuestBuyDeps => ({
    createOrder: async () => order,
    loadScript: async () => fakeRazorpay(onOpen),
    verify: async () => undefined,
  });
  it("pay-by-phone (GuestPaySheet): noted while the sheet is open, cleared by the handler", async () => {
    let seenDuring: unknown = null;
    const out = await buyAsGuest(GITEM, "9876543210", guestDeps((o) => {
      seenDuring = readPendingOrders().map((e) => e.orderId);
      expect(isCheckoutSheetOpen()).toBe(true);
      o.handler(SUCCESS);
    }));
    expect(out.status).toBe("paid");
    expect(seenDuring).toEqual(["order_A"]);
    expect(readPendingOrders()).toEqual([]);
    expect(isCheckoutSheetOpen()).toBe(false);
  });
  it("a buyer who closes the sheet: dismissed, note cleared (the sheet's own 'closed' + rescue explain it)", async () => {
    const out = await buyAsGuest(GITEM, "9876543210", guestDeps((o) => o.modal.ondismiss()));
    expect(out.status).toBe("dismissed");
    expect(readPendingOrders()).toEqual([]);
    expect(isCheckoutSheetOpen()).toBe(false);
  });
  it("THE BUG: the page resets under the UPI app, so the sheet never reports - the note is still there for the resumed page", async () => {
    void buyAsGuest(GITEM, "9876543210", guestDeps(() => undefined)); // never settles, like a page that was reloaded
    await vi.waitFor(() => expect(readPendingOrders().map((e) => e.orderId)).toEqual(["order_A"]));
    const [entry] = readPendingOrders();
    expect(entry.proof).toBe(PROOF);
    expect(entry.buy).toEqual({ kind: "pack", sku: "pack_cbq", target: "maths" });
  });
  it("an order with no proof (server kill switch) leaves no note but still tracks the open sheet", async () => {
    const { statusProof: _omit, ...noProof } = ORDER; // eslint-disable-line @typescript-eslint/no-unused-vars
    let open = false;
    await buyAsGuest(GITEM, "9876543210", guestDeps((o) => {
      open = isCheckoutSheetOpen();
      expect(readPendingOrders()).toEqual([]);
      o.modal.ondismiss();
    }, noProof));
    expect(open).toBe(true);
  });
  it("CheckoutSheet 'Buy for yourself' (self): noted, cleared on success", async () => {
    const deps: SelfBuyDeps = {
      createOrder: async () => ORDER,
      loadScript: async () => fakeRazorpay((o) => {
        expect(readPendingOrders().map((e) => e.orderId)).toEqual(["order_A"]);
        o.handler(SUCCESS);
      }),
      verify: async () => ({ ok: true }),
    };
    expect((await buyForSelf(GITEM, deps)).status).toBe("paid");
    expect(readPendingOrders()).toEqual([]);
  });
  it("CheckoutSheet 'Someone else' signed OUT: noted; signed IN: NOT noted (that page keeps its session)", async () => {
    const mk = (onOpen: (o: Opts) => void): WhoBuyDeps => ({ createOrder: async () => ORDER, loadScript: async () => fakeRazorpay(onOpen), verify: async () => undefined });
    const recipient = { phone: "+919876543210", first: "phone" as const };
    let outSeen: string[] = [];
    await buyForRecipient(GITEM, recipient, false, mk((o) => { outSeen = readPendingOrders().map((e) => e.orderId); o.modal.ondismiss(); }));
    expect(outSeen).toEqual(["order_A"]);
    let inSeen: string[] = ["x"];
    await buyForRecipient(GITEM, recipient, true, mk((o) => { inSeen = readPendingOrders().map((e) => e.orderId); o.modal.ondismiss(); }));
    expect(inSeen).toEqual([]);
  });
  it("kill switch: no note from any checkout", async () => {
    vi.stubEnv("VITE_PAY_RETURN_DISABLED", "1");
    await buyAsGuest(GITEM, "9876543210", guestDeps((o) => {
      expect(window.localStorage.getItem(PENDING_STORE_KEY)).toBeNull();
      o.modal.ondismiss();
    }));
  });
  it("a Razorpay script that throws on open does not leave a stuck 'sheet open'", async () => {
    const out = await buyAsGuest(GITEM, "9876543210", guestDeps(() => {
      throw new Error("boom");
    }));
    expect(out.status).toBe("failed");
    expect(isCheckoutSheetOpen()).toBe(false);
    expect(readPendingOrders()).toEqual([]);
  });
});
