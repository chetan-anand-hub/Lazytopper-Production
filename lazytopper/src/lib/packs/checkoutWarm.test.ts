import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHECKOUT_BUY_ATTR,
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
});

describe("CHECKOUT-FAST-1 - when checkout.js is fetched (intent only on the new pages)", () => {
  beforeEach(() => {
    resetPacksWarmupForTests();
    document.head.innerHTML = "";
  });
  afterEach(() => vi.unstubAllEnvs());
  const withButton = (h: ReturnType<typeof harness>) => {
    const btn = h.doc.createElement("button");
    btn.setAttribute(CHECKOUT_BUY_ATTR, "");
    h.doc.body.appendChild(btn);
    return btn;
  };

  it("intentOnly: NOTHING is scheduled on idle - no requestIdleCallback, no timer, no fetch, however long the page sits", () => {
    const h = harness();
    withButton(h);
    const loadScript = vi.fn(() => Promise.resolve(null));
    const preloadChunks = vi.fn();
    schedulePacksWarmup({ win: h.win, doc: h.doc, preloadChunks, loadScript, intentOnly: true });
    expect(h.idle).toHaveLength(0);
    expect(loadScript).not.toHaveBeenCalled();
    expect(preloadChunks).not.toHaveBeenCalled();
  });

  it("intentOnly: a buy button already in view at load does NOT warm; after the first scroll, a buy button in view does (once); touch then does not repeat it", () => {
    const h = harness();
    const btn = withButton(h);
    const loadScript = vi.fn(() => Promise.resolve(null));
    schedulePacksWarmup({ win: h.win, doc: h.doc, preloadChunks: vi.fn(), loadScript, intentOnly: true });
    expect(h.observed).toHaveLength(0); // nothing observed at load - a visible button is not a reason to fetch
    expect(loadScript).not.toHaveBeenCalled();
    h.listeners.get("scroll")?.();
    expect(h.observed).toEqual([btn]);
    h.intersect(false);
    expect(loadScript).not.toHaveBeenCalled();
    h.intersect(true);
    expect(loadScript).toHaveBeenCalledTimes(1);
    h.doc.dispatchEvent(new Event("touchstart", { bubbles: true }));
    expect(loadScript).toHaveBeenCalledTimes(1);
  });

  it("intentOnly: if no buy button existed at the first scroll, the next scroll looks again", () => {
    const h = harness();
    const loadScript = vi.fn(() => Promise.resolve(null));
    schedulePacksWarmup({ win: h.win, doc: h.doc, preloadChunks: vi.fn(), loadScript, intentOnly: true });
    h.listeners.get("scroll")?.(); // no button yet
    expect(h.observed).toHaveLength(0);
    expect(h.listeners.has("scroll")).toBe(true); // re-armed
    const btn = withButton(h);
    h.listeners.get("scroll")?.();
    expect(h.observed).toEqual([btn]);
    h.intersect(true);
    expect(loadScript).toHaveBeenCalledTimes(1);
  });

  it("intentOnly: the first touch / pointer press warms at once, once", () => {
    const h = harness();
    const loadScript = vi.fn(() => Promise.resolve(null));
    schedulePacksWarmup({ win: h.win, doc: h.doc, preloadChunks: vi.fn(), loadScript, intentOnly: true });
    h.doc.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    h.doc.dispatchEvent(new Event("touchstart", { bubbles: true }));
    expect(loadScript).toHaveBeenCalledTimes(1);
  });

  it("NOT at first paint: before `load` nothing is observed, listened for or fetched", () => {
    const h = harness("loading");
    Object.defineProperty(h.doc, "readyState", { value: "loading", configurable: true });
    withButton(h);
    const loadScript = vi.fn(() => Promise.resolve(null));
    schedulePacksWarmup({ win: h.win, doc: h.doc, preloadChunks: vi.fn(), loadScript, intentOnly: true });
    expect(h.observed).toHaveLength(0);
    h.doc.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(loadScript).not.toHaveBeenCalled();
  });

  it("the default (the /packs and /cbq-packs warm-up) is exactly PACKS-MOBILE-1: idle schedules it, no scroll trigger is armed", () => {
    const h = harness();
    withButton(h);
    const loadScript = vi.fn(() => Promise.resolve(null));
    schedulePacksWarmup({ win: h.win, doc: h.doc, preloadChunks: vi.fn(), loadScript });
    expect(h.listeners.has("scroll")).toBe(false);
    expect(h.idle).toHaveLength(1);
    h.idle[0]();
    expect(loadScript).toHaveBeenCalledTimes(1);
  });

  it("the switch removes the viewport trigger", () => {
    vi.stubEnv("VITE_CHECKOUT_WARM_DISABLED", "1");
    const h = harness();
    withButton(h);
    schedulePacksWarmup({ win: h.win, doc: h.doc, preloadChunks: vi.fn(), loadScript: () => Promise.resolve(null), intentOnly: true });
    expect(h.listeners.has("scroll")).toBe(false);
    expect(h.observed).toHaveLength(0);
  });

  it("separate keys do not block each other", () => {
    const a = harness();
    const b = harness();
    const first = vi.fn(() => Promise.resolve(null));
    const second = vi.fn(() => Promise.resolve(null));
    schedulePacksWarmup({ win: a.win, doc: a.doc, preloadChunks: vi.fn(), loadScript: first, key: "checkout", intentOnly: true });
    schedulePacksWarmup({ win: b.win, doc: b.doc, preloadChunks: vi.fn(), loadScript: second });
    a.doc.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    b.idle[0]();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });
});
