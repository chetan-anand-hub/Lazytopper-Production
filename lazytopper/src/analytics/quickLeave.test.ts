// QUICK-LEAVE-1 — client half: source bucketing, beacon payload (no PII / query), once-per-tab, left vs engaged, kill switch.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  bucketVisitSource,
  buildVisitBeacon,
  startQuickLeaveWatch,
  quickLeaveEngaged,
  __resetQuickLeaveForTests,
  QUICK_LEAVE_TAB_KEY,
  VISIT_METRICS_ENDPOINT,
} from "./quickLeave";

const OWN = "lazytopper.com";
const ANDROID = "Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile Safari/537.36";
const FBAPP = "Mozilla/5.0 (Linux; Android 13; wv) AppleWebKit/537.36 [FB_IAB/FB4A;FBAV/400.0]";
const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36";

describe("bucketVisitSource", () => {
  const b = (search: string, ref = "") => bucketVisitSource(search, ref, OWN);
  it("buckets every source", () => {
    expect(b("?gclid=abc")).toBe("google_ads");
    expect(b("?gbraid=abc")).toBe("google_ads");
    expect(b("?utm_source=google&utm_medium=cpc")).toBe("google_ads");
    expect(b("?gclid=abc", "https://www.youtube.com/")).toBe("google_ads");
    expect(b("?fbclid=x")).toBe("meta");
    expect(b("?utm_source=instagram")).toBe("meta");
    expect(b("", "https://l.facebook.com/")).toBe("meta");
    expect(b("", "https://www.instagram.com/")).toBe("meta");
    expect(b("", "https://www.youtube.com/watch")).toBe("youtube");
    expect(b("?utm_source=youtube")).toBe("youtube");
    expect(b("?utm_source=chatgpt.com")).toBe("llm");
    expect(b("", "https://chatgpt.com/")).toBe("llm");
    expect(b("", "https://gemini.google.com/")).toBe("llm");
    expect(b("", "https://www.google.com/")).toBe("google_organic");
    expect(b("", "https://www.google.co.in/")).toBe("google_organic");
    expect(b("")).toBe("direct");
    expect(b("", "https://www.lazytopper.com/pricing")).toBe("direct");
    expect(b("", "https://news.example.org/x")).toBe("other");
    expect(b("?utm_source=newsletter")).toBe("other");
  });
});

describe("buildVisitBeacon", () => {
  it("carries only the closed fields; no query string, no uid, no user agent", () => {
    const beacon = buildVisitBeacon({ path: "/check-improve", source: "meta", engaged: false, userAgent: FBAPP });
    expect(Object.keys(beacon).sort()).toEqual(["device", "engaged", "inApp", "path", "source"]);
    expect(beacon).toMatchObject({ inApp: true, device: "mobile", engaged: false });
    expect(JSON.stringify(beacon)).not.toMatch(/\?|FBAV|uid|email|Mozilla/);
    expect(buildVisitBeacon({ path: "/", source: "direct", engaged: true, userAgent: DESKTOP })).toMatchObject({ inApp: false, device: "desktop" });
    expect(buildVisitBeacon({ path: "/", source: "direct", engaged: true, userAgent: ANDROID, late: true }).late).toBe(true);
  });
});

describe("the watch", () => {
  let beacon: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    __resetQuickLeaveForTests();
    window.sessionStorage.clear();
    beacon = vi.fn(() => true);
    Object.defineProperty(window.navigator, "sendBeacon", { value: beacon, configurable: true });
    window.history.replaceState({}, "", "/welcome?gclid=SECRET&utm_campaign=x");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    __resetQuickLeaveForTests();
    window.history.replaceState({}, "", "/");
  });
  const sent = () => beacon.mock.calls.map((c) => ({ url: c[0], body: JSON.parse(c[1] as string) }));
  const hide = () => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  };

  it("leaving without engaging sends ONE leave beacon, with no query string or click id", () => {
    startQuickLeaveWatch("/welcome", false, false);
    window.dispatchEvent(new Event("pagehide"));
    window.dispatchEvent(new Event("pagehide"));
    expect(sent()).toHaveLength(1);
    expect(sent()[0].url).toBe(VISIT_METRICS_ENDPOINT);
    expect(sent()[0].body).toMatchObject({ path: "/welcome", source: "google_ads", engaged: false });
    expect(JSON.stringify(sent())).not.toMatch(/SECRET|gclid|utm_/);
  });
  it("engaging sends ONE engaged beacon and no leave afterwards", () => {
    startQuickLeaveWatch("/welcome", false, false);
    quickLeaveEngaged();
    quickLeaveEngaged();
    window.dispatchEvent(new Event("pagehide"));
    expect(sent()).toHaveLength(1);
    expect(sent()[0].body).toMatchObject({ engaged: true });
    expect(sent()[0].body.late).toBeUndefined();
  });
  it("hidden then engaged later -> a leave, then one late correction", () => {
    startQuickLeaveWatch("/welcome", false, false);
    hide();
    quickLeaveEngaged();
    expect(sent().map((s) => [s.body.engaged, s.body.late ?? false])).toEqual([[false, false], [true, true]]);
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  });
  it("one visit per tab session: a second start in the same tab sends nothing", () => {
    startQuickLeaveWatch("/welcome", false, false);
    expect(window.sessionStorage.getItem(QUICK_LEAVE_TAB_KEY)).toBe("1");
    __resetQuickLeaveForTests();
    startQuickLeaveWatch("/welcome", false, false);
    window.dispatchEvent(new Event("pagehide"));
    expect(sent()).toHaveLength(0);
  });
  it("/admin and the owner's device send nothing", () => {
    startQuickLeaveWatch("/admin/students", true, false);
    window.dispatchEvent(new Event("pagehide"));
    __resetQuickLeaveForTests();
    window.sessionStorage.clear();
    startQuickLeaveWatch("/welcome", false, true);
    window.dispatchEvent(new Event("pagehide"));
    expect(sent()).toHaveLength(0);
  });
  it("KILL SWITCH VITE_QUICK_LEAVE_DISABLED=1: nothing stored, listened to or sent", () => {
    vi.stubEnv("VITE_QUICK_LEAVE_DISABLED", "1");
    startQuickLeaveWatch("/welcome", false, false);
    quickLeaveEngaged();
    window.dispatchEvent(new Event("pagehide"));
    expect(sent()).toHaveLength(0);
    expect(window.sessionStorage.getItem(QUICK_LEAVE_TAB_KEY)).toBeNull();
  });
});
