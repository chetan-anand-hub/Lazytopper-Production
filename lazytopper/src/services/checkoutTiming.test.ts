// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

const track = vi.hoisted(() => vi.fn());
vi.mock("../analytics/analytics", () => ({ trackOnboardingEvent: track }));

import { ATTEMPT_WINDOW_MS, beginCheckoutAttempt, checkoutSurface, instrumentRazorpay, onCheckoutSheetShown, resetCheckoutTimingForTests } from "./checkoutTiming";
import { useCheckoutSlow } from "../hooks/useCheckoutSlow";

/**
 * CHECKOUT-FAST-1 part 4 - checkout_open_ms / checkout_dismissed / checkout_payment_failed / checkout_open_abandoned: each fires once per
 * attempt, with coarse values only (no id, no text, no PII), and the wrapper never changes what the buy flow sees.
 */
type Opts = { handler: (r: unknown) => void; modal: { ondismiss: () => void } };
let autoDisplay = true;
const made: Array<{ opts: Opts; fail: Array<(r: unknown) => void>; opened: number }> = [];
class FakeRazorpay {
  rec = { opts: {} as Opts, fail: [] as Array<(r: unknown) => void>, opened: 0 };
  constructor(opts: Opts) {
    this.rec.opts = opts;
    made.push(this.rec);
  }
  on(event: string, cb: (r: unknown) => void) {
    if (event === "payment.failed") this.rec.fail.push(cb);
  }
  open() {
    this.rec.opened += 1;
    // real Razorpay: open() displays the (already built) container
    const c = document.querySelector<HTMLElement>(".razorpay-container");
    if (c && autoDisplay) c.style.display = "block";
  }
}
const Ctor = () => instrumentRazorpay(FakeRazorpay) as unknown as new (o: Opts) => FakeRazorpay;
const events = () => track.mock.calls.map(([name, data]) => [name, data] as const);
const names = () => track.mock.calls.map(([n]) => n);
/** Real checkout.js builds its container + the ONE iframe at script load (hidden); open() only displays it. This is that order. */
function mountHiddenSheet() {
  const c = document.createElement("div");
  c.className = "razorpay-container";
  c.style.display = "none";
  c.appendChild(document.createElement("iframe")); // already loaded long before any open()
  document.body.appendChild(c);
  return c;
}
/** What Razorpay's open() does to the page. */
const displaySheet = (c: HTMLElement) => {
  c.style.display = "block";
};
/** Time passes while the poll looks for the sheet. */
const tick = (ms = 100) => void vi.advanceTimersByTime(ms);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
  track.mockReset();
  made.length = 0;
  autoDisplay = true;
  resetCheckoutTimingForTests();
  document.body.innerHTML = "";
  mountHiddenSheet();
  window.history.pushState({}, "", "/test-series");
});
afterEach(() => {
  vi.useRealTimers();
});

describe("checkout_open_ms", () => {
  it("tap -> the sheet DISPLAYED (iframe loaded long before open(), as real checkout.js does): ONE event with elapsed tenths of a second, page slug, warm", () => {
    const nowSpy = vi.spyOn(performance, "now");
    nowSpy.mockReturnValue(1000);
    autoDisplay = false; // we flip the container ourselves, later, like a slow phone
    const container = document.querySelector<HTMLElement>(".razorpay-container") as HTMLElement;
    expect(container.style.display).toBe("none"); // built (with its loaded iframe) before the tap
    beginCheckoutAttempt(true); // the tap
    const rz = new (Ctor())({ handler: vi.fn(), modal: { ondismiss: vi.fn() } });
    rz.open();
    expect(rz.rec.opened).toBe(1);
    tick(300);
    expect(track).not.toHaveBeenCalled(); // still hidden: not shown yet
    nowSpy.mockReturnValue(3450);
    displaySheet(container);
    tick();
    tick(1000); // later polls change nothing
    expect(events()).toEqual([["checkout_open_ms", { ds: 25, surface: "test_series", warm: 1 }]]);
    nowSpy.mockRestore();
  });

  it("a cold tap (checkout.js not yet loaded) says warm: 0; an unknown page is 'other'", async () => {
    window.history.pushState({}, "", "/something-else");
    beginCheckoutAttempt(false);
    new (Ctor())({ handler: vi.fn(), modal: { ondismiss: vi.fn() } }).open();
    expect(track).toHaveBeenCalledWith("checkout_open_ms", expect.objectContaining({ surface: "other", warm: 0 }));
    expect(checkoutSurface("/board-pass")).toBe("board_pass");
    expect(checkoutSurface("/for-parents/")).toBe("for_parents");
  });

  it("the container is built only AFTER open() (a different Razorpay version): still caught when it appears displayed", () => {
    document.body.innerHTML = "";
    autoDisplay = false;
    beginCheckoutAttempt(true);
    new (Ctor())({ handler: vi.fn(), modal: { ondismiss: vi.fn() } }).open();
    tick(500);
    expect(track).not.toHaveBeenCalled();
    const c = mountHiddenSheet();
    tick();
    expect(track).not.toHaveBeenCalled(); // present but hidden
    displaySheet(c);
    tick();
    expect(names()).toEqual(["checkout_open_ms"]);
  });

  it("open() that displays the sheet synchronously is caught by the check made right after it", () => {
    beginCheckoutAttempt(true);
    const R = Ctor();
    const rz = new R({ handler: vi.fn(), modal: { ondismiss: vi.fn() } });
    rz.open();
    expect(names()).toEqual(["checkout_open_ms"]); // shown straight away: no poll needed
  });

  it("listeners are told when the sheet shows (the 'Still connecting' line stops)", async () => {
    const told = vi.fn();
    const off = onCheckoutSheetShown(told);
    beginCheckoutAttempt(true);
    new (Ctor())({ handler: vi.fn(), modal: { ondismiss: vi.fn() } }).open();
    expect(told).toHaveBeenCalledTimes(1);
    off();
  });
});

describe("dismissed / failed / abandoned", () => {
  it("checkout_dismissed: once, the caller's ondismiss still runs; a later success does not add a second ending", async () => {
    beginCheckoutAttempt(true);
    const ondismiss = vi.fn();
    const rz = new (Ctor())({ handler: vi.fn(), modal: { ondismiss } });
    rz.open();
    rz.rec.opts.modal.ondismiss();
    rz.rec.opts.modal.ondismiss();
    expect(ondismiss).toHaveBeenCalledTimes(2);
    expect(names().filter((n) => n === "checkout_dismissed")).toHaveLength(1);
    expect(track).toHaveBeenCalledWith("checkout_dismissed", { surface: "test_series", ds: expect.any(Number) });
  });

  it("checkout_payment_failed: Razorpay's error CODE only (lowercased); description / metadata / ids never leave; once per attempt; the caller's own listener still runs", () => {
    beginCheckoutAttempt(true);
    const rz = new (Ctor())({ handler: vi.fn(), modal: { ondismiss: vi.fn() } });
    const mine = vi.fn();
    rz.on("payment.failed", mine);
    rz.open();
    const payload = { error: { code: "BAD_REQUEST_ERROR", description: "Card 4111 1111 1111 1111 declined for a@b.in", reason: "payment_failed", metadata: { order_id: "order_X", payment_id: "pay_X" } } };
    for (const cb of rz.rec.fail) cb(payload);
    for (const cb of rz.rec.fail) cb(payload); // a retry fails again inside the open sheet
    expect(rz.rec.fail).toHaveLength(1); // ONE registration with Razorpay (fan-out)
    expect(mine).toHaveBeenCalledTimes(2);
    expect(events().filter(([n]) => n === "checkout_payment_failed")).toEqual([["checkout_payment_failed", { surface: "test_series", code: "bad_request_error" }]]);
    expect(JSON.stringify(track.mock.calls)).not.toMatch(/4111|a@b\.in|order_X|pay_X|declined/);
  });

  it("an unusable error code is sent as 'unknown', never as text", () => {
    beginCheckoutAttempt(true);
    const rz = new (Ctor())({ handler: vi.fn(), modal: { ondismiss: vi.fn() } });
    rz.open();
    for (const cb of rz.rec.fail) cb({ error: { code: "Card declined: 4111 1111 1111 1111" } });
    expect(track).toHaveBeenCalledWith("checkout_payment_failed", { surface: "test_series", code: "unknown" });
  });

  it("checkout_open_abandoned: the page is hidden before the sheet opened -> ONE event, stage 'order' before Razorpay was built, 'sheet' after open()", () => {
    beginCheckoutAttempt(true);
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    document.dispatchEvent(new Event("visibilitychange"));
    expect(events()).toEqual([["checkout_open_abandoned", { surface: "test_series", ds: 0, stage: "order" }]]);
    track.mockReset();
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    resetCheckoutTimingForTests();
    autoDisplay = false;
    beginCheckoutAttempt(true);
    new (Ctor())({ handler: vi.fn(), modal: { ondismiss: vi.fn() } }).open();
    window.dispatchEvent(new Event("pagehide"));
    expect(events()).toEqual([["checkout_open_abandoned", { surface: "test_series", ds: 0, stage: "sheet" }]]);
  });

  it("leaving AFTER the sheet showed (a UPI app switch) is not an abandonment; nor is leaving long after a failed order", async () => {
    beginCheckoutAttempt(true);
    new (Ctor())({ handler: vi.fn(), modal: { ondismiss: vi.fn() } }).open();
    track.mockReset();
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(track).not.toHaveBeenCalled();
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });

    resetCheckoutTimingForTests();
    const nowSpy = vi.spyOn(performance, "now");
    nowSpy.mockReturnValue(0);
    beginCheckoutAttempt(true);
    nowSpy.mockReturnValue(ATTEMPT_WINDOW_MS + 5_000);
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(track).not.toHaveBeenCalled();
    nowSpy.mockRestore();
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  });

  it("a successful payment ends the attempt silently (no dismissed / abandoned afterwards)", () => {
    beginCheckoutAttempt(true);
    const handler = vi.fn();
    const rz = new (Ctor())({ handler, modal: { ondismiss: vi.fn() } });
    rz.open();
    rz.rec.opts.handler({ razorpay_payment_id: "pay_1", razorpay_order_id: "order_1", razorpay_signature: "sig" });
    rz.rec.opts.modal.ondismiss();
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(track).not.toHaveBeenCalledWith("checkout_dismissed", expect.anything());
    expect(track).not.toHaveBeenCalledWith("checkout_open_abandoned", expect.anything());
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  });

  it("every value sent is a short slug or a small integer (the sender drops anything else)", async () => {
    beginCheckoutAttempt(false);
    const rz = new (Ctor())({ handler: vi.fn(), modal: { ondismiss: vi.fn() } });
    rz.open();
    rz.rec.opts.modal.ondismiss();
    for (const [, data] of track.mock.calls) {
      for (const v of Object.values(data as Record<string, unknown>)) {
        if (typeof v === "string") expect(v).toMatch(/^[a-z0-9_]{1,40}$/);
        else expect(Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 1000).toBe(true);
      }
    }
  });
});

describe("useCheckoutSlow (the second line)", () => {
  it("false at first; true after the threshold; back to false when the sheet shows or the buy ends", () => {
    const { result, rerender } = renderHook(({ on }) => useCheckoutSlow(on, 6000), { initialProps: { on: true } });
    expect(result.current).toBe(false);
    act(() => void vi.advanceTimersByTime(5999));
    expect(result.current).toBe(false);
    act(() => void vi.advanceTimersByTime(2));
    expect(result.current).toBe(true);
    autoDisplay = false;
    beginCheckoutAttempt(true);
    new (Ctor())({ handler: vi.fn(), modal: { ondismiss: vi.fn() } }).open();
    // the sheet is displayed (not an iframe load: that happened at script load): the line goes
    act(() => {
      displaySheet(document.querySelector<HTMLElement>(".razorpay-container") as HTMLElement);
      tick();
    });
    expect(result.current).toBe(false);
    rerender({ on: false });
    expect(result.current).toBe(false);
  });
});
