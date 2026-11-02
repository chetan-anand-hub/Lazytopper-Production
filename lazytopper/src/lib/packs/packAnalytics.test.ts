import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { recordActivity } = vi.hoisted(() => ({ recordActivity: vi.fn() }));
vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../../services/activityClient", () => ({ recordActivity }));

import { __resetPurchaseMemoryForTests } from "../../analytics/analytics";
import { trackPackCheckout, trackPackEvent, trackPackPurchase, trackPackSampleDownload } from "./packAnalytics";

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
  try {
    window.sessionStorage.clear();
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

  it("pack_checkout: first-party pack_checkout, GA4 begin_checkout with the sku as item, and no Meta hit", () => {
    trackPackCheckout({ sku: "pack_chapter", itemName: "Chapter Pack · Real Numbers", valueInr: 49 });
    expect(names()).toEqual(["pack_checkout"]);
    const begin = gtagCalls.find((c) => c[0] === "event" && c[1] === "begin_checkout");
    expect(begin).toBeTruthy();
    expect((begin![2] as { items: Array<{ item_id: string }> }).items[0].item_id).toBe("pack_chapter");
    expect(metaCalls).toEqual([]);
  });

  it("pack_purchase: once per transaction; Meta gets the custom PackPurchase (never the standard Purchase); GA4 gets purchase; the Premium `purchase` is NOT logged first-party", () => {
    const d = { sku: "pack_bundle" as const, itemName: "Complete Bundle", valueInr: 299, transactionId: "pay_1" };
    trackPackPurchase(d);
    trackPackPurchase(d);
    expect(names()).toEqual(["pack_purchase"]);
    expect(metaCalls).toEqual([["trackCustom", "PackPurchase", { currency: "INR", value: 299 }]]);
    const purchases = gtagCalls.filter((c) => c[0] === "event" && c[1] === "purchase");
    expect(purchases).toHaveLength(1);
    expect(purchases[0][2]).toMatchObject({ transaction_id: "pay_1", currency: "INR", value: 299, items: [{ item_id: "pack_bundle", price: 299, quantity: 1 }] });
    expect(ga4Names()).toContain("pack_purchase");
    expect(metaCalls.some((c) => c[1] === "Purchase")).toBe(false);
  });

  it("an empty transaction id sends nothing", () => {
    trackPackPurchase({ sku: "pack_mock", itemName: "Mock Pack", valueInr: 99, transactionId: "" });
    expect(names()).toEqual([]);
  });

  it("CBQ-PACK-1: pack_cbq purchase reports item_id pack_cbq and value 199 to GA4 and Meta", () => {
    trackPackPurchase({ sku: "pack_cbq", itemName: "Maths CBQ Pack", valueInr: 199, transactionId: "pay_cbq" });
    expect(metaCalls).toEqual([["trackCustom", "PackPurchase", { currency: "INR", value: 199 }]]);
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
});
