import { afterEach, describe, expect, it, vi } from "vitest";
import { adSignalFields, rememberCheckoutAttempt } from "./adSignals";

afterEach(() => {
  document.cookie = "_fbp=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  document.cookie = "_ga_1T8Q12H4RQ=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  document.cookie = "_ga=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  vi.useRealTimers();
  vi.unstubAllEnvs();
  adSignalFields(); // forget any remembered attempt
});

describe("adSignalFields (SERVER-EVENTS-1)", () => {
  it("META-IC-1: with no ad cookies the body still carries ONE fresh attempt id (and the page address); never a cookie id", () => {
    const out = adSignalFields();
    expect(out.adSignals?.attemptId).toMatch(/^lt_/);
    expect(Object.keys(out.adSignals ?? {}).sort()).toEqual(["attemptId", "url"]);
    expect(adSignalFields().adSignals?.attemptId).not.toBe(out.adSignals?.attemptId); // every order-create call is its own attempt
  });

  it("META-IC-1 kill switch: VITE_META_IC_AT_ORDER_DISABLED=1 sends nothing when there are no ad cookies and no attempt (trunk behaviour)", () => {
    vi.stubEnv("VITE_META_IC_AT_ORDER_DISABLED", "1");
    expect(adSignalFields()).toEqual({});
  });

  it("carries the Meta / GA cookies and the page address WITHOUT its query string", () => {
    document.cookie = "_fbp=fb.1.1700000000000.12345678; path=/";
    document.cookie = "_ga=GA1.1.111.222; path=/";
    document.cookie = "_ga_1T8Q12H4RQ=GS1.1.1700000001.5.1; path=/";
    window.history.replaceState({}, "", "/packs?gclid=SECRET&utm_source=x");
    const out = adSignalFields();
    expect(out.adSignals?.fbp).toBe("fb.1.1700000000000.12345678");
    expect(out.adSignals?.ga).toBe("GA1.1.111.222");
    expect(out.adSignals?.gas).toBe("GS1.1.1700000001.5.1");
    expect(out.adSignals?.url).toBe(`${window.location.origin}/packs`);
    expect(JSON.stringify(out)).not.toContain("SECRET");
  });

  it("hands the checkout attempt id out ONCE and only while it is fresh", () => {
    vi.useFakeTimers();
    rememberCheckoutAttempt("lt_attempt_1");
    expect(adSignalFields().adSignals?.attemptId).toBe("lt_attempt_1");
    // META-IC-1: a remembered id is handed out once; the next order-create call is a NEW attempt with its own id
    const next = adSignalFields().adSignals?.attemptId;
    expect(next).toMatch(/^lt_/);
    expect(next).not.toBe("lt_attempt_1");
    rememberCheckoutAttempt("lt_attempt_2");
    vi.advanceTimersByTime(11 * 60 * 1000);
    expect(adSignalFields().adSignals?.attemptId).not.toBe("lt_attempt_2"); // stale: forgotten
    vi.stubEnv("VITE_META_IC_AT_ORDER_DISABLED", "1");
    rememberCheckoutAttempt("lt_attempt_3");
    vi.advanceTimersByTime(11 * 60 * 1000);
    expect(adSignalFields().adSignals?.attemptId).toBeUndefined(); // kill switch: trunk behaviour
  });
});

describe("pack checkout hands its Meta eventID to the order body (SERVER-EVENTS-1)", () => {
  it("META-IC-1 kill switch: trackPackCheckout remembers the attempt id it gives Meta; the next adSignalFields carries it once", async () => {
    vi.stubEnv("VITE_META_IC_AT_ORDER_DISABLED", "1");
    const { trackPackCheckout } = await import("../lib/packs/packAnalytics");
    trackPackCheckout({ sku: "pack_chapter", itemName: "Chapter Pack", valueInr: 49 }, { signedIn: true, attemptId: "lt_attempt_hook_1" });
    expect(adSignalFields().adSignals?.attemptId).toBe("lt_attempt_hook_1");
    expect(adSignalFields().adSignals?.attemptId).toBeUndefined();
  });

  it("META-IC-1: the pack TAP no longer hands its id to the order body (the order-create call mints its own)", async () => {
    const { trackPackCheckout } = await import("../lib/packs/packAnalytics");
    trackPackCheckout({ sku: "pack_chapter", itemName: "Chapter Pack", valueInr: 49 }, { signedIn: true, attemptId: "lt_attempt_hook_2" });
    const id = adSignalFields().adSignals?.attemptId;
    expect(id).toMatch(/^lt_/);
    expect(id).not.toBe("lt_attempt_hook_2");
  });
});
