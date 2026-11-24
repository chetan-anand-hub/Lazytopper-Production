// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../analytics/analytics", () => ({ trackOnboardingEvent: vi.fn() }));
vi.mock("./firebaseClient", () => ({ authClient: null }));

import { CHECKOUT_SCRIPT_URL, loadCheckoutScript, preloadCheckoutScript, resetCheckoutScriptForTests, warmCheckoutOnPage } from "./checkout";
import { resetCheckoutTimingForTests } from "./checkoutTiming";
import { resetPacksWarmupForTests } from "../lib/packs/packsMobilePreload";

/**
 * CHECKOUT-FAST-1 part 1 - ONE checkout.js tag, whoever asks first (a warm-up or the tap): idempotent, never twice, a failed load is retried
 * with a fresh tag, and the warm-up itself runs only after load + idle (never at first paint) and only while its kill switch is off.
 */
const tags = () => document.head.querySelectorAll(`script[src="${CHECKOUT_SCRIPT_URL}"]`);
class FakeRazorpay {
  options: unknown;
  constructor(options: unknown) {
    this.options = options;
  }
  open() {}
}

beforeEach(() => {
  resetCheckoutScriptForTests();
  resetCheckoutTimingForTests();
  resetPacksWarmupForTests();
  document.head.innerHTML = "";
  delete (window as unknown as { Razorpay?: unknown }).Razorpay;
});
afterEach(() => {
  vi.unstubAllEnvs();
  delete (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;
});

describe("one checkout.js tag", () => {
  it("a warm-up, then a tap, then another tap -> exactly one <script>, one resolved constructor family", async () => {
    const warm = preloadCheckoutScript();
    const tap1 = loadCheckoutScript();
    const tap2 = loadCheckoutScript();
    expect(tags()).toHaveLength(1);
    (window as unknown as { Razorpay: unknown }).Razorpay = FakeRazorpay;
    tags()[0].dispatchEvent(new Event("load"));
    const [w, a, b] = await Promise.all([warm, tap1, tap2]);
    expect(w).toBe(FakeRazorpay);
    expect(a).toBe(b); // the same instrumented constructor every time
    expect(tags()).toHaveLength(1);
    // already loaded: a later tap adds no tag
    await loadCheckoutScript();
    expect(tags()).toHaveLength(1);
  });

  it("the instrumented constructor builds a REAL instance of the page's Razorpay with the options unchanged in meaning", async () => {
    (window as unknown as { Razorpay: unknown }).Razorpay = FakeRazorpay;
    const Ctor = await loadCheckoutScript();
    const handler = vi.fn();
    const ondismiss = vi.fn();
    const inst = new Ctor({ key: "k", amount: 100, currency: "INR", order_id: "order_1", name: "LazyTopper", description: "d", handler, modal: { ondismiss } } as never) as unknown as FakeRazorpay;
    expect(inst).toBeInstanceOf(FakeRazorpay);
    const opts = inst.options as { key: string; amount: number; order_id: string; handler: (r: unknown) => void; modal: { ondismiss: () => void } };
    expect([opts.key, opts.amount, opts.order_id]).toEqual(["k", 100, "order_1"]);
    opts.handler({ razorpay_payment_id: "pay_1" });
    expect(handler).toHaveBeenCalledWith({ razorpay_payment_id: "pay_1" });
    opts.modal.ondismiss();
    expect(ondismiss).toHaveBeenCalledTimes(1);
  });

  it("a failed load removes its tag and the next call makes a fresh one (it can retry)", async () => {
    const first = preloadCheckoutScript();
    tags()[0].dispatchEvent(new Event("error"));
    await expect(first).rejects.toThrow("failed to load");
    expect(tags()).toHaveLength(0);
    const second = preloadCheckoutScript();
    expect(tags()).toHaveLength(1);
    (window as unknown as { Razorpay: unknown }).Razorpay = FakeRazorpay;
    tags()[0].dispatchEvent(new Event("load"));
    await expect(second).resolves.toBe(FakeRazorpay);
  });

  it("an existing tag (e.g. one the page already has) is reused, not duplicated", () => {
    const pre = document.createElement("script");
    pre.src = CHECKOUT_SCRIPT_URL;
    document.head.appendChild(pre);
    void preloadCheckoutScript();
    expect(tags()).toHaveLength(1);
  });
});

describe("warmCheckoutOnPage (intent only)", () => {
  function stubIdle() {
    const idle: Array<() => void> = [];
    (window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback = (cb) => idle.push(cb);
    Object.defineProperty(document, "readyState", { value: "complete", configurable: true });
    return idle;
  }

  it("payments client flag OFF -> nothing happens, even on a touch", () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "");
    stubIdle();
    warmCheckoutOnPage();
    document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(tags()).toHaveLength(0);
  });

  it("payments ON: NOTHING on idle (no requestIdleCallback is even asked for); the first touch loads checkout.js once; a second call is a no-op", async () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    const idle = stubIdle();
    warmCheckoutOnPage();
    warmCheckoutOnPage();
    await vi.dynamicImportSettled();
    expect(idle).toHaveLength(0);
    expect(tags()).toHaveLength(0); // not at first paint, not on idle
    document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    document.dispatchEvent(new Event("touchstart", { bubbles: true }));
    expect(tags()).toHaveLength(1);
    expect(document.head.querySelector('link[rel="preconnect"][href="https://checkout.razorpay.com"]')).not.toBeNull();
    expect(document.head.querySelector('link[href*="static-next"]')).toBeNull();
  });

  it("VITE_CHECKOUT_WARM_DISABLED=1 -> today's behaviour: a touch loads nothing; the tap still loads it", async () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    vi.stubEnv("VITE_CHECKOUT_WARM_DISABLED", "1");
    stubIdle();
    warmCheckoutOnPage();
    await vi.dynamicImportSettled();
    document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(tags()).toHaveLength(0);
    void loadCheckoutScript(); // the tap still loads it
    expect(tags()).toHaveLength(1);
  });
});
