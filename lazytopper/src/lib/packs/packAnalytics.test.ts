import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { recordActivity } = vi.hoisted(() => ({ recordActivity: vi.fn() }));
vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../../services/activityClient", () => ({ recordActivity }));
const { hint, seen } = vi.hoisted(() => ({ hint: vi.fn<() => boolean | undefined>(() => undefined), seen: vi.fn() }));
vi.mock("./packSampleSeen", () => ({ signedInHint: hint, reportPackSampleSeen: seen }));

import { __resetPurchaseMemoryForTests, setSalesPageSurface, trackBeginCheckoutTap, trackPurchase } from "../../analytics/analytics";
import { __resetPackCheckoutStartsForTests, __resetPackMetaCheckoutForTests, trackPackCheckout, trackPackEvent, trackPackPurchase, trackPackSampleDownload } from "./packAnalytics";

type Win = { gtag?: unknown; va?: unknown; fbq?: unknown };
const w = window as unknown as Win;
const originalLocation = window.location;

let gtagCalls: unknown[][];
let metaCalls: unknown[][];
let vendorCalls: unknown[][];

beforeEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { href: "https://www.lazytopper.com/packs", origin: "https://www.lazytopper.com", hostname: "www.lazytopper.com", pathname: "/packs", search: "", hash: "" },
  });
  gtagCalls = [];
  metaCalls = [];
  vendorCalls = [];
  w.gtag = (...a: unknown[]) => void gtagCalls.push(a);
  const fbq = (...a: unknown[]) => void metaCalls.push(a);
  (fbq as unknown as { callMethod: unknown }).callMethod = (...a: unknown[]) => void metaCalls.push(a);
  (fbq as unknown as { queue: unknown[] }).queue = [];
  w.fbq = fbq;
  w.va = (...a: unknown[]) => void vendorCalls.push(a);
  recordActivity.mockClear();
  __resetPurchaseMemoryForTests();
  __resetPackCheckoutStartsForTests();
  __resetPackMetaCheckoutForTests();
  setSalesPageSurface(null);
  try {
    window.sessionStorage.clear();
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
});
afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  delete w.gtag;
  delete w.fbq;
  delete w.va;
});

const names = () => recordActivity.mock.calls.map((c) => (c[1] as { name?: string }).name);
const ga4Names = () => gtagCalls.filter((c) => c[0] === "event").map((c) => c[1]);


/**
 * PRICING-PAGES-2 F4 - the sales-page surface. OFF a sales page (the context is null: /pricing, /packs, every other page) every
 * payload is EXACTLY what it was (compared as whole objects, before vs after setting and clearing the context). ON /board-pass or
 * /cbq-packs the same events carry `surface` (GA4, Vercel, first-party data; Meta custom param on the purchase events). No event
 * is renamed.
 */
describe("PRICING-PAGES-2 F4 - sales-page surface on the money events", () => {
  const ga4 = () => gtagCalls.filter((c) => c[0] === "event").map((c) => [c[1], c[2]]);
  const meta = () => metaCalls.map((c) => [c[1], c[2]]);
  const firstParty = () => recordActivity.mock.calls.map((c) => c[1]);
  function run(): unknown {
    vi.setSystemTime(new Date("2026-11-13T10:00:00Z")); // pin the GST cut-off (7 Nov 2026) so the Meta value is stable
    gtagCalls = [];
    metaCalls = [];
    vendorCalls = [];
    recordActivity.mockClear();
    __resetPurchaseMemoryForTests();
    __resetPackCheckoutStartsForTests();
    window.sessionStorage.clear();
    window.localStorage.clear();
    const d = { passType: "till_boards" as const, itemName: "Board Pass", valueInr: 2262 };
    trackBeginCheckoutTap(d, false);
    trackPurchase({ ...d, transactionId: "pay_1" });
    trackPackEvent("pack_view", undefined, "packs");
    trackPackCheckout({ sku: "pack_cbq", itemName: "Maths CBQ Pack", valueInr: 199 }, { signedIn: false, attemptId: "lt_fixed" });
    trackPackPurchase({ sku: "pack_cbq", itemName: "Maths CBQ Pack", valueInr: 199, transactionId: "pay_2" });
    return { ga4: ga4(), meta: meta(), vendor: vendorCalls.map((c) => c.slice()), firstParty: firstParty() };
  }
  afterEach(() => {
    setSalesPageSurface(null);
    vi.useRealTimers();
  });

  /**
   * N3: pinned against LITERAL payloads - what trunk (1b0607e) sends for the same calls (the reviewer's trunk/PR dump of these calls
   * was byte-identical). A change to any vendor payload off the sales pages (e.g. `surface: null` on Meta Purchase) turns this red.
   */
  it("off a sales page: the payloads are trunk's, literally (no `surface` on any money event)", () => {
    setSalesPageSurface("board-pass");
    setSalesPageSurface(null);
    expect(run()).toMatchInlineSnapshot(`
      {
        "firstParty": [
          {
            "data": {
              "currency": "INR",
              "pass": "till_boards",
              "signed_in": false,
              "value": 2262,
            },
            "name": "begin_checkout",
          },
          {
            "data": {
              "currency": "INR",
              "pass": "till_boards",
              "value": 2262,
            },
            "name": "purchase",
          },
          {
            "data": {
              "surface": "packs",
            },
            "name": "pack_view",
          },
          {
            "data": {
              "currency": "INR",
              "signed_in": false,
              "sku": "pack_cbq",
              "value": 199,
            },
            "name": "pack_checkout",
          },
          {
            "data": {
              "currency": "INR",
              "sku": "pack_cbq",
              "value": 199,
            },
            "name": "pack_purchase",
          },
        ],
        "ga4": [
          [
            "begin_checkout",
            {
              "currency": "INR",
              "items": [
                {
                  "item_id": "till_boards",
                  "item_name": "Board Pass",
                  "price": 2262,
                  "quantity": 1,
                },
              ],
              "page_location": "https://www.lazytopper.com/packs",
              "page_referrer": "",
              "signed_in": false,
              "value": 2262,
            },
          ],
          [
            "purchase",
            {
              "currency": "INR",
              "items": [
                {
                  "item_id": "till_boards",
                  "item_name": "Board Pass",
                  "price": 2262,
                  "quantity": 1,
                },
              ],
              "page_location": "https://www.lazytopper.com/packs",
              "page_referrer": "",
              "transaction_id": "pay_1",
              "value": 2262,
            },
          ],
          [
            "conversion",
            {
              "currency": "INR",
              "send_to": "AW-18471331566/6ahqCIbi4q8dEO7N6OdE",
              "transaction_id": "pay_1",
              "value": 2262,
            },
          ],
          [
            "pack_view",
            {
              "page_location": "https://www.lazytopper.com/packs",
              "page_referrer": "",
              "surface": "packs",
            },
          ],
          [
            "pack_checkout",
            {
              "currency": "INR",
              "page_location": "https://www.lazytopper.com/packs",
              "page_referrer": "",
              "signed_in": false,
              "sku": "pack_cbq",
              "value": 199,
            },
          ],
          [
            "begin_checkout",
            {
              "currency": "INR",
              "items": [
                {
                  "item_id": "pack_cbq",
                  "item_name": "Maths CBQ Pack",
                  "price": 199,
                  "quantity": 1,
                },
              ],
              "page_location": "https://www.lazytopper.com/packs",
              "page_referrer": "",
              "signed_in": false,
              "value": 199,
            },
          ],
          [
            "pack_purchase",
            {
              "currency": "INR",
              "page_location": "https://www.lazytopper.com/packs",
              "page_referrer": "",
              "sku": "pack_cbq",
              "value": 199,
            },
          ],
          [
            "purchase",
            {
              "currency": "INR",
              "items": [
                {
                  "item_id": "pack_cbq",
                  "item_name": "Maths CBQ Pack",
                  "price": 199,
                  "quantity": 1,
                },
              ],
              "page_location": "https://www.lazytopper.com/packs",
              "page_referrer": "",
              "transaction_id": "pay_2",
              "value": 199,
            },
          ],
          [
            "conversion",
            {
              "currency": "INR",
              "send_to": "AW-18471331566/6ahqCIbi4q8dEO7N6OdE",
              "transaction_id": "pay_2",
              "value": 199,
            },
          ],
        ],
        "meta": [
          [
            "InitiateCheckout",
            {
              "currency": "INR",
              "value": 2262,
            },
          ],
          [
            "Purchase",
            {
              "currency": "INR",
              "value": 2262,
            },
          ],
          [
            "InitiateCheckout",
            {
              "content_ids": [
                "pack_cbq",
              ],
              "content_type": "product",
              "currency": "INR",
              "value": 235,
            },
          ],
          [
            "PackPurchase",
            {
              "currency": "INR",
              "value": 199,
            },
          ],
        ],
        "vendor": [
          [
            "event",
            {
              "data": {
                "currency": "INR",
                "pass": "till_boards",
                "signed_in": false,
                "value": 2262,
              },
              "name": "begin_checkout",
            },
          ],
          [
            "event",
            {
              "data": {
                "currency": "INR",
                "pass": "till_boards",
                "value": 2262,
              },
              "name": "purchase",
            },
          ],
          [
            "event",
            {
              "data": {
                "surface": "packs",
              },
              "name": "pack_view",
            },
          ],
          [
            "event",
            {
              "data": {
                "currency": "INR",
                "signed_in": false,
                "sku": "pack_cbq",
                "value": 199,
              },
              "name": "pack_checkout",
            },
          ],
          [
            "event",
            {
              "data": {
                "currency": "INR",
                "sku": "pack_cbq",
                "value": 199,
              },
              "name": "pack_purchase",
            },
          ],
        ],
      }
    `);
  });

  it("N2: a purchase reports the page its checkout STARTED on, not the page open when it settles", () => {
    __resetPackCheckoutStartsForTests();
    const lastPurchase = () => (ga4().filter((x) => x[0] === "pack_purchase").pop()![1] as Record<string, unknown>).surface;
    setSalesPageSurface("cbq-packs");
    trackPackCheckout({ sku: "pack_cbq", itemName: "Maths CBQ Pack", valueInr: 199 }, { signedIn: true });
    setSalesPageSurface("board-pass"); // the student moved on while the order was pending
    trackPackPurchase({ sku: "pack_cbq", itemName: "Maths CBQ Pack", valueInr: 199, transactionId: "late_1" });
    expect(lastPurchase()).toBe("cbq-packs");
    // Started off the sales pages (/packs), settled on /board-pass: no surface (as trunk).
    setSalesPageSurface(null);
    trackPackCheckout({ sku: "pack_bundle", itemName: "Bundle", valueInr: 299 }, { signedIn: true });
    setSalesPageSurface("board-pass");
    trackPackPurchase({ sku: "pack_bundle", itemName: "Bundle", valueInr: 299, transactionId: "late_2" });
    expect(lastPurchase()).toBeUndefined();
  });

  it("on /board-pass: begin_checkout and purchase carry surface board-pass (GA4 + Meta custom param); names unchanged", () => {
    setSalesPageSurface("board-pass");
    run();
    const g = ga4();
    expect(g.map((x) => x[0])).toEqual(expect.arrayContaining(["begin_checkout", "purchase"]));
    expect((g.find((x) => x[0] === "purchase")![1] as Record<string, unknown>).surface).toBe("board-pass");
    expect((g.find((x) => x[0] === "begin_checkout")![1] as Record<string, unknown>).surface).toBe("board-pass");
    expect((meta().find((x) => x[0] === "Purchase")![1] as Record<string, unknown>).surface).toBe("board-pass");
  });

  it("on /cbq-packs: pack_view surface is cbq-packs (not packs); pack_checkout and pack_purchase carry it", () => {
    setSalesPageSurface("cbq-packs");
    run();
    const g = ga4();
    expect((g.find((x) => x[0] === "pack_view")![1] as Record<string, unknown>).surface).toBe("cbq-packs");
    expect((g.find((x) => x[0] === "pack_checkout")![1] as Record<string, unknown>).surface).toBe("cbq-packs");
    expect((g.find((x) => x[0] === "pack_purchase")![1] as Record<string, unknown>).surface).toBe("cbq-packs");
    expect(meta().some((x) => (x[1] as Record<string, unknown> | undefined)?.surface === "cbq-packs")).toBe(true);
  });
});

describe("pack analytics", () => {
  it("pack_view / pack_download go to the first-party log by name", () => {
    trackPackEvent("pack_view");
    trackPackEvent("pack_download", "pack_chapter");
    expect(names()).toEqual(["pack_view", "pack_download"]);
  });

  it("pack_view carries the surface (pricing / packs) as data, like sku; no surface -> no data", () => {
    trackPackEvent("pack_view", undefined, "pricing");
    trackPackEvent("pack_view", undefined, "packs");
    trackPackEvent("pack_view");
    expect(names()).toEqual(["pack_view", "pack_view", "pack_view"]);
  });

  it("pack_checkout: first-party pack_checkout, GA4 begin_checkout with the sku as item, and one Meta InitiateCheckout (META-PACK-CHECKOUT-1)", () => {
    trackPackCheckout({ sku: "pack_chapter", itemName: "Chapter Pack · Real Numbers", valueInr: 49 });
    expect(names()).toEqual(["pack_checkout"]);
    const begin = gtagCalls.find((c) => c[0] === "event" && c[1] === "begin_checkout");
    expect(begin).toBeTruthy();
    expect((begin![2] as { items: Array<{ item_id: string }> }).items[0].item_id).toBe("pack_chapter");
    expect(metaCalls).toHaveLength(1);
  });

  it("META-PACK-CHECKOUT-1: Meta InitiateCheckout once per attempt id, value = total incl. GST, eventID = the attempt id; a repeat with the same id sends nothing", () => {
    vi.setSystemTime(new Date("2026-11-13T10:00:00Z")); // after GST-EXCL-1 (7 Nov 2026)
    const d = { sku: "pack_chapter" as const, itemName: "Chapter Pack", valueInr: 49 };
    trackPackCheckout(d, { signedIn: true, attemptId: "lt_attempt_1" });
    trackPackCheckout(d, { signedIn: true, attemptId: "lt_attempt_1" }); // re-render / second call, same attempt
    expect(metaCalls).toEqual([["track", "InitiateCheckout", { currency: "INR", value: 58, content_ids: ["pack_chapter"], content_type: "product" }, { eventID: "lt_attempt_1" }]]);
    trackPackCheckout(d, { signedIn: true, attemptId: "lt_attempt_2" }); // a NEW attempt is a new event
    expect(metaCalls).toHaveLength(2);
    expect(metaCalls[1][3]).toEqual({ eventID: "lt_attempt_2" });
    // the Premium pass tap keeps its own event and is not a pack event
    expect(metaCalls.every((c) => c[1] === "InitiateCheckout")).toBe(true);
    vi.useRealTimers();
  });

  it("META-PACK-CHECKOUT-1: a call with no attempt id still gets one id of its own (never a bare, id-less Meta event)", () => {
    trackPackCheckout({ sku: "pack_mock", itemName: "Mock Pack", valueInr: 99 });
    expect(metaCalls).toHaveLength(1);
    expect((metaCalls[0][3] as { eventID: string }).eventID).toMatch(/^lt_/);
  });

  it("pack_purchase: once per transaction; Meta gets the custom PackPurchase (never the standard Purchase); GA4 gets purchase; the Premium `purchase` is NOT logged first-party", () => {
    const d = { sku: "pack_bundle" as const, itemName: "Complete Bundle", valueInr: 299, transactionId: "pay_1" };
    trackPackPurchase(d);
    trackPackPurchase(d);
    expect(names()).toEqual(["pack_purchase"]);
    expect(metaCalls).toEqual([["trackCustom", "PackPurchase", { currency: "INR", value: 299 }, { eventID: "pay_1" }]]);
    const purchases = gtagCalls.filter((c) => c[0] === "event" && c[1] === "purchase");
    expect(purchases).toHaveLength(1);
    expect(purchases[0][2]).toMatchObject({ transaction_id: "pay_1", currency: "INR", value: 299, items: [{ item_id: "pack_bundle", price: 299, quantity: 1 }] });
    expect(ga4Names()).toContain("pack_purchase");
    expect(metaCalls.some((c) => c[1] === "Purchase")).toBe(false);
  });

  it("META-PURCHASE-DEDUP-1: the pack sale id is Meta's eventID, and a second tab (shared localStorage) sends nothing", () => {
    const d = { sku: "pack_bundle" as const, itemName: "Complete Bundle", valueInr: 299, transactionId: "order_PK" };
    trackPackPurchase(d);
    __resetPurchaseMemoryForTests();
    window.sessionStorage.clear();
    trackPackPurchase(d);
    expect(metaCalls).toEqual([["trackCustom", "PackPurchase", { currency: "INR", value: 299 }, { eventID: "order_PK" }]]);
    expect(gtagCalls.filter((c) => c[0] === "event" && c[1] === "purchase")).toHaveLength(1);
  });

  it("an empty transaction id sends nothing", () => {
    trackPackPurchase({ sku: "pack_mock", itemName: "Mock Pack", valueInr: 99, transactionId: "" });
    expect(names()).toEqual([]);
  });

  it("CBQ-PACK-1: pack_cbq purchase reports item_id pack_cbq and value 199 to GA4 and Meta", () => {
    trackPackPurchase({ sku: "pack_cbq", itemName: "Maths CBQ Pack", valueInr: 199, transactionId: "pay_cbq" });
    expect(metaCalls).toEqual([["trackCustom", "PackPurchase", { currency: "INR", value: 199 }, { eventID: "pay_cbq" }]]);
    const p = gtagCalls.filter((c) => c[0] === "event" && c[1] === "purchase");
    expect(p).toHaveLength(1);
    expect(p[0][2]).toMatchObject({ transaction_id: "pay_cbq", currency: "INR", value: 199, items: [{ item_id: "pack_cbq", item_name: "Maths CBQ Pack" }] });
  });

  it("PACK-SAMPLE-1: pack_sample_download goes to the first-party log by name and to GA4 with { pack, surface }, for a signed-out visitor too", () => {
    trackPackSampleDownload("pack_cbq:science", "packs_cbq");
    expect(names()).toEqual(["pack_sample_download"]);
    expect(recordActivity.mock.calls[0][1]).toMatchObject({ name: "pack_sample_download", data: { pack: "pack_cbq:science", surface: "packs_cbq" } });
    const hit = gtagCalls.find((c) => c[0] === "event" && c[1] === "pack_sample_download");
    expect(hit?.[2]).toMatchObject({ pack: "pack_cbq:science", surface: "packs_cbq" });
  });

  it("SAMPLE-FOLLOWUP-1: pack_sample_download carries signed_in true / false once known (never guessed), and reports the pack for the follow-up", () => {
    hint.mockReturnValueOnce(true);
    trackPackSampleDownload("pack_cbq:science", "packs_dialog");
    expect(recordActivity.mock.calls[0][1]).toMatchObject({ data: { pack: "pack_cbq:science", surface: "packs_dialog", signed_in: true } });
    hint.mockReturnValueOnce(false);
    trackPackSampleDownload("pack_bundle:all", "packs_tile");
    expect(recordActivity.mock.calls[1][1]).toMatchObject({ data: { signed_in: false } });
    hint.mockReturnValueOnce(undefined);
    trackPackSampleDownload("pack_mock:maths", "packs_tile");
    expect((recordActivity.mock.calls[2][1] as { data: Record<string, unknown> }).data).not.toHaveProperty("signed_in");
    expect(seen.mock.calls.map((c) => c[0]).slice(-3)).toEqual(["pack_cbq:science", "pack_bundle:all", "pack_mock:maths"]);
    expect(JSON.stringify(recordActivity.mock.calls)).not.toMatch(/@|uid|email/i);
  });
});
