import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
const recordActivity = vi.hoisted(() => vi.fn());
vi.mock("../../services/activityClient", () => ({ recordActivity }));

import { GUIDE_PREVIEW_STORAGE_KEY, trackOnboardingEvent } from "../../analytics/analytics";
import {
  GUIDE_DEV_OVERRIDE_KEY,
  GUIDE_PREVIEW_KEY,
  GUIDE_PREVIEW_MS,
  GUIDE_VARIANT_SENT_PREFIX,
  __resetGuideVariantSentForTests,
  __setGuideAbForTests,
  __setGuideArmReportsForTests,
  guidePreviewActive,
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
  __setGuideArmReportsForTests(false);
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

describe("PREVIEW-1 · precedence: test seam > preview > dev override > guide (GUIDE-ALL-1)", () => {
  it("★★ each layer wins over the ones below it", () => {
    __setGuideAbForTests(true); // the guide on (as in production), no forced arm
    // GUIDE-ALL-1: the bottom layer is "guide" for every uid (the hash no longer decides)
    expect(resolveGuideVariant("u1")).toBe("guide");
    // dev override > guide
    window.localStorage.setItem(GUIDE_DEV_OVERRIDE_KEY, "control");
    expect(resolveGuideVariant("u1")).toBe("control");
    // preview > dev override
    live("guide");
    expect(resolveGuideVariant("u1")).toBe("guide");
    // test seam > preview
    __setGuideAbForTests(true, "control");
    expect(resolveGuideVariant("u1")).toBe("control");
  });

  it("★★ GUIDE-ALL-1: the admin preview can still force CONTROL for any account (the plain experience)", () => {
    __setGuideAbForTests(true);
    live("control");
    expect(resolveGuideVariant("u1")).toBe("control");
    setGuidePreview(null);
    expect(resolveGuideVariant("u1")).toBe("guide");
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

  it("an expired preview falls back to the guide (and is removed)", () => {
    __setGuideAbForTests(true);
    store({ arm: "control", until: Date.now() - 1 });
    expect(resolveGuideVariant("u1")).toBe("guide");
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
    // F1 — and EVERY start_here_* funnel event (the card's, Byte's quick actions', the Practice
    // page's start_here_graded), whichever arm is previewed.
    for (const arm of ["guide", "control"] as const) {
      live(arm);
      trackOnboardingEvent("start_here_shown", { surface: "home" });
      trackOnboardingEvent("start_here_shown", { surface: "check_improve_focus", variant: "check_one" });
      trackOnboardingEvent("start_here_start", { subject: "maths", chapter: "real-numbers", qtype: "mcq", mode: "one_tap" });
      trackOnboardingEvent("start_here_dismissed", { surface: "practice_hub" });
      trackOnboardingEvent("start_here_graded", { subject: "maths", correct: 3, total: 5 });
    }
    expect(ga4).toEqual([]);
    expect(vercel).toEqual([]);
    expect(recordActivity).not.toHaveBeenCalled();
    expect(Object.keys(window.localStorage).some((k) => k.startsWith(GUIDE_VARIANT_SENT_PREFIX))).toBe(false);
  });

  it("★★ NEGATIVE — with NO preview (absent, or expired) start_here_shown fires exactly as today", () => {
    trackOnboardingEvent("start_here_shown", { surface: "home" });
    store({ arm: "guide", until: Date.now() - 1 }); // expired: no effect
    trackOnboardingEvent("start_here_shown", { surface: "practice_hub" });
    expect(vercel).toEqual([
      ["event", { name: "start_here_shown", data: { surface: "home" } }],
      ["event", { name: "start_here_shown", data: { surface: "practice_hub" } }],
    ]);
  });

  it("★★ under a preview a non-guide, non-Start-here event still fires (tutor_from_scorecard)", () => {
    live("control");
    trackOnboardingEvent("tutor_from_scorecard", { surface: "quick_practice" });
    expect(vercel).toEqual([["event", { name: "tutor_from_scorecard", data: { surface: "quick_practice" } }]]);
  });

  it("the analytics layer reads the SAME key the guide module writes", () => {
    expect(GUIDE_PREVIEW_STORAGE_KEY).toBe(GUIDE_PREVIEW_KEY);
  });

  it("★ with no preview the guide events fire exactly as before", () => {
    trackGuideEvent("guide_shown", { surface: "home", variant: "control", intent: "cbq" });
    trackGuideEvent("ziggy_reaction", { band: "half_plus" });
    expect(vercel).toEqual([
      ["event", { name: "guide_shown", data: { surface: "home", variant: "control", intent: "cbq" } }],
      ["event", { name: "ziggy_reaction", data: { band: "half_plus" } }],
    ]);
  });

  it("★★ GUIDE-ALL-1: with no preview the ARM REPORT no longer fires (no GA4 guide_variant, no activity)", () => {
    noteGuideVariantAssigned("student-uid-1", "guide");
    expect(ga4.some((c) => JSON.stringify(c).includes("guide_variant"))).toBe(false);
    expect(recordActivity).not.toHaveBeenCalled();
    expect(vercel).toEqual([]);
  });

  it("(retired mechanics, seam on) with no preview the arm report reaches GA4 and the activity log", () => {
    __setGuideArmReportsForTests(true);
    noteGuideVariantAssigned("student-uid-1", "guide");
    expect(ga4).toContainEqual(["set", "user_properties", { guide_variant: "guide" }]);
    expect(recordActivity).toHaveBeenCalledWith("event", { name: "guide_variant_assigned" });
  });

  it("(retired mechanics, seam on) after the preview ends, the account's REAL arm is still reported (no marker was written during it)", () => {
    __setGuideArmReportsForTests(true);
    live("guide");
    noteGuideVariantAssigned("student-uid-1", "control");
    expect(recordActivity).not.toHaveBeenCalled();
    setGuidePreview(null);
    noteGuideVariantAssigned("student-uid-1", "control");
    expect(recordActivity).toHaveBeenCalledWith("event", { name: "guide_variant_assigned" });
  });
});
