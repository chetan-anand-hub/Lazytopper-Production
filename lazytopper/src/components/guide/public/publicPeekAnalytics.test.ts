import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
const recordActivity = vi.hoisted(() => vi.fn());
vi.mock("../../../services/activityClient", () => ({ recordActivity }));

import { trackGuidePublicArmAssigned, trackGuidePublicShown, trackOnboardingEvent, type GuideVariant } from "../../../analytics/analytics";

/**
 * GUIDE-PUBLIC-1 — the public peek in analytics: the GA4 user property `guide_public_arm` with
 * the vendor event `guide_public_arm_assigned { arm }` (NOT first-party: the activity log's
 * names are a closed list owned elsewhere, and it never records a signed-out visitor), and the
 * three guide_public_* events through the shared onboarding sanitiser.
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

describe("GUIDE-PUBLIC-1 · analytics", () => {
  it("★ sets the GA4 user property guide_public_arm and sends { arm } to the vendors only", () => {
    trackGuidePublicArmAssigned("control");
    expect(ga4[0]).toEqual(["set", "user_properties", { guide_public_arm: "control" }]);
    const ev = ga4Events();
    expect(ev).toHaveLength(1);
    expect(ev[0][1]).toBe("guide_public_arm_assigned");
    const params = Object.fromEntries(Object.entries(ev[0][2]).filter(([k]) => !ADDRESS_KEYS.includes(k)));
    expect(params).toEqual({ arm: "control" });
    expect(vercel).toEqual([["event", { name: "guide_public_arm_assigned", data: { arm: "control" } }]]);
    // The first-party log is handed the vendor payload, whose name is not on its closed list.
    expect(recordActivity).toHaveBeenCalledWith("event", { name: "guide_public_arm_assigned", data: { arm: "control" } });
    expect(meta).toEqual([]);
  });

  it("★ PREVIEW-1: under a valid preview the user property and the event are NOT sent", () => {
    window.localStorage.setItem("lazytopper.guidePreview", JSON.stringify({ arm: "guide", until: Date.now() + 60_000 }));
    trackGuidePublicArmAssigned("guide");
    expect(ga4).toEqual([]);
    expect(vercel).toEqual([]);
    expect(recordActivity).not.toHaveBeenCalled();
  });

  it("drops anything that is not one of the two arms", () => {
    trackGuidePublicArmAssigned("treatment" as GuideVariant);
    expect(ga4).toEqual([]);
    expect(vercel).toEqual([]);
  });

  it("★ F8: guide_public_shown carries signed_in as a real BOOLEAN (both vendors), the strings sanitised", () => {
    trackGuidePublicShown({ page: "notes", arm: "guide", chapter: "trigonometry", signed_in: false });
    trackGuidePublicShown({ page: "topic_hub", arm: "control", chapter: "electricity", signed_in: true });
    expect(vercel).toEqual([
      ["event", { name: "guide_public_shown", data: { page: "notes", arm: "guide", chapter: "trigonometry", signed_in: false } }],
      ["event", { name: "guide_public_shown", data: { page: "topic_hub", arm: "control", chapter: "electricity", signed_in: true } }],
    ]);
    const ev = ga4Events();
    expect(ev.map((e) => e[2].signed_in)).toEqual([false, true]);
    // Free text cannot ride along: a non-slug chapter is dropped, signed_in stays a boolean.
    vercel.length = 0;
    trackGuidePublicShown({ page: "notes", arm: "guide", chapter: "a b <script>", signed_in: "yes" as unknown as boolean });
    expect(vercel).toEqual([["event", { name: "guide_public_shown", data: { page: "notes", arm: "guide", signed_in: false } }]]);
  });

  it("★ the option / dismissed events ride the onboarding sanitiser (slugs only)", () => {
    trackOnboardingEvent("guide_public_option", { option: "quick", page: "topic_hub" });
    trackOnboardingEvent("guide_public_dismissed", { page: "notes" });
    expect(vercel).toEqual([
      ["event", { name: "guide_public_option", data: { option: "quick", page: "topic_hub" } }],
      ["event", { name: "guide_public_dismissed", data: { page: "notes" } }],
    ]);
  });
});
