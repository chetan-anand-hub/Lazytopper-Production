import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
const recordActivity = vi.hoisted(() => vi.fn());
vi.mock("../../services/activityClient", () => ({ recordActivity }));

import { trackOnboardingEvent } from "../../analytics/analytics";
import {
  GUIDE_DEV_OVERRIDE_KEY,
  GUIDE_PREVIEW_KEY,
  GUIDE_PREVIEW_MS,
  GUIDE_VARIANT_SENT_PREFIX,
  __resetGuideVariantSentForTests,
  __setGuideAbForTests,
  guidePreviewActive,
  guideVariantFor,
  noteGuideVariantAssigned,
  readGuidePreview,
  resolveGuideVariant,
  setGuidePreview,
  trackGuideEvent,
} from "./guideVariant";

/**
 * PREVIEW-1 — the admin's per-browser guide preview: storage shape, expiry, precedence, and the
 * analytics suppression, through the REAL analytics module (vendors stubbed on window).
 */
const NOW = 1_800_000_000_000; // a fixed instant; every expiry below is relative to it
const DAY = 86_400_000;

type Win = { gtag?: unknown; fbq?: unknown; va?: unknown };
const w = window as unknown as Win;
const originalLocation = window.location;
let ga4: unknown[][];
let vercel: Array<[string, Record<string, unknown>]>;

const store = (v: unknown) => window.localStorage.setItem(GUIDE_PREVIEW_KEY, typeof v === "string" ? v : JSON.stringify(v));
const live = (arm: "guide" | "control") => store({ arm, until: Date.now() + DAY });

beforeEach(() => {
  vi.stubEnv("BASE_URL", "/");
  ga4 = [];
  vercel = [];
  w.gtag = (...args: unknown[]) => ga4.push(args);
  const fbq = () => undefined;
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
  window.sessionStorage.clear();
  recordActivity.mockClear();
  __resetGuideVariantSentForTests();
  __setGuideAbForTests(null);
});
afterEach(() => {
  delete w.gtag;
  delete w.fbq;
  delete w.va;
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  vi.unstubAllEnvs();
  __setGuideAbForTests(null);
});

describe("PREVIEW-1 · the stored preview", () => {
  it("★ Show Byte / Show control write { arm, until: now + 7 days }; Off removes the key", () => {
    expect(setGuidePreview("guide", NOW)).toEqual({ arm: "guide", until: NOW + 7 * DAY });
    expect(GUIDE_PREVIEW_MS).toBe(7 * DAY);
    expect(JSON.parse(window.localStorage.getItem(GUIDE_PREVIEW_KEY)!)).toEqual({ arm: "guide", until: NOW + 7 * DAY });
    setGuidePreview("control", NOW);
    expect(readGuidePreview(NOW)).toEqual({ arm: "control", until: NOW + 7 * DAY });
    expect(setGuidePreview(null)).toBeNull();
    expect(window.localStorage.getItem(GUIDE_PREVIEW_KEY)).toBeNull();
    expect(readGuidePreview(NOW)).toBeNull();
  });

  it("★ expired → ignored AND removed; still valid one ms before `until`", () => {
    setGuidePreview("guide", NOW);
    expect(readGuidePreview(NOW + 7 * DAY - 1)).not.toBeNull();
    expect(readGuidePreview(NOW + 7 * DAY)).toBeNull();
    expect(window.localStorage.getItem(GUIDE_PREVIEW_KEY)).toBeNull();
  });

  it("★ malformed values are ignored and removed", () => {
    for (const bad of ["not json", "null", "[]", { arm: "treatment", until: NOW + DAY }, { arm: "guide" }, { arm: "guide", until: "soon" }]) {
      store(bad);
      expect(readGuidePreview(NOW)).toBeNull();
      expect(window.localStorage.getItem(GUIDE_PREVIEW_KEY)).toBeNull();
    }
  });
});

describe("PREVIEW-1 · precedence: test seam > preview > dev override > hash", () => {
  it("★★ each layer wins over the ones below it", () => {
    __setGuideAbForTests(true); // the split on (as in production), no forced arm
    const hashed = guideVariantFor("u1");
    const other = hashed === "guide" ? "control" : "guide";
    // hash only
    expect(resolveGuideVariant("u1")).toBe(hashed);
    // dev override > hash
    window.localStorage.setItem(GUIDE_DEV_OVERRIDE_KEY, other);
    expect(resolveGuideVariant("u1")).toBe(other);
    // preview > dev override
    live(hashed);
    expect(resolveGuideVariant("u1")).toBe(hashed);
    // test seam > preview
    __setGuideAbForTests(true, other);
    expect(resolveGuideVariant("u1")).toBe(other);
  });

  it("★ the preview applies to ANY signed-in uid on the browser, never to signed-out", () => {
    __setGuideAbForTests(true);
    live("control");
    for (const uid of ["u1", "abc", "Zx9Q2", "firebase-uid-0001"]) expect(resolveGuideVariant(uid)).toBe("control");
    live("guide");
    for (const uid of ["u1", "abc", "Zx9Q2", "firebase-uid-0001"]) expect(resolveGuideVariant(uid)).toBe("guide");
    expect(resolveGuideVariant(null)).toBeNull();
    expect(resolveGuideVariant("")).toBeNull();
  });

  it("an expired preview falls back to the hash (and is removed)", () => {
    __setGuideAbForTests(true);
    store({ arm: guideVariantFor("u1") === "guide" ? "control" : "guide", until: Date.now() - 1 });
    expect(resolveGuideVariant("u1")).toBe(guideVariantFor("u1"));
    expect(window.localStorage.getItem(GUIDE_PREVIEW_KEY)).toBeNull();
  });
});

describe("PREVIEW-1 · analytics suppression (real analytics module)", () => {
  it("★★ under a preview: NO guide_* event, NO ziggy_reaction, NO GA4 guide_variant property, NO guide_variant_assigned activity — and no device marker", () => {
    live("guide");
    expect(guidePreviewActive()).toBe(true);
    trackGuideEvent("guide_shown", { surface: "home", variant: "guide", intent: "cbq" });
    trackGuideEvent("guide_option", { option: "quick", rank: 1, surface: "home" });
    trackGuideEvent("guide_dismissed", { surface: "home" });
    trackGuideEvent("guide_reopened", { surface: "home" });
    trackGuideEvent("ziggy_reaction", { band: "full" });
    noteGuideVariantAssigned("student-uid-1", "guide");
    expect(ga4).toEqual([]);
    expect(vercel).toEqual([]);
    expect(recordActivity).not.toHaveBeenCalled();
    expect(Object.keys(window.localStorage).some((k) => k.startsWith(GUIDE_VARIANT_SENT_PREFIX))).toBe(false);
  });

  it("★★ under a preview a NON-guide event still fires (start_here_shown)", () => {
    live("control");
    trackOnboardingEvent("start_here_shown", { surface: "home" });
    expect(vercel).toEqual([["event", { name: "start_here_shown", data: { surface: "home" } }]]);
  });

  it("★ with no preview the guide events and the arm report fire exactly as before", () => {
    trackGuideEvent("guide_shown", { surface: "home", variant: "control", intent: "cbq" });
    trackGuideEvent("ziggy_reaction", { band: "half_plus" });
    expect(vercel).toEqual([
      ["event", { name: "guide_shown", data: { surface: "home", variant: "control", intent: "cbq" } }],
      ["event", { name: "ziggy_reaction", data: { band: "half_plus" } }],
    ]);
    noteGuideVariantAssigned("student-uid-1", "guide");
    expect(ga4).toContainEqual(["set", "user_properties", { guide_variant: "guide" }]);
    expect(recordActivity).toHaveBeenCalledWith("event", { name: "guide_variant_assigned" });
  });

  it("★ after the preview ends, the account's REAL arm is still reported (no marker was written during it)", () => {
    live("guide");
    noteGuideVariantAssigned("student-uid-1", "control");
    expect(recordActivity).not.toHaveBeenCalled();
    setGuidePreview(null);
    noteGuideVariantAssigned("student-uid-1", "control");
    expect(recordActivity).toHaveBeenCalledWith("event", { name: "guide_variant_assigned" });
  });
});
