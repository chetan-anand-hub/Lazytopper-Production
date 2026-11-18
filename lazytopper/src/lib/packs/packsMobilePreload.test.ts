import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RAZORPAY_PRECONNECT_ORIGINS,
  addRazorpayHints,
  isPacksWarmupPath,
  resetPacksWarmupForTests,
  schedulePacksWarmup,
} from "./packsMobilePreload";

/** PACKS-MOBILE-1 - the Buy path is warmed AFTER load + idle (or at the first touch), never before, once, and a kill switch turns it off. */
function fakeWin(readyState: DocumentReadyState) {
  const listeners = new Map<string, () => void>();
  const idle: Array<() => void> = [];
  const win = {
    addEventListener: (t: string, cb: () => void) => listeners.set(t, cb),
    removeEventListener: (t: string) => listeners.delete(t),
    requestIdleCallback: (cb: () => void) => idle.push(cb),
    cancelIdleCallback: vi.fn(),
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
  } as unknown as Parameters<typeof schedulePacksWarmup>[0]["win"];
  return { win, listeners, idle, setReady: (_: DocumentReadyState) => undefined, readyState };
}

describe("packs mobile preload", () => {
  beforeEach(() => {
    resetPacksWarmupForTests();
    document.head.innerHTML = "";
  });
  afterEach(() => vi.unstubAllEnvs());

  it("nothing is fetched before `load`, then chunks + hints + checkout.js come on idle", () => {
    const f = fakeWin("loading");
    const doc = document.implementation.createHTMLDocument("t");
    Object.defineProperty(doc, "readyState", { value: "loading", configurable: true });
    const preloadChunks = vi.fn();
    const loadScript = vi.fn(() => Promise.resolve(null));
    schedulePacksWarmup({ win: f.win, doc, preloadChunks, loadScript });
    expect(preloadChunks).not.toHaveBeenCalled();
    expect(loadScript).not.toHaveBeenCalled();
    expect(f.idle).toHaveLength(0);
    expect(doc.head.querySelectorAll("link")).toHaveLength(0);
    f.listeners.get("load")!();
    expect(f.idle).toHaveLength(1);
    expect(preloadChunks).not.toHaveBeenCalled(); // still waiting for idle
    f.idle[0]();
    expect(preloadChunks).toHaveBeenCalledTimes(1);
    expect(loadScript).toHaveBeenCalledTimes(1);
    expect(doc.head.querySelectorAll('link[rel="preconnect"]')).toHaveLength(RAZORPAY_PRECONNECT_ORIGINS.length);
  });

  it("a touch after load warms at once (before idle), and idle afterwards does not repeat it", () => {
    const f = fakeWin("complete");
    const doc = document.implementation.createHTMLDocument("t");
    Object.defineProperty(doc, "readyState", { value: "complete", configurable: true });
    const preloadChunks = vi.fn();
    const loadScript = vi.fn(() => Promise.resolve(null));
    schedulePacksWarmup({ win: f.win, doc, preloadChunks, loadScript });
    doc.dispatchEvent(new Event("touchstart", { bubbles: true }));
    expect(preloadChunks).toHaveBeenCalledTimes(1);
    expect(loadScript).toHaveBeenCalledTimes(1);
    f.idle[0]();
    expect(preloadChunks).toHaveBeenCalledTimes(1);
    expect(loadScript).toHaveBeenCalledTimes(1);
  });

  it("a touch BEFORE load does nothing (the listeners attach after load)", () => {
    const f = fakeWin("loading");
    const doc = document.implementation.createHTMLDocument("t");
    Object.defineProperty(doc, "readyState", { value: "loading", configurable: true });
    const preloadChunks = vi.fn();
    schedulePacksWarmup({ win: f.win, doc, preloadChunks, loadScript: () => Promise.resolve(null) });
    doc.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(preloadChunks).not.toHaveBeenCalled();
  });

  it("schedules once per page load; a rejected script load is swallowed", async () => {
    const f = fakeWin("complete");
    const doc = document.implementation.createHTMLDocument("t");
    Object.defineProperty(doc, "readyState", { value: "complete", configurable: true });
    const loadScript = vi.fn(() => Promise.reject(new Error("offline")));
    schedulePacksWarmup({ win: f.win, doc, preloadChunks: vi.fn(), loadScript });
    schedulePacksWarmup({ win: f.win, doc, preloadChunks: vi.fn(), loadScript });
    expect(f.idle).toHaveLength(1);
    f.idle[0]();
    await Promise.resolve();
    expect(loadScript).toHaveBeenCalledTimes(1);
  });

  it("kill switch VITE_PACKS_MOBILE_PRELOAD_DISABLED=1: nothing is scheduled", () => {
    vi.stubEnv("VITE_PACKS_MOBILE_PRELOAD_DISABLED", "1");
    const f = fakeWin("complete");
    const doc = document.implementation.createHTMLDocument("t");
    Object.defineProperty(doc, "readyState", { value: "complete", configurable: true });
    const preloadChunks = vi.fn();
    const loadScript = vi.fn(() => Promise.resolve(null));
    schedulePacksWarmup({ win: f.win, doc, preloadChunks, loadScript });
    expect(f.idle).toHaveLength(0);
    doc.dispatchEvent(new Event("touchstart", { bubbles: true }));
    expect(preloadChunks).not.toHaveBeenCalled();
    expect(loadScript).not.toHaveBeenCalled();
  });

  it("preconnect + dns-prefetch for the three Razorpay origins, once each", () => {
    const first = addRazorpayHints(document);
    expect(first).toHaveLength(RAZORPAY_PRECONNECT_ORIGINS.length * 2);
    expect(addRazorpayHints(document)).toHaveLength(0);
    for (const origin of ["https://checkout.razorpay.com", "https://api.razorpay.com"]) {
      expect(document.head.querySelector(`link[rel="preconnect"][href="${origin}"]`)).not.toBeNull();
      expect(document.head.querySelector(`link[rel="dns-prefetch"][href="${origin}"]`)).not.toBeNull();
    }
  });

  it("only /packs and /cbq-packs are warmed", () => {
    expect(isPacksWarmupPath("/packs")).toBe(true);
    expect(isPacksWarmupPath("/packs/")).toBe(true);
    expect(isPacksWarmupPath("/cbq-packs")).toBe(true);
    for (const p of ["/pricing", "/board-pass", "/", "/packs-x"]) expect(isPacksWarmupPath(p)).toBe(false);
  });
});
