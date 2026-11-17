/**
 * ORDER-SOURCE-1 - the client half: every order-create request carries the coarse visit source as `source` (allow-listed keys,
 * click ids as `true` only), and carries nothing when there is none or the kill switch VITE_ORDER_SOURCE_DISABLED=1 is on.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ORDER_SOURCE_KEY, VISIT_SOURCE_KEY, orderSourceForCheckout, rememberVisitSourceOnce, resetVisitSourceAttempt } from "../analytics/visitSource";
import { createSelfOrder, createWhoOrder } from "./checkoutWho";
import { createGuestOrder } from "./guestPay";
import { createPackOrder, createPayOrder } from "./checkout";
import { createParentOrder } from "./parentPay";
import { createParentPackOrder } from "./parentPayPack";

vi.mock("./firebaseClient", () => ({ authClient: { currentUser: { getIdToken: async () => "tok" } } }));

const STORED = { ref: null, utm_source: "google", utm_medium: "cpc", utm_campaign: "PDF_Packs", utm_content: null, landing: "/packs", gclid: true, fbclid: false };
const WANT = { utm_source: "google", utm_medium: "cpc", utm_campaign: "PDF_Packs", landing: "/packs", gclid: true };

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  resetVisitSourceAttempt();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function stubFetch() {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  vi.stubGlobal("fetch", async (url: string, init: { body: string }) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return { ok: true, status: 200, json: async () => ({ ok: true, orderId: "o1", keyId: "k", amountPaise: 100 }) } as Response;
  });
  return calls;
}

const item = { kind: "pack", sku: "pack_cbq", target: "maths", label: "x", description: "x" } as never;
const sites: Array<[string, () => Promise<unknown>]> = [
  ["checkout.createPayOrder", () => createPayOrder("till_boards")],
  ["checkout.createPackOrder", () => createPackOrder("pack_cbq", "maths")],
  ["guestPay.createGuestOrder", () => createGuestOrder(item, "9876543948")],
  ["checkoutWho.createWhoOrder", () => createWhoOrder(item, { phone: "+919876543210", first: "A" } as never, false)],
  ["checkoutWho.createSelfOrder", () => createSelfOrder(item)],
  ["parentPay.createParentOrder", () => createParentOrder("tok", "month")],
  ["parentPayPack.createParentPackOrder", () => createParentPackOrder("tok")],
];

describe("orderSourceForCheckout", () => {
  it("nothing stored -> undefined", () => {
    expect(orderSourceForCheckout()).toBeUndefined();
  });
  it("reads the tab copy; click ids are booleans; no value, query or url can come out", () => {
    window.sessionStorage.setItem(ORDER_SOURCE_KEY, JSON.stringify({ ...STORED, gclid: "REAL-CLICK-ID", landing: "/packs?gclid=abc", utm_source: "a@b.com" }));
    const out = orderSourceForCheckout();
    expect(out).toEqual({ utm_medium: "cpc", utm_campaign: "PDF_Packs", landing: "/" });
    expect(JSON.stringify(out)).not.toContain("REAL-CLICK-ID");
  });
  it("survives sign-up: the tab order copy is still there after the sign-up copy is taken", () => {
    rememberVisitSourceOnce({ pathname: "/packs", search: "?utm_source=google&utm_medium=cpc&gclid=ABC" }, "", "lazytopper.com");
    window.sessionStorage.removeItem(VISIT_SOURCE_KEY);
    expect(orderSourceForCheckout()).toEqual({ utm_source: "google", utm_medium: "cpc", landing: "/packs", gclid: true });
  });
  it("kill switch -> undefined", () => {
    window.sessionStorage.setItem(ORDER_SOURCE_KEY, JSON.stringify(STORED));
    vi.stubEnv("VITE_ORDER_SOURCE_DISABLED", "1");
    expect(orderSourceForCheckout()).toBeUndefined();
  });
});

describe("every order-create request carries `source`", () => {
  it.each(sites)("%s", async (_name, run) => {
    window.sessionStorage.setItem(ORDER_SOURCE_KEY, JSON.stringify(STORED));
    const calls = stubFetch();
    await run();
    expect(calls).toHaveLength(1);
    expect(calls[0].body.source).toEqual(WANT);
  });
  it.each(sites)("%s: nothing stored -> no source key", async (_name, run) => {
    const calls = stubFetch();
    await run();
    expect("source" in calls[0].body).toBe(false);
  });
  it.each(sites)("%s: kill switch -> no source key", async (_name, run) => {
    window.sessionStorage.setItem(ORDER_SOURCE_KEY, JSON.stringify(STORED));
    vi.stubEnv("VITE_ORDER_SOURCE_DISABLED", "1");
    const calls = stubFetch();
    await run();
    expect("source" in calls[0].body).toBe(false);
  });
});
