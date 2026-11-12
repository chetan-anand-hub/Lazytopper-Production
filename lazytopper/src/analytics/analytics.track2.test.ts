import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
const recordActivity = vi.hoisted(() => vi.fn());
vi.mock("../services/activityClient", () => ({ recordActivity }));

import {
  INTERNAL_DEVICE_KEY,
  PURCHASE_SENT_KEY,
  PURCHASE_SENT_LOCAL_KEY,
  __resetPurchaseMemoryForTests,
  trackBeginCheckout,
  trackOnboardingEvent,
  trackPageview,
  trackPurchase,
  trackNamedEvent,
} from "./analytics";

/**
 * TRACK-2 — checkout + onboarding events, the admin silence and the internal-device tag.
 * gtag / fbq / va are stubbed as index.html defines them; what is read here is what each
 * vendor would receive.
 */
const originalLocation = window.location;
type Win = { gtag?: unknown; fbq?: unknown; va?: unknown };
const w = window as unknown as Win;

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
  __resetPurchaseMemoryForTests();
  recordActivity.mockClear();
  setLocation("/pricing");
});

afterEach(() => {
  delete w.gtag;
  delete w.fbq;
  delete w.va;
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  vi.unstubAllEnvs();
});

const ga4Events = (): unknown[][] => ga4.filter((e) => e[0] === "event");
const month = { passType: "month" as const, itemName: "Premium pass for a month", valueInr: 599 };

describe("TRACK-2 · checkout events", () => {
  it("PURCHASE-EVENT-1: a Premium purchase is one GA4 hit with transaction_id, rupee value, INR and an item with price and quantity 1; the same id never fires twice", () => {
    trackPurchase({ ...month, transactionId: "pay_pass_1" });
    trackPurchase({ ...month, transactionId: "pay_pass_1" });
    const hits = ga4Events().filter((e) => e[1] === "purchase");
    expect(hits).toHaveLength(1);
    const params = hits[0][2] as Record<string, unknown>;
    expect(params).toMatchObject({ transaction_id: "pay_pass_1", currency: "INR", value: 599, items: [{ item_id: "month", item_name: month.itemName, price: 599, quantity: 1 }] });
    expect(typeof params.value).toBe("number");
  });

  it("begin_checkout reaches GA4 (ecommerce shape), Meta (InitiateCheckout) and Vercel", () => {
    trackBeginCheckout(month);
    const [, name, params] = ga4Events()[0] as [string, string, Record<string, unknown>];
    expect(name).toBe("begin_checkout");
    expect(params).toMatchObject({ currency: "INR", value: 599, items: [{ item_id: "month", item_name: month.itemName }] });
    expect(meta).toEqual([["track", "InitiateCheckout", { currency: "INR", value: 599 }]]);
    expect(vercel[0][1]).toEqual({ name: "begin_checkout", data: { currency: "INR", value: 599, pass: "month" } });
    expect(recordActivity).toHaveBeenCalledTimes(1);
  });

  it("purchase carries transaction_id, value and currency, and fires once per transaction id", () => {
    trackPurchase({ ...month, transactionId: "lt_a" });
    trackPurchase({ ...month, transactionId: "lt_a" });
    expect(ga4Events().filter((e) => e[1] === "purchase")).toHaveLength(1);
    expect(ga4Events().filter((e) => e[1] === "purchase")[0][2]).toMatchObject({ transaction_id: "lt_a", currency: "INR", value: 599 });
    // META-PURCHASE-DEDUP-1: the sale id rides as Meta's eventID (4th argument).
    expect(meta).toEqual([["track", "Purchase", { currency: "INR", value: 599 }, { eventID: "lt_a" }]]);
  });

  it("a reload (memory cleared, tab storage kept) does not count the same transaction twice", () => {
    trackPurchase({ ...month, transactionId: "lt_b" });
    __resetPurchaseMemoryForTests();
    trackPurchase({ ...month, transactionId: "lt_b" });
    expect(ga4Events().filter((e) => e[1] === "purchase")).toHaveLength(1);
    expect(window.sessionStorage.getItem(PURCHASE_SENT_KEY)).toContain("lt_b");
  });

  it("an unknown price sends no value rather than an invented one", () => {
    trackBeginCheckout({ ...month, valueInr: null });
    expect(ga4Events()[0][2]).not.toHaveProperty("value");
  });
});

describe("TRACK-2 · every new event name reaches the sender", () => {
  const onboarding: Array<[Parameters<typeof trackOnboardingEvent>[0], Record<string, string | number>]> = [
    ["start_here_shown", { surface: "home" }],
    ["start_here_start", { subject: "science", chapter: "electricity", qtype: "mcq" }],
    ["start_here_graded", { subject: "science", correct: 3, total: 5 }],
    ["start_here_dismissed", { surface: "practice_hub" }],
    ["tutor_from_scorecard", { surface: "quick_practice" }],
    // TUTOR-FIX-2 T13.
    ["tutor_first_message", { subject: "maths", chapter: "trigonometry" }],
  ];
  it.each(onboarding)("%s -> GA4, Vercel and the activity log, with its params", (name, params) => {
    trackOnboardingEvent(name, params as never);
    expect(ga4Events()[0][1]).toBe(name);
    expect(ga4Events()[0][2]).toMatchObject(params);
    expect(vercel[0][1]).toMatchObject({ name, data: params });
    expect(recordActivity).toHaveBeenCalledWith("event", expect.objectContaining({ name }));
  });

  it("free text cannot ride along: a value that is not a short slug is dropped", () => {
    trackOnboardingEvent("start_here_start", { subject: "science", chapter: "a b c@d.com", qtype: "mcq" });
    expect(ga4Events()[0][2]).not.toHaveProperty("chapter");
  });

  it("named events still send bare (control)", () => {
    trackNamedEvent("trial_start");
    expect(ga4Events()[0][2]).not.toHaveProperty("value");
  });
});

describe("TRACK-2 · admin traffic stays out of analytics", () => {
  it("a /admin page view sends nothing to GA4, Vercel or Meta, but the activity log still hears it", () => {
    setLocation("/admin/students");
    trackPageview("/admin/students");
    expect(ga4).toEqual([]);
    expect(meta).toEqual([]);
    expect(vercel).toEqual([]);
    expect(recordActivity).toHaveBeenCalledTimes(1);
  });

  it("an event fired while on /admin sends nothing to vendors", () => {
    setLocation("/admin");
    trackBeginCheckout(month);
    expect(ga4).toEqual([]);
    expect(meta).toEqual([]);
    expect(vercel).toEqual([]);
  });

  it("a non-admin page view still sends (control)", () => {
    trackPageview("/pricing");
    expect(ga4Events()[0][1]).toBe("page_view");
    expect(vercel).toHaveLength(1);
  });

  it("visiting /admin marks the device, and later GA4 hits carry traffic_type internal", () => {
    setLocation("/admin");
    trackPageview("/admin");
    expect(window.localStorage.getItem(INTERNAL_DEVICE_KEY)).toBe("1");
    setLocation("/pricing");
    trackPageview("/pricing");
    const sets = ga4.filter((e) => e[0] === "set");
    expect(sets[sets.length - 1][1]).toMatchObject({ traffic_type: "internal" });
    expect(ga4Events()[0][2]).toMatchObject({ traffic_type: "internal" });
  });

  it("an unmarked device carries no traffic_type (control)", () => {
    trackPageview("/pricing");
    expect(ga4Events()[0][2]).not.toHaveProperty("traffic_type");
  });
});

describe("META-PURCHASE-DEDUP-1 · one sale = one Purchase", () => {
  const purchases = () => meta.filter((c) => c[1] === "Purchase");

  it("Meta gets the sale id as eventID (4th argument); GA4 transaction_id and the Ads conversion use the same id", () => {
    trackPurchase({ ...month, transactionId: "order_ABC" });
    expect(purchases()).toEqual([["track", "Purchase", { currency: "INR", value: 599 }, { eventID: "order_ABC" }]]);
    expect(ga4Events().find((e) => e[1] === "purchase")![2]).toMatchObject({ transaction_id: "order_ABC" });
    const ads = ga4.find((e) => e[0] === "event" && e[1] === "conversion");
    expect(ads![2]).toMatchObject({ transaction_id: "order_ABC", value: 599 });
  });

  it("a second TAB (fresh memory and sessionStorage, shared localStorage) sends nothing for the same sale", () => {
    trackPurchase({ ...month, transactionId: "order_TAB" });
    __resetPurchaseMemoryForTests();
    window.sessionStorage.clear(); // a new tab has its own sessionStorage
    trackPurchase({ ...month, transactionId: "order_TAB" });
    expect(purchases()).toHaveLength(1);
    expect(ga4Events().filter((e) => e[1] === "purchase")).toHaveLength(1);
    expect(ga4.filter((e) => e[1] === "conversion")).toHaveLength(1);
  });

  it("localStorage holds ids only (cap 50), never anything personal", () => {
    for (let i = 0; i < 55; i++) trackPurchase({ ...month, transactionId: `order_${i}` });
    const stored = JSON.parse(window.localStorage.getItem(PURCHASE_SENT_LOCAL_KEY) || "[]") as string[];
    expect(stored).toHaveLength(50);
    expect(stored[49]).toBe("order_54");
    expect(stored.every((x) => /^order_\d+$/.test(x))).toBe(true);
  });

  it("storage that throws still sends once per page load", () => {
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      trackPurchase({ ...month, transactionId: "order_NOSTORE" });
      trackPurchase({ ...month, transactionId: "order_NOSTORE" });
      expect(purchases()).toHaveLength(1);
    } finally {
      get.mockRestore();
      set.mockRestore();
    }
  });

  it("two different sales are two Purchases with their own eventIDs", () => {
    trackPurchase({ ...month, transactionId: "order_1" });
    trackPurchase({ ...month, transactionId: "order_2" });
    expect(purchases().map((c) => (c[3] as { eventID: string }).eventID)).toEqual(["order_1", "order_2"]);
  });
});
