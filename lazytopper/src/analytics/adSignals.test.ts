import { afterEach, describe, expect, it, vi } from "vitest";
import { adSignalFields, rememberCheckoutAttempt } from "./adSignals";

afterEach(() => {
  document.cookie = "_fbp=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  document.cookie = "_ga_1T8Q12H4RQ=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  document.cookie = "_ga=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  vi.useRealTimers();
  adSignalFields(); // forget any remembered attempt
});

describe("adSignalFields (SERVER-EVENTS-1)", () => {
  it("sends nothing when there are no ad cookies and no attempt", () => {
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
    expect(adSignalFields().adSignals?.attemptId).toBeUndefined();
    rememberCheckoutAttempt("lt_attempt_2");
    vi.advanceTimersByTime(11 * 60 * 1000);
    expect(adSignalFields().adSignals?.attemptId).toBeUndefined();
  });
});
