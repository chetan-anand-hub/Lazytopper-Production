import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
const recordActivity = vi.hoisted(() => vi.fn());
vi.mock("../../services/activityClient", () => ({ recordActivity }));

import { trackGuideVariantAssigned, trackOnboardingEvent, type GuideVariant } from "../../analytics/analytics";

/**
 * GUIDE-1 — the Byte-guide A/B in analytics: the GA4 user property `guide_variant`, the event
 * `guide_variant_assigned { variant }` (vendors) and its bare name (first-party, names only),
 * and the guide's onboarding events through the shared sanitiser.
 */
const originalLocation = window.location;
type Win = { gtag?: unknown; fbq?: unknown; va?: unknown };
const w = window as unknown as Win;
let ga4: unknown[][];
let meta: unknown[][];
let vercel: Array<[string, Record<string, unknown>]>;

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
  const url = new URL("/practice-hub", "https://www.lazytopper.com");
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { href: url.href, origin: url.origin, hostname: url.hostname, pathname: url.pathname, search: url.search, hash: url.hash },
  });
  window.localStorage.clear();
  recordActivity.mockClear();
});

afterEach(() => {
  delete w.gtag;
  delete w.fbq;
  delete w.va;
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  vi.unstubAllEnvs();
});

const ga4Events = () => ga4.filter((e) => e[0] === "event") as Array<[string, string, Record<string, unknown>]>;
const ADDRESS_KEYS = ["page_location", "page_referrer", "traffic_type"];

describe("GUIDE-1 · trackGuideVariantAssigned", () => {
  it("★ sets the GA4 user property, sends { variant } to the vendors and the BARE name first-party", () => {
    trackGuideVariantAssigned("guide");
    expect(ga4[0]).toEqual(["set", "user_properties", { guide_variant: "guide" }]);
    const ev = ga4Events();
    expect(ev).toHaveLength(1);
    expect(ev[0][1]).toBe("guide_variant_assigned");
    const params = Object.fromEntries(Object.entries(ev[0][2]).filter(([k]) => !ADDRESS_KEYS.includes(k)));
    expect(params).toEqual({ variant: "guide" });
    expect(vercel).toEqual([["event", { name: "guide_variant_assigned", data: { variant: "guide" } }]]);
    expect(recordActivity).toHaveBeenCalledWith("event", { name: "guide_variant_assigned" });
    expect(meta).toEqual([]);
  });

  it("drops anything that is not one of the two arms", () => {
    trackGuideVariantAssigned("treatment" as GuideVariant);
    expect(ga4).toEqual([]);
    expect(vercel).toEqual([]);
    expect(recordActivity).not.toHaveBeenCalled();
  });

  it("guide_shown / guide_option ride the onboarding sanitiser (slugs and small counts only)", () => {
    trackOnboardingEvent("guide_shown", { surface: "home", variant: "control", intent: "cbq" });
    trackOnboardingEvent("guide_option", { option: "quick", rank: 1, surface: "practice_hub_focus" });
    expect(vercel).toEqual([
      ["event", { name: "guide_shown", data: { surface: "home", variant: "control", intent: "cbq" } }],
      ["event", { name: "guide_option", data: { option: "quick", rank: 1, surface: "practice_hub_focus" } }],
    ]);
  });
});
