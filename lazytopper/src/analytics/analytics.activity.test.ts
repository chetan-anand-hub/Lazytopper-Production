/**
 * STUDENT-ACTIVITY-1 PR-1 — the forwarder inside analytics.ts `send()`.
 *
 * ★★ The owner's condition: GA4 and Vercel behaviour BYTE-UNCHANGED. Proven three ways:
 *   1. the exact calls each vendor receives are pinned literally;
 *   2. they are identical whether the forwarder records, or THROWS (a broken forwarder
 *      can never cost a vendor its hit);
 *   3. the forwarder sees the same (kind, payload) the vendors got, and nothing more.
 * Plus: in an automated / loopback context (analyticsEnabled() false) nothing is
 * forwarded either.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { getAdditionalUserInfo, recordActivity } = vi.hoisted(() => ({
  getAdditionalUserInfo: vi.fn(),
  recordActivity: vi.fn(),
}));
vi.mock("firebase/auth", () => ({ getAdditionalUserInfo }));
vi.mock("../services/activityClient", () => ({ recordActivity }));

import { trackNamedEvent, trackPageview, trackSignUp } from "./analytics";

type W = Window & {
  va?: (kind: string, payload: Record<string, unknown>) => void;
  gtag?: (...args: unknown[]) => void;
};
const w = window as W;
const originalLocation = window.location;
const ORIGIN = "https://www.lazytopper.com";

function setLocation(pathAndQuery: string, hostname = "www.lazytopper.com"): void {
  const u = new URL(`https://${hostname}${pathAndQuery}`);
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { ...originalLocation, hostname, origin: u.origin, pathname: u.pathname, search: u.search, href: u.href },
  });
}

let vercel: Array<[string, Record<string, unknown>]>;
let ga4: unknown[][];

function journey(): void {
  trackPageview("/notes/electricity");
  trackPageview("/check-improve");
  trackNamedEvent("check_graded");
  trackSignUp();
}

beforeEach(() => {
  vi.stubEnv("BASE_URL", "/app/");
  vercel = [];
  ga4 = [];
  w.va = (kind, payload) => vercel.push([kind, payload]);
  w.gtag = (...args: unknown[]) => ga4.push(args);
  Object.defineProperty(window.navigator, "webdriver", { configurable: true, value: false });
  setLocation("/app/notes/electricity");
  recordActivity.mockReset();
});

afterEach(() => {
  delete w.va;
  delete w.gtag;
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  vi.unstubAllEnvs();
});

describe("the activity forwarder in send()", () => {
  it("★★ the Vercel and GA4 calls are pinned exactly (byte-unchanged by the forwarder)", () => {
    journey();
    expect(vercel).toEqual([
      ["pageview", { route: "/notes/electricity", path: "/notes/electricity" }],
      ["pageview", { route: "/check-improve", path: "/check-improve" }],
      ["event", { name: "check_graded" }],
      ["event", { name: "sign_up" }],
    ]);
    const page = (p: string) => ({ page_location: `${ORIGIN}/app${p}`, page_referrer: "" });
    expect(ga4).toEqual([
      ["set", page("/notes/electricity")],
      ["event", "page_view", page("/notes/electricity")],
      ["set", page("/check-improve")],
      ["event", "page_view", page("/check-improve")],
      ["set", page("/notes/electricity")],
      ["event", "check_graded", page("/notes/electricity")],
      ["set", page("/notes/electricity")],
      ["event", "sign_up", page("/notes/electricity")],
    ]);
  });

  it("★★ a THROWING forwarder changes nothing the vendors receive, and nothing throws to the caller", () => {
    journey();
    const baseline = JSON.stringify({ vercel, ga4 });
    vercel = [];
    ga4 = [];
    recordActivity.mockImplementation(() => {
      throw new Error("forwarder exploded");
    });
    expect(() => journey()).not.toThrow();
    expect(JSON.stringify({ vercel, ga4 })).toBe(baseline);
    expect(recordActivity).toHaveBeenCalledTimes(8); // it really ran (and threw) — CONTROL
  });

  it("★ the forwarder receives exactly the (kind, payload) the vendors got — no uid, no extra field", () => {
    journey();
    expect(recordActivity.mock.calls).toEqual([
      ["pageview", { route: "/notes/electricity", path: "/notes/electricity" }],
      ["pageview", { route: "/check-improve", path: "/check-improve" }],
      ["event", { name: "check_graded" }],
      ["event", { name: "sign_up" }],
    ]);
  });

  it("★ GA4 + Vercel still get every hit when the forwarder is a no-op vs when it records (identical)", () => {
    recordActivity.mockImplementation(() => undefined);
    journey();
    const a = JSON.stringify({ vercel, ga4 });
    vercel = [];
    ga4 = [];
    recordActivity.mockImplementation((kind: string, payload: Record<string, unknown>) => {
      // a forwarder that mutated the payload would change what a vendor saw next — it must not matter
      Object.freeze(payload);
      return kind;
    });
    journey();
    expect(JSON.stringify({ vercel, ga4 })).toBe(a);
  });

  it("in an automated/loopback context nothing is sent to anyone, the forwarder included", () => {
    setLocation("/app/notes/electricity", "127.0.0.1");
    journey();
    expect(vercel).toEqual([]);
    expect(ga4).toEqual([]);
    expect(recordActivity).not.toHaveBeenCalled();
  });
});
