import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
const recordActivity = vi.hoisted(() => vi.fn());
vi.mock("../services/activityClient", () => ({ recordActivity }));

import { ADS_CONVERSION_SEND_TO, __resetPurchaseMemoryForTests, sendAdsConversion, trackBeginCheckout, trackPurchase } from "./analytics";
import { trackPackPurchase } from "../lib/packs/packAnalytics";

/** ADS-TAG-1 - the Google Ads purchase conversion fires beside GA4 `purchase`, and only there. */
const originalLocation = window.location;
type Win = { gtag?: unknown };
const w = window as unknown as Win;
let calls: unknown[][];

function setLocation(path: string): void {
  const url = new URL(path, "https://www.lazytopper.com");
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { href: url.href, origin: url.origin, hostname: url.hostname, pathname: url.pathname, search: url.search, hash: url.hash },
  });
}

beforeEach(() => {
  vi.stubEnv("BASE_URL", "/");
  calls = [];
  w.gtag = (...a: unknown[]) => void calls.push(a);
  Object.defineProperty(window.navigator, "webdriver", { configurable: true, value: false });
  Object.defineProperty(document, "referrer", { configurable: true, get: () => "" });
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetPurchaseMemoryForTests();
  setLocation("/pricing");
});
afterEach(() => {
  delete w.gtag;
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  vi.unstubAllEnvs();
});

const ads = () => calls.filter((c) => c[0] === "event" && c[1] === "conversion");
const ga4Purchase = () => calls.filter((c) => c[0] === "event" && c[1] === "purchase");
const pass = { passType: "board_pass" as never, itemName: "Board Pass", valueInr: 1917 };

describe("ADS-TAG-1 - Ads purchase conversion", () => {
  it("the constant is the Ads conversion label", () => {
    expect(ADS_CONVERSION_SEND_TO).toBe("AW-18471331566/6ahqCIbi4q8dEO7N6OdE");
  });

  it("a verified Premium purchase fires GA4 purchase AND the Ads conversion with send_to/value/INR/transaction_id", () => {
    trackPurchase({ ...pass, transactionId: "pay_AAA" });
    expect(ga4Purchase()).toHaveLength(1);
    expect(ads()).toHaveLength(1);
    expect(ads()[0][2]).toEqual({ send_to: ADS_CONVERSION_SEND_TO, value: 1917, currency: "INR", transaction_id: "pay_AAA" });
  });

  it("the same transaction id never fires the Ads conversion twice", () => {
    trackPurchase({ ...pass, transactionId: "pay_AAA" });
    trackPurchase({ ...pass, transactionId: "pay_AAA" });
    expect(ads()).toHaveLength(1);
  });

  it("a verified pack purchase fires GA4 purchase AND the Ads conversion", () => {
    trackPackPurchase({ sku: "pack_bundle", itemName: "Bundle", valueInr: 299, transactionId: "pay_P1" });
    expect(ga4Purchase()).toHaveLength(1);
    expect(ads()).toHaveLength(1);
    expect(ads()[0][2]).toEqual({ send_to: ADS_CONVERSION_SEND_TO, value: 299, currency: "INR", transaction_id: "pay_P1" });
  });

  it("missing / zero / non-finite amount -> no Ads conversion", () => {
    trackPurchase({ ...pass, valueInr: null as never, transactionId: "pay_B" });
    trackPurchase({ ...pass, valueInr: 0, transactionId: "pay_C" });
    trackPackPurchase({ sku: "pack_chapter", itemName: "x", valueInr: null, transactionId: "pay_D" });
    sendAdsConversion("pay_E", Number.NaN);
    sendAdsConversion("pay_F", undefined);
    expect(ads()).toHaveLength(0);
  });

  it("no transaction id -> nothing; dismiss/fail paths (checkout start only) fire no conversion", () => {
    sendAdsConversion("", 100);
    trackBeginCheckout(pass);
    expect(ads()).toHaveLength(0);
  });

  it("nothing on /admin, and nothing (no throw) when gtag is absent", () => {
    setLocation("/admin/students");
    trackPurchase({ ...pass, transactionId: "pay_G" });
    expect(ads()).toHaveLength(0);
    setLocation("/pricing");
    delete w.gtag;
    expect(() => trackPurchase({ ...pass, transactionId: "pay_H" })).not.toThrow();
  });

  it("index.html configures the Ads destination on the existing gtag, with no enhanced conversions", () => {
    const html = readFileSync(resolve(__dirname, "../../index.html"), "utf-8");
    expect(html).toContain('window.gtag("config", "AW-18471331566"');
    expect(html).not.toMatch(/googletagmanager\.com\/gtag\/js\?id=AW-/);
    expect(html).not.toMatch(/enhanced_conversion|user_data/);
  });
});
