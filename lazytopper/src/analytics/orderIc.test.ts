import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
const recordActivity = vi.hoisted(() => vi.fn());
vi.mock("../services/activityClient", () => ({ recordActivity }));
vi.mock("../services/firebaseClient", () => ({ authClient: { currentUser: { getIdToken: async () => "tok" } } }));

import {
  __resetMetaOrderIcForTests,
  setSalesPageSurface,
  trackBeginCheckout,
  trackBeginCheckoutTap,
} from "./analytics";
import { adSignalFields } from "./adSignals";
import { createPayOrder, createPackOrder } from "../services/checkout";
import { createGuestOrder } from "../services/guestPay";
import { createWhoOrder, createSelfOrder } from "../services/checkoutWho";
import { createParentOrder } from "../services/parentPay";
import { createParentPackOrder } from "../services/parentPayPack";
import { trackPackCheckout, __resetPackMetaCheckoutForTests } from "../lib/packs/packAnalytics";

/**
 * META-IC-1 - Meta's InitiateCheckout fires ONLY when a Razorpay order was created, once per checkout attempt, browser + server
 * with ONE event_id (the attempt id the order-create body carries as adSignals.attemptId).
 *
 * The order-create calls below are the REAL service functions (createPayOrder, createPackOrder, createGuestOrder, createWhoOrder,
 * createSelfOrder, createParentOrder, createParentPackOrder) against a mocked `fetch`: each fires the pixel event itself, once
 * its response is ok and valid.
 */
const originalLocation = window.location;
type Win = { gtag?: unknown; fbq?: unknown; va?: unknown };
const w = window as unknown as Win;
const realFetch = globalThis.fetch;

let ga4: unknown[][];
let meta: unknown[][];
let vercel: Array<[string, Record<string, unknown>]>;

function setLocation(pathAndQuery: string): void {
  const url = new URL(pathAndQuery, "https://www.lazytopper.com");
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { href: url.href, origin: url.origin, hostname: url.hostname, pathname: url.pathname, search: url.search, hash: url.hash },
  });
}

beforeEach(() => {
  vi.stubEnv("BASE_URL", "/");
  ga4 = [];
  meta = [];
  vercel = [];
  w.gtag = (...args: unknown[]) => ga4.push(args);
  const fbq = (...args: unknown[]) => meta.push(args);
  (fbq as unknown as { callMethod: unknown }).callMethod = () => undefined;
  w.fbq = fbq;
  w.va = (kind: string, payload: Record<string, unknown>) => vercel.push([kind, payload]);
  Object.defineProperty(window.navigator, "webdriver", { configurable: true, value: false });
  Object.defineProperty(document, "referrer", { configurable: true, get: () => "" });
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetMetaOrderIcForTests();
  __resetPackMetaCheckoutForTests();
  recordActivity.mockClear();
  setLocation("/pricing");
});

afterEach(() => {
  delete w.gtag;
  delete w.fbq;
  delete w.va;
  setSalesPageSurface(null);
  globalThis.fetch = realFetch;
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
};
const icCalls = (): unknown[][] => meta.filter((c) => c[0] === "track" && c[1] === "InitiateCheckout");

const OK = { ok: true, orderId: "order_1", keyId: "k", amountPaise: 108300 };
const PASS_ITEM = { kind: "pass" as const, sku: "till_boards" as const, label: "Board Pass", description: "x" };
const PACK_ITEM = { kind: "pack" as const, sku: "pack_cbq", target: "maths", label: "CBQ", description: "x" };

/** Run one real order-create service function against a mocked fetch; returns the request body it sent. */
async function run(call: () => Promise<unknown>, reply: { status?: number; json: unknown } = { json: OK }): Promise<{ body: Record<string, unknown>; attemptId: string; error: unknown }> {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(reply.json), { status: reply.status ?? 200 }));
  vi.stubGlobal("fetch", fetchMock);
  let error: unknown = null;
  try {
    await call();
  } catch (e) {
    error = e;
  }
  const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body)) as Record<string, unknown>;
  return { body, attemptId: (body.adSignals as { attemptId?: string } | undefined)?.attemptId ?? "", error };
}

describe("META-IC-1 - nothing goes to Meta at the TAP; first-party / GA4 / Vercel funnel events are unchanged", () => {
  it("a Board Pass tap (signed out, signed in, resumed) sends begin_checkout to Vercel, GA4 and the first-party log and NOTHING to Meta", () => {
    const d = { passType: "till_boards" as const, itemName: "Premium pass till your boards", valueInr: 1083 };
    trackBeginCheckoutTap(d, false);
    trackBeginCheckoutTap(d, true);
    trackBeginCheckoutTap(d, true, true);
    trackBeginCheckout(d);
    expect(meta).toEqual([]);
    expect(ga4.filter((e) => e[0] === "event" && e[1] === "begin_checkout")).toHaveLength(4);
    expect(vercel.filter((v) => (v[1] as { name?: string }).name === "begin_checkout")).toHaveLength(4);
    expect(recordActivity).toHaveBeenCalledTimes(4);
    expect((recordActivity.mock.calls[0][1] as { name: string }).name).toBe("begin_checkout");
  });

  it("a pack tap sends pack_checkout (first-party, Vercel) and GA4 begin_checkout and NOTHING to Meta; the tap does not hand its id to the order", () => {
    trackPackCheckout({ sku: "pack_chapter", itemName: "Chapter Pack", valueInr: 49 }, { signedIn: true, attemptId: "lt_tap_id_1" });
    expect(meta).toEqual([]);
    expect(ga4.some((e) => e[0] === "event" && e[1] === "begin_checkout")).toBe(true);
    expect(recordActivity).toHaveBeenCalledTimes(1);
    expect(adSignalFields().adSignals?.attemptId).not.toBe("lt_tap_id_1");
  });

  it("a tap that is abandoned (who-sheet, sign-in, closed) and a resumed auto-start that creates NO order leave the pixel queue empty", async () => {
    trackBeginCheckoutTap({ passType: "till_boards", itemName: "x", valueInr: 1083 }, false);
    trackBeginCheckoutTap({ passType: "till_boards", itemName: "x", valueInr: 1083 }, true, true);
    await flush();
    expect(icCalls()).toEqual([]);
  });
});

describe("META-IC-1 - one pixel InitiateCheckout when the order is created (real service functions), eventID = the attempt id the order carries", () => {
  it("createPayOrder (Board Pass, the Rs 1,083 upgrade, month): one event each, money only, eventID = adSignals.attemptId; GA4 / Vercel / first-party get nothing for it", async () => {
    const a = await run(() => createPayOrder("till_boards"));
    expect(a.error).toBeNull();
    expect(a.attemptId).toMatch(/^lt_/);
    expect(icCalls()).toEqual([["track", "InitiateCheckout", { currency: "INR", value: 1083 }, { eventID: a.attemptId }]]);
    const b = await run(() => createPayOrder("month", { postPay: true }), { json: { ...OK, orderId: "order_m", amountPaise: 59900 } });
    expect(icCalls()[1]).toEqual(["track", "InitiateCheckout", { currency: "INR", value: 599 }, { eventID: b.attemptId }]);
    expect(b.attemptId).not.toBe(a.attemptId);
    expect(ga4).toEqual([]);
    expect(vercel).toEqual([]);
    expect(recordActivity).not.toHaveBeenCalled();
  });

  it("createPackOrder: content_ids = the sku, value = the server amount incl. GST", async () => {
    const r = await run(() => createPackOrder("pack_chapter", "triangles"), { json: { ...OK, amountPaise: 5782 } });
    expect(icCalls()).toEqual([["track", "InitiateCheckout", { currency: "INR", value: 57.82, content_ids: ["pack_chapter"], content_type: "product" }, { eventID: r.attemptId }]]);
  });

  it("createGuestOrder, createWhoOrder, createSelfOrder (Test Series / CBQ pack / pass) each send one", async () => {
    const g = await run(() => createGuestOrder(PASS_ITEM, "9876543210"), { json: { ...OK, orderId: "o_g" } });
    const w = await run(() => createWhoOrder(PACK_ITEM, { email: "a@b.co", first: "email" }, false), { json: { ...OK, orderId: "o_w", amountPaise: 23482 } });
    const s = await run(() => createSelfOrder({ kind: "pack", sku: "test_series", label: "TS", description: "x" }), { json: { ...OK, orderId: "o_s", amountPaise: 117882 } });
    expect(icCalls().map((c) => [(c[3] as { eventID: string }).eventID, c[2]])).toEqual([
      [g.attemptId, { currency: "INR", value: 1083 }],
      [w.attemptId, { currency: "INR", value: 234.82, content_ids: ["pack_cbq"], content_type: "product" }],
      [s.attemptId, { currency: "INR", value: 1178.82, content_ids: ["test_series"], content_type: "product" }],
    ]);
  });

  it("createParentOrder (pass) and createParentPackOrder (pack: content_ids from the server's reply) each send one", async () => {
    const p = await run(() => createParentOrder("tok", "till_boards"), { json: { ...OK, orderId: "o_p" } });
    const pp = await run(() => createParentPackOrder("tok"), { json: { ...OK, orderId: "o_pp", amountPaise: 23482, sku: "pack_cbq" } });
    expect(icCalls()).toEqual([
      ["track", "InitiateCheckout", { currency: "INR", value: 1083 }, { eventID: p.attemptId }],
      ["track", "InitiateCheckout", { currency: "INR", value: 234.82, content_ids: ["pack_cbq"], content_type: "product" }, { eventID: pp.attemptId }],
    ]);
  });

  it("on a sales page a pass event carries `surface` (as the tap event did)", async () => {
    setSalesPageSurface("board-pass");
    await run(() => createPayOrder("till_boards"));
    expect(icCalls()[0][2]).toEqual({ currency: "INR", value: 1083, surface: "board-pass" });
  });

  it("MONEY-DUPGUARD-1: dismiss + re-tap hands back the SAME open order (`reused: true`) with a fresh attempt id -> still exactly ONE event", async () => {
    const first = await run(() => createPayOrder("till_boards"));
    expect(icCalls()).toHaveLength(1);
    const again = await run(() => createPayOrder("till_boards"), { json: { ...OK, reused: true } });
    expect(again.attemptId).not.toBe(first.attemptId);
    expect(icCalls()).toHaveLength(1);
    // the same order id coming back WITHOUT the flag (an older server) is still counted once
    await run(() => createPayOrder("till_boards"));
    expect(icCalls()).toHaveLength(1);
  });

  it("a reload / second tab that is handed an open order it never saw created sends no event", async () => {
    await run(() => createPayOrder("till_boards"), { json: { ...OK, orderId: "order_other_tab", reused: true } });
    expect(icCalls()).toEqual([]);
  });

  it("a NEW order after a failure is a new attempt (new id) and one event; the failed call sent none", async () => {
    const failed = await run(() => createPayOrder("till_boards"), { status: 502, json: { ok: false } });
    expect(failed.error).not.toBeNull();
    expect(icCalls()).toEqual([]);
    const next = await run(() => createPayOrder("till_boards"), { json: { ...OK, orderId: "order_2" } });
    expect(next.attemptId).not.toBe(failed.attemptId);
    expect(icCalls()).toHaveLength(1);
  });

  it("no event when the order response is not ok, has no key id / order id, or is a 409", async () => {
    await run(() => createPayOrder("till_boards"), { status: 409, json: { error: "already_owned" } });
    await run(() => createPayOrder("till_boards"), { json: { ok: true, orderId: "o", amountPaise: 100 } });
    await run(() => createPayOrder("till_boards"), { json: { ok: true, keyId: "k", amountPaise: 100 } });
    expect(icCalls()).toEqual([]);
  });

  it("the Meta gate is unchanged: nothing on an admin page or on a page address Meta may not see", async () => {
    setLocation("/admin/payments");
    await run(() => createPayOrder("till_boards"));
    setLocation("/u/secrettoken123");
    await run(() => createPayOrder("till_boards"), { json: { ...OK, orderId: "o2" } });
    expect(meta.filter((c) => c[0] === "track")).toEqual([]);
  });

  it("no global fetch patch: the order functions run against the very fetch they were given", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(OK), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await createPayOrder("till_boards");
    expect(globalThis.fetch).toBe(fetchMock);
  });
});

describe("META-IC-1 kill switch - VITE_META_IC_AT_ORDER_DISABLED=1 restores the tap event", () => {
  it("the tap sends Meta InitiateCheckout again (pass; pack with its eventID), the order sends none, and the order body carries no minted id", async () => {
    vi.stubEnv("VITE_META_IC_AT_ORDER_DISABLED", "1");
    trackBeginCheckoutTap({ passType: "till_boards", itemName: "x", valueInr: 1083 }, true);
    trackPackCheckout({ sku: "pack_chapter", itemName: "Chapter Pack", valueInr: 49 }, { signedIn: true, attemptId: "lt_tap_legacy_1" });
    const taps = icCalls();
    expect(taps).toHaveLength(2);
    expect(taps[0]).toEqual(["track", "InitiateCheckout", { currency: "INR", value: 1083 }]);
    expect(taps[1][3]).toEqual({ eventID: "lt_tap_legacy_1" });
    const sent = await run(() => createPackOrder("pack_chapter", "triangles"));
    expect(sent.attemptId).toBe("lt_tap_legacy_1");
    expect(icCalls()).toHaveLength(2);
    const plain = await run(() => createPayOrder("till_boards"));
    expect(plain.attemptId).toBe("");
    expect(icCalls()).toHaveLength(2);
  });
});
