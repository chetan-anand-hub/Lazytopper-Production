import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHECKOUT_BUY_ATTR,
  RAZORPAY_STATIC_ORIGIN,
  addRazorpayHints,
  addStaticOriginHint,
  isCheckoutWarmDisabled,
  isCheckoutWarmPath,
  isPacksWarmupPath,
  resetPacksWarmupForTests,
  schedulePacksWarmup,
} from "./packsMobilePreload";

/**
 * CHECKOUT-FAST-1 part 1 - the warm-up now covers every page that opens Razorpay, opens static-next too, and starts on the first buy
 * button entering the viewport (or idle / touch, whichever is first) - never at first paint, once, with ONE kill switch.
 */
function harness(readyState: DocumentReadyState = "complete") {
  const listeners = new Map<string, () => void>();
  const idle: Array<() => void> = [];
  let ioCallback: ((entries: Array<{ isIntersecting: boolean }>) => void) | null = null;
  const observed: Element[] = [];
  class FakeIO {
    constructor(cb: (entries: Array<{ isIntersecting: boolean }>) => void) {
      ioCallback = cb;
    }
    observe(el: Element) {
      observed.push(el);
    }
    disconnect() {
      ioCallback = null;
    }
  }
  const win = {
    addEventListener: (t: string, cb: () => void) => listeners.set(t, cb),
    removeEventListener: (t: string) => listeners.delete(t),
    requestIdleCallback: (cb: () => void) => idle.push(cb),
    cancelIdleCallback: vi.fn(),
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
    IntersectionObserver: FakeIO,
  } as unknown as Parameters<typeof schedulePacksWarmup>[0]["win"];
  const doc = document.implementation.createHTMLDocument("t");
  Object.defineProperty(doc, "readyState", { value: readyState, configurable: true });
  return { win, doc, listeners, idle, observed, intersect: (v: boolean) => ioCallback?.([{ isIntersecting: v }]) };
}

describe("CHECKOUT-FAST-1 - which pages warm checkout", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("/test-series, /board-pass and /for-parents join /packs and /cbq-packs", () => {
    for (const p of ["/test-series", "/board-pass", "/for-parents", "/packs", "/cbq-packs", "/test-series/"]) expect(isCheckoutWarmPath(p)).toBe(true);
    for (const p of ["/", "/practice", "/pricing", "/check-improve"]) expect(isCheckoutWarmPath(p)).toBe(false);
    // PacksShop's own module-level warm-up keeps its PACKS-MOBILE-1 contract: only the two packs pages.
    expect(isPacksWarmupPath("/test-series")).toBe(false);
  });

  it("VITE_CHECKOUT_WARM_DISABLED=1: the new pages stand down, /packs and /cbq-packs keep today's warm-up", () => {
    vi.stubEnv("VITE_CHECKOUT_WARM_DISABLED", "1");
    expect(isCheckoutWarmDisabled()).toBe(true);
    for (const p of ["/test-series", "/board-pass", "/for-parents"]) expect(isCheckoutWarmPath(p)).toBe(false);
    for (const p of ["/packs", "/cbq-packs"]) expect(isCheckoutWarmPath(p)).toBe(true);
  });

  it("static-next.razorpay.com gets its own preconnect + dns-prefetch, once; the three PACKS-MOBILE-1 origins are untouched; off with the switch", () => {
    document.head.innerHTML = "";
    expect(addRazorpayHints(document)).toHaveLength(6);
    expect(addStaticOriginHint(document)).toHaveLength(2);
    expect(addStaticOriginHint(document)).toHaveLength(0);
    expect(document.head.querySelector(`link[rel="preconnect"][href="${RAZORPAY_STATIC_ORIGIN}"]`)).not.toBeNull();
    expect(document.head.querySelector(`link[rel="dns-prefetch"][href="${RAZORPAY_STATIC_ORIGIN}"]`)).not.toBeNull();
    document.head.innerHTML = "";
    vi.stubEnv("VITE_CHECKOUT_WARM_DISABLED", "1");
    expect(addStaticOriginHint(document)).toHaveLength(0);
    expect(document.head.querySelectorAll("link")).toHaveLength(0);
  });

  it("a warm-up asked for the static hint adds it WITH the others, on idle - never before load", () => {
    resetPacksWarmupForTests();
    const h = harness();
    schedulePacksWarmup({ win: h.win, doc: h.doc, preloadChunks: vi.fn(), loadScript: () => Promise.resolve(null), staticHint: true });
    expect(h.doc.head.querySelectorAll("link")).toHaveLength(0);
    h.idle[0]();
    expect(h.doc.head.querySelector(`link[rel="preconnect"][href="${RAZORPAY_STATIC_ORIGIN}"]`)).not.toBeNull();
    expect(h.doc.head.querySelector('link[rel="preconnect"][href="https://api.razorpay.com"]')).not.toBeNull();
  });
});

describe("CHECKOUT-FAST-1 - when checkout.js is fetched", () => {
  beforeEach(() => {
    resetPacksWarmupForTests();
    document.head.innerHTML = "";
  });
  afterEach(() => vi.unstubAllEnvs());

  it("the first buy button scrolling into view warms at once (before idle); idle afterwards does not repeat it", () => {
    const h = harness();
    const btn = h.doc.createElement("button");
    btn.setAttribute(CHECKOUT_BUY_ATTR, "");
    h.doc.body.appendChild(btn);
    const loadScript = vi.fn(() => Promise.resolve(null));
    const preloadChunks = vi.fn();
    schedulePacksWarmup({ win: h.win, doc: h.doc, preloadChunks, loadScript });
    expect(h.observed).toEqual([btn]);
    expect(loadScript).not.toHaveBeenCalled();
    h.intersect(false);
    expect(loadScript).not.toHaveBeenCalled(); // off-screen: not yet
    h.intersect(true);
    expect(loadScript).toHaveBeenCalledTimes(1);
    expect(preloadChunks).toHaveBeenCalledTimes(1);
    h.idle[0]();
    expect(loadScript).toHaveBeenCalledTimes(1);
  });

  it("NOT at first paint: before `load` nothing is observed, scheduled or fetched", () => {
    const h = harness("loading");
    Object.defineProperty(h.doc, "readyState", { value: "loading", configurable: true });
    const btn = h.doc.createElement("button");
    btn.setAttribute(CHECKOUT_BUY_ATTR, "");
    h.doc.body.appendChild(btn);
    const loadScript = vi.fn(() => Promise.resolve(null));
    schedulePacksWarmup({ win: h.win, doc: h.doc, preloadChunks: vi.fn(), loadScript });
    expect(h.observed).toHaveLength(0);
    expect(h.idle).toHaveLength(0);
    expect(loadScript).not.toHaveBeenCalled();
    expect(h.doc.head.querySelectorAll("link")).toHaveLength(0);
  });

  it("the switch removes the viewport trigger (idle / touch still work, as PACKS-MOBILE-1)", () => {
    vi.stubEnv("VITE_CHECKOUT_WARM_DISABLED", "1");
    const h = harness();
    const btn = h.doc.createElement("button");
    btn.setAttribute(CHECKOUT_BUY_ATTR, "");
    h.doc.body.appendChild(btn);
    const loadScript = vi.fn(() => Promise.resolve(null));
    schedulePacksWarmup({ win: h.win, doc: h.doc, preloadChunks: vi.fn(), loadScript });
    expect(h.observed).toHaveLength(0);
    h.idle[0]();
    expect(loadScript).toHaveBeenCalledTimes(1);
  });

  it("separate keys do not block each other (a page with no chunks to fetch must not use up PacksShop's warm-up)", () => {
    const a = harness();
    const b = harness();
    const first = vi.fn(() => Promise.resolve(null));
    const second = vi.fn(() => Promise.resolve(null));
    schedulePacksWarmup({ win: a.win, doc: a.doc, preloadChunks: vi.fn(), loadScript: first, key: "checkout" });
    schedulePacksWarmup({ win: b.win, doc: b.doc, preloadChunks: vi.fn(), loadScript: second });
    a.idle[0]();
    b.idle[0]();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("the idle timeout is the caller's (default 1500 ms for packs, longer for the other pages)", () => {
    const seen: Array<number | undefined> = [];
    const h = harness();
    (h.win as unknown as { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback = (_cb, o) => {
      seen.push(o?.timeout);
      return 1;
    };
    schedulePacksWarmup({ win: h.win, doc: h.doc, preloadChunks: vi.fn(), loadScript: () => Promise.resolve(null), key: "checkout", idleTimeoutMs: 3000 });
    expect(seen).toEqual([3000]);
  });
});
