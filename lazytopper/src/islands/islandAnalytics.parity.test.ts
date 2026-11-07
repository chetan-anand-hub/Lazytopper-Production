import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { getAdditionalUserInfo } = vi.hoisted(() => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("firebase/auth", () => ({ getAdditionalUserInfo }));
vi.mock("../services/activityClient", () => ({ recordActivity: vi.fn() }));

import * as real from "../analytics/analytics";
import { captureVisitSource as realCapture, rememberVisitSourceOnce, resetVisitSourceAttempt } from "../analytics/visitSource";
import { scrubSpeedEvent as realScrub, speedRouteFor as realRoute } from "../analytics/speedInsights";
import * as island from "./islandAnalytics";

/**
 * SPEED-ISLANDS-1 — the island's analytics are COPIES (islandAnalytics.ts says why). This file is what keeps
 * them copies: every function runs against the original on the same inputs, and the vendor calls a page view
 * or a named event produces are compared call for call against the same stubs. Change the original without
 * the copy and this goes red.
 */

const PATHS = [
  "/", "/notes/real-numbers", "/notes/real-numbers/", "/ncert-solutions/triangles", "/ncert-exemplar/electricity",
  "/u/abcdefghijklmnopqrstuvwxyz123456", "/me/someone@example.com", "/x/AbCdEfGhIjKlMnOpQrStUv12", "/pay/9876543210",
  "/topic-hub/10/maths/real-numbers", "/legal/terms", "/cbse/class-10", "/practice/10/maths", "/admin/funnel", "/weird", "/chapter-test/a/b/c",
  "/notes", "/pricing?x=1#y", "", `/notes/${"a-".repeat(130)}x`, `/${"a".repeat(200)}`,
];
const SEARCHES = ["", "?gclid=abc&utm_source=g&x=1", "?utm_content=cbq_short", "?utm_content=sci_light&utm_medium=cpc", "?cbq=1", "?fbclid=f", "?lt_clk=gbraid,wbraid", "?utm_source=9876543210"];
const REFERRERS = ["", "https://www.google.com/search?q=x", "https://www.lazytopper.com/notes/x", "https://lazytopper.com/u/secret", "android-app://com.google", "https://user:pw@evil.example/x#h"];

const ORIGIN = "https://www.lazytopper.com";
function setLocation(pathAndQuery: string, hash = ""): void {
  const url = new URL(pathAndQuery + hash, ORIGIN);
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { href: url.href, origin: url.origin, hostname: url.hostname, pathname: url.pathname, search: url.search, hash: url.hash, assign: vi.fn() },
  });
}
function setReferrer(referrer: string): void {
  Object.defineProperty(document, "referrer", { configurable: true, get: () => referrer });
}

type Calls = { va: unknown[][]; gtag: unknown[][]; fbq: unknown[][] };
function stubVendors(): Calls {
  const calls: Calls = { va: [], gtag: [], fbq: [] };
  const w = window as unknown as Record<string, unknown>;
  w.va = (...a: unknown[]) => calls.va.push(a);
  w.gtag = (...a: unknown[]) => calls.gtag.push(a);
  const fbq = (...a: unknown[]) => calls.fbq.push(a);
  (fbq as unknown as { callMethod: unknown }).callMethod = () => undefined;
  w.fbq = fbq;
  return calls;
}

const originalLocation = window.location;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-07T10:00:00Z"));
  window.localStorage.clear();
  window.sessionStorage.clear();
  setReferrer("");
});
afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  const w = window as unknown as Record<string, unknown>;
  delete w.va;
  delete w.gtag;
  delete w.fbq;
});

describe("pure copies match the originals", () => {
  it("normalisePath, routerPathOf", () => {
    for (const p of PATHS) {
      expect(island.normalisePath(p)).toBe(real.normalisePath(p));
      expect(island.routerPathOf(p || "/")).toBe(real.routerPathOf(p || "/"));
    }
  });

  it("ga4PageLocation, ga4PageReferrer", () => {
    for (const p of PATHS) for (const s of SEARCHES) expect(island.ga4PageLocation(p, s, ORIGIN)).toBe(real.ga4PageLocation(p, s, ORIGIN));
    for (const r of REFERRERS) expect(island.ga4PageReferrer(r)).toBe(real.ga4PageReferrer(r));
  });

  it("metaAddressIsClean", () => {
    for (const p of PATHS.filter(Boolean)) {
      for (const s of SEARCHES) {
        for (const h of ["", "#x"]) {
          for (const r of REFERRERS) {
            const loc = { pathname: p.split("?")[0], search: s, hash: h, hostname: "www.lazytopper.com" };
            expect(island.metaAddressIsClean(loc, r)).toBe(real.metaAddressIsClean(loc, r));
          }
        }
      }
    }
  });

  it("speedRouteFor, scrubSpeedEvent", () => {
    setLocation("/notes/x");
    for (const p of PATHS) {
      expect(island.speedRouteFor(p || "/")).toBe(realRoute(p || "/"));
      const ev = { url: `${ORIGIN}${p}`, route: "?" };
      expect(island.scrubSpeedEvent(ev)).toEqual(realScrub(ev));
    }
  });

  it("captureVisitSource", () => {
    for (const p of PATHS.filter(Boolean)) for (const s of SEARCHES) for (const r of REFERRERS) {
      const loc = { pathname: p.split("?")[0], search: s };
      expect(island.captureVisitSource(loc, r, "www.lazytopper.com")).toEqual(realCapture(loc, r, "www.lazytopper.com"));
    }
  });
});

describe("storage effects match (the app reads these after the island wrote them)", () => {
  const snapshot = () => ({
    session: Object.fromEntries(Object.keys(window.sessionStorage).sort().map((k) => [k, window.sessionStorage.getItem(k)])),
    local: Object.fromEntries(Object.keys(window.localStorage).sort().map((k) => [k, window.localStorage.getItem(k)])),
  });
  it("rememberVisitSourceOnce", () => {
    for (const s of SEARCHES) for (const r of REFERRERS) {
      const loc = { pathname: "/notes/real-numbers", search: s };
      window.sessionStorage.clear();
      window.localStorage.clear();
      resetVisitSourceAttempt();
      rememberVisitSourceOnce(loc, r, "www.lazytopper.com");
      const want = snapshot();
      window.sessionStorage.clear();
      window.localStorage.clear();
      island.rememberVisitSource(loc, r, "www.lazytopper.com");
      expect(snapshot()).toEqual(want);
    }
  });
});

describe("vendor calls match, call for call", () => {
  it("the page view (va, GA4 incl. the internal-device tag, Meta)", () => {
    for (const internal of [false, true]) {
      for (const s of SEARCHES) {
        setLocation(`/notes/real-numbers${s}`);
        setReferrer("https://www.google.com/");
        window.localStorage.clear();
        if (internal) window.localStorage.setItem("lazytopper.internal", "1");
        const want = stubVendors();
        real.trackPageview("/notes/real-numbers");
        const got = stubVendors();
        island.__resetForTests();
        island.startIslandAnalytics();
        expect(got).toEqual(want);
        // CONTROL — the comparison is not of two empty lists.
        expect(want.va).toHaveLength(1);
        expect(want.gtag.filter((c) => c[1] === "page_view")).toHaveLength(1);
        if (s === "") expect(want.fbq).toEqual([["track", "PageView"]]);
      }
    }
  });

  it("named events: sol_hint, whatsapp_contact_tap, engaged_5min / engaged_10min (Meta-mapped)", () => {
    setLocation("/ncert-solutions/triangles");
    for (const name of ["sol_hint", "engaged_5min", "engaged_10min"] as const) {
      const want = stubVendors();
      real.trackNamedEvent(name);
      const got = stubVendors();
      island.sendNamedEvent(name);
      expect(got).toEqual(want);
      expect(want.gtag.some((c) => c[1] === name)).toBe(true);
    }
    const want = stubVendors();
    real.trackWhatsAppContactTap("fab");
    const got = stubVendors();
    island.sendWhatsAppTap("fab");
    expect(got).toEqual(want);
  });

  it("nothing at all in an automated context (loopback host)", () => {
    Object.defineProperty(window, "location", { configurable: true, writable: true, value: { ...new URL("http://localhost/notes/x"), hostname: "localhost", pathname: "/notes/x", search: "", hash: "", origin: "http://localhost" } });
    const calls = stubVendors();
    island.sendNamedEvent("sol_hint");
    expect(calls).toEqual({ va: [], gtag: [], fbq: [] });
  });
});

describe("hand-over to the app: no double count", () => {
  it("drops exactly the app's repeat of the page view, and the counted replays", () => {
    setLocation("/notes/real-numbers");
    const calls = stubVendors();
    island.__resetForTests();
    island.startIslandAnalytics();
    const add = island.suppressAppRepeats();
    add("sol_hint", 1);
    real.trackPageview("/notes/real-numbers"); // the app's RouteAnalytics on boot: dropped
    real.trackNamedEvent("sol_hint"); // a replayed hint: dropped
    real.trackNamedEvent("sol_hint"); // the student's own next hint: sent
    real.trackPageview("/pricing"); // a real later navigation: sent
    expect(calls.va.filter((c) => c[0] === "pageview")).toHaveLength(2);
    expect(calls.gtag.filter((c) => c[0] === "event" && c[1] === "page_view")).toHaveLength(2);
    expect(calls.fbq.filter((c) => c[1] === "PageView")).toHaveLength(2);
    expect(calls.gtag.filter((c) => c[0] === "event" && c[1] === "sol_hint")).toHaveLength(1);
  });
});
