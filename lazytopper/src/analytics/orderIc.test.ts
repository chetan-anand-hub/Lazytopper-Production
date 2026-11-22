import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
const recordActivity = vi.hoisted(() => vi.fn());
vi.mock("../services/activityClient", () => ({ recordActivity }));

import {
  __resetMetaOrderIcForTests,
  setSalesPageSurface,
  trackBeginCheckout,
  trackBeginCheckoutTap,
} from "./analytics";
import { adSignalFields } from "./adSignals";
import { trackPackCheckout, __resetPackMetaCheckoutForTests } from "../lib/packs/packAnalytics";

/**
 * META-IC-1 - Meta's InitiateCheckout fires ONLY when a Razorpay order was created, once per checkout attempt, browser + server
 * with ONE event_id (the attempt id the order-create body carries as adSignals.attemptId).
 *
 * The order-create calls below go through the REAL `adSignalFields()` (which builds the body every service uses) and a stubbed
 * `fetch`; the observer that `adSignalFields()` arms watches the request/response exactly as it does in the app.
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

interface Sent {
  attemptId: string;
  body: Record<string, unknown>;
  res: Response;
}

/**
 * One order-create call, built the way the services build it: the body first (adSignalFields, which arms the observer on the
 * CURRENT fetch), then the POST. `signals` re-sends an earlier body's ids (a retry of the same attempt).
 */
async function createOrder(url: string, fields: Record<string, unknown>, reply: { status?: number; json: unknown }, signals?: ReturnType<typeof adSignalFields>): Promise<Sent> {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(reply.json), { status: reply.status ?? 200 })));
  const fresh = adSignalFields();
  const body = { ...fields, ...(signals ?? fresh) };
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  await flush();
  return { attemptId: (body as { adSignals?: { attemptId?: string } }).adSignals?.attemptId ?? "", body, res };
}

const OK_PASS = { ok: true, orderId: "order_1", keyId: "k", amountPaise: 108300 };

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
    trackBeginCheckoutTap({ passType: "till_boards", itemName: "x", valueInr: 1083 }, false); // tap, then the who-sheet / sign-in
    trackBeginCheckoutTap({ passType: "till_boards", itemName: "x", valueInr: 1083 }, true, true); // resumed after sign-in, no order
    await flush();
    expect(icCalls()).toEqual([]);
  });
});

describe("META-IC-1 - one pixel InitiateCheckout when the order is created, eventID = the attempt id the order carries", () => {
  it("Board Pass (signed in, /api/pay/order): exactly one event, money only, eventID = adSignals.attemptId; GA4 / Vercel / first-party get nothing for it", async () => {
    const sent = await createOrder("/api/pay/order", { passType: "till_boards" }, { json: OK_PASS });
    expect(sent.attemptId).toMatch(/^lt_/);
    expect(icCalls()).toEqual([["track", "InitiateCheckout", { currency: "INR", value: 1083 }, { eventID: sent.attemptId }]]);
    expect(ga4).toEqual([]);
    expect(vercel).toEqual([]);
    expect(recordActivity).not.toHaveBeenCalled();
    expect(await sent.res.json()).toEqual(OK_PASS); // the caller still reads its own response
  });

  it("the Rs 1,083 upgrade / the month pass: same route, one event each, each with its own id", async () => {
    const a = await createOrder("/api/pay/order", { passType: "till_boards", postPay: true }, { json: { ...OK_PASS, orderId: "o_up", amountPaise: 108300 } });
    const b = await createOrder("/api/pay/order", { passType: "month" }, { json: { ...OK_PASS, orderId: "o_m", amountPaise: 59900 } });
    expect(icCalls().map((c) => [(c[3] as { eventID: string }).eventID, (c[2] as { value: number }).value])).toEqual([
      [a.attemptId, 1083],
      [b.attemptId, 599],
    ]);
    expect(a.attemptId).not.toBe(b.attemptId);
  });

  it("packs / CBQ packs / Test Series: content_ids = the sku, value = the server amount incl. GST", async () => {
    const pack = await createOrder("/api/pay/order", { passType: "pack_chapter", packTarget: "triangles" }, { json: { ...OK_PASS, amountPaise: 5782 } });
    const ts = await createOrder("/api/pay/guest/order", { sku: "test_series", phone: "9876543210" }, { json: { ...OK_PASS, orderId: "o_ts", amountPaise: 117882 } });
    expect(icCalls()).toEqual([
      ["track", "InitiateCheckout", { currency: "INR", value: 57.82, content_ids: ["pack_chapter"], content_type: "product" }, { eventID: pack.attemptId }],
      ["track", "InitiateCheckout", { currency: "INR", value: 1178.82, content_ids: ["test_series"], content_type: "product" }, { eventID: ts.attemptId }],
    ]);
  });

  it("guest order (pay-by-phone / pay-for-someone / pay-for-myself) and parent pay (pass, pack) each send one", async () => {
    const phone = await createOrder("/api/pay/guest/order", { sku: "till_boards", phone: "9876543210" }, { json: OK_PASS });
    const parent = await createOrder("/api/pay/parent/order", { token: "t", passType: "till_boards" }, { json: { ...OK_PASS, orderId: "o_p" } });
    const parentPack = await createOrder("/api/pay/parent/order", { token: "t", product: "pack" }, { json: { ...OK_PASS, orderId: "o_pp", amountPaise: 23482 } });
    const ids = icCalls().map((c) => (c[3] as { eventID: string }).eventID);
    expect(ids).toEqual([phone.attemptId, parent.attemptId, parentPack.attemptId]);
    expect(icCalls()[2][2]).toEqual({ currency: "INR", value: 234.82 }); // a parent pack names no sku on the client: money only
  });

  it("on a sales page a pass event carries `surface` (as the tap event did); a pack never does", async () => {
    setSalesPageSurface("board-pass");
    await createOrder("/api/pay/order", { passType: "till_boards" }, { json: OK_PASS });
    expect(icCalls()[0][2]).toEqual({ currency: "INR", value: 1083, surface: "board-pass" });
  });

  it("a retry that re-sends the SAME body (same attempt id) is ONE event; a NEW order after a failure is a new attempt with a new event", async () => {
    const signals = adSignalFields();
    await createOrder("/api/pay/order", { passType: "till_boards" }, { json: OK_PASS }, signals);
    await createOrder("/api/pay/order", { passType: "till_boards" }, { json: OK_PASS }, signals); // same attempt id re-sent
    expect(icCalls()).toHaveLength(1);
    const failed = await createOrder("/api/pay/order", { passType: "till_boards" }, { status: 502, json: { ok: false } });
    expect(icCalls()).toHaveLength(1); // the failed order sent nothing
    const next = await createOrder("/api/pay/order", { passType: "till_boards" }, { json: { ...OK_PASS, orderId: "order_2" } });
    expect(icCalls()).toHaveLength(2);
    expect(next.attemptId).not.toBe(failed.attemptId);
    expect(next.attemptId).not.toBe((signals.adSignals as { attemptId: string }).attemptId);
  });

  it("no event when the order response is not ok, has no order id, or is not JSON; and none for verify / other calls", async () => {
    await createOrder("/api/pay/order", { passType: "till_boards" }, { status: 409, json: { error: "already_owned" } });
    await createOrder("/api/pay/order", { passType: "till_boards" }, { json: { ok: true, keyId: "k" } });
    await createOrder("/api/pay/order", { passType: "till_boards" }, { json: { ok: false, orderId: "o" } });
    await createOrder("/api/pay/verify", { orderId: "o" }, { json: { ok: true, orderId: "o", amountPaise: 100 } });
    await createOrder("/api/pay/guest/order-status", { orderId: "o" }, { json: { ok: true, orderId: "o", amountPaise: 100 } });
    expect(icCalls()).toEqual([]);
  });

  it("the observer never changes what the caller gets: same response, and a rejected fetch still rejects", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network down"); }));
    const signals = adSignalFields();
    await expect(fetch("/api/pay/order", { method: "POST", body: JSON.stringify({ passType: "till_boards", ...signals }) })).rejects.toThrow("network down");
    await flush();
    expect(icCalls()).toEqual([]);
  });

  it("the Meta gate is unchanged: nothing on an admin page or on a page address Meta may not see", async () => {
    setLocation("/admin/payments");
    await createOrder("/api/pay/order", { passType: "till_boards" }, { json: OK_PASS });
    setLocation("/u/secrettoken123");
    await createOrder("/api/pay/order", { passType: "till_boards" }, { json: { ...OK_PASS, orderId: "o2" } });
    expect(meta.filter((c) => c[0] === "track")).toEqual([]);
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
    const sent = await createOrder("/api/pay/order", { passType: "pack_chapter" }, { json: OK_PASS });
    expect(sent.attemptId).toBe("lt_tap_legacy_1"); // the remembered tap id rides the order, as on trunk
    expect(icCalls()).toHaveLength(2); // creating the order sends nothing more
    const plain = await createOrder("/api/pay/order", { passType: "till_boards" }, { json: OK_PASS });
    expect(plain.attemptId).toBe(""); // no minted id on trunk's path
    expect(icCalls()).toHaveLength(2);
  });
});
