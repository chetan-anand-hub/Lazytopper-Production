import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getAdditionalUserInfo } = vi.hoisted(() => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("firebase/auth", () => ({ getAdditionalUserInfo }));
vi.mock("../services/activityClient", () => ({ recordActivity: vi.fn() }));
vi.mock("../services/firebaseClient", () => ({ authClient: null }));

/**
 * BUYER-SCORE-1 - the lazy wiring in analytics.ts: nothing is loaded until after idle, a hot visit then announces itself
 * through the REAL pipeline (GA4 + Meta), and VITE_BUYER_SCORE_DISABLED=1 leaves the old paths exactly as they were.
 */
const originalLocation = window.location;
const w = window as unknown as { gtag?: unknown; fbq?: unknown; requestIdleCallback?: unknown };
let gtagCalls: unknown[][];
let fbqCalls: unknown[][];

function setLocation(pathAndQuery: string): void {
  const url = new URL(pathAndQuery, "https://www.lazytopper.com");
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { href: url.href, origin: url.origin, hostname: url.hostname, pathname: url.pathname, search: url.search, hash: url.hash },
  });
}

async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(5000);
  await vi.dynamicImportSettled();
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(Date.parse("2026-11-20T03:30:00Z"));
  window.localStorage.clear();
  window.sessionStorage.clear();
  gtagCalls = [];
  fbqCalls = [];
  w.gtag = (...a: unknown[]) => void gtagCalls.push(a);
  const fbq = ((...a: unknown[]) => void fbqCalls.push(a)) as ((...a: unknown[]) => void) & { callMethod?: unknown };
  fbq.callMethod = () => undefined;
  w.fbq = fbq;
  delete w.requestIdleCallback;
  setLocation("/packs");
  window.sessionStorage.setItem(
    "lazytopper.visitSource",
    JSON.stringify({ ref: null, utm_source: "google", utm_medium: "cpc", utm_campaign: "search_pdf_packs", utm_content: null, landing: "/packs", gclid: true, fbclid: false }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  delete w.gtag;
  delete w.fbq;
});

describe("analytics.ts -> buyerScore wiring", () => {
  it("a hot visit announces buyer_tier + BuyerTierHot, but only after the idle delay", async () => {
    const a = await import("./analytics");
    a.trackPageview("/packs");
    expect(gtagCalls.some((c) => c[1] === "buyer_tier")).toBe(false);
    expect(window.localStorage.getItem("lazytopper.buyerScore")).toBeNull();
    await flush();
    expect(gtagCalls.filter((c) => c[0] === "event" && c[1] === "buyer_tier")).toHaveLength(1);
    expect(fbqCalls).toContainEqual(["trackCustom", "BuyerTierHot"]);
    expect(window.localStorage.getItem("lazytopper.buyerScore")).not.toBeNull();
  });

  it("uses requestIdleCallback with a timeout when the browser has one", async () => {
    const ric = vi.fn((cb: () => void) => cb());
    w.requestIdleCallback = ric;
    const a = await import("./analytics");
    a.trackPageview("/packs");
    // (other analytics modules also ask for idle time: pick ours by its 4 s timeout)
    const ours = ric.mock.calls.filter((c) => JSON.stringify((c as unknown[])[1]) === JSON.stringify({ timeout: 4000 }));
    expect(ours).toHaveLength(1);
    await vi.dynamicImportSettled();
  });

  it("a pack_view event reaches the tracker", async () => {
    window.sessionStorage.setItem("lazytopper.visitSource", JSON.stringify({ ref: null, utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, landing: "/", gclid: false, fbclid: false }));
    const a = await import("./analytics");
    a.trackNamedEvent("pack_view");
    await flush();
    const stored = JSON.parse(window.localStorage.getItem("lazytopper.buyerScore") as string);
    expect(stored.pack).toBe(true);
  });

  it("VITE_BUYER_SCORE_DISABLED=1: nothing loads, nothing is stored, nothing fires", async () => {
    vi.stubEnv("VITE_BUYER_SCORE_DISABLED", "1");
    const a = await import("./analytics");
    a.trackPageview("/packs");
    a.trackNamedEvent("pack_view");
    await flush();
    expect(window.localStorage.getItem("lazytopper.buyerScore")).toBeNull();
    expect(gtagCalls.some((c) => c[1] === "buyer_tier")).toBe(false);
    expect(fbqCalls.some((c) => String(c[1]).startsWith("BuyerTier"))).toBe(false);
    // the ordinary page view still went to GA4, as before
    expect(gtagCalls.some((c) => c[0] === "event" && c[1] === "page_view")).toBe(true);
  });

  it("no /admin page view is ever counted", async () => {
    setLocation("/admin/students");
    const a = await import("./analytics");
    a.trackPageview("/admin/students");
    await flush();
    expect(window.localStorage.getItem("lazytopper.buyerScore")).toBeNull();
  });

  it("a failed chunk import cannot grow the pre-load queue without bound", async () => {
    vi.doMock("./buyerScore", () => {
      throw new Error("chunk 404");
    });
    const a = await import("./analytics");
    for (let i = 0; i < 120; i++) a.trackPageview("/practice-hub");
    await flush(); // the import fails; the queue keeps only its newest notes
    vi.doUnmock("./buyerScore");
    a.trackPageview("/practice-hub"); // retry now succeeds and drains what was kept
    await flush();
    const stored = JSON.parse(window.localStorage.getItem("lazytopper.buyerScore") as string);
    expect(stored.pv).toBeLessThanOrEqual(51);
    expect(stored.pv).toBeGreaterThan(0);
  });
});
