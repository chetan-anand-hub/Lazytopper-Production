import { describe, it, expect, vi, afterEach } from "vitest";

const track = vi.hoisted(() => vi.fn());
vi.mock("../analytics/analytics", () => ({ trackOnboardingEvent: track }));

import { createLoginAbandonTracker, msBucket } from "./loginAbandon";

const DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36";

afterEach(() => {
  track.mockClear();
  vi.restoreAllMocks();
});

function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}
const abandons = () => track.mock.calls.filter((c) => c[0] === "login_abandon");
const steps = () => track.mock.calls.filter((c) => c[0] === "login_step");

describe("msBucket", () => {
  it.each([
    [0, "lt10s"],
    [9_999, "lt10s"],
    [10_000, "10to30s"],
    [29_999, "10to30s"],
    [30_000, "30to120s"],
    [119_999, "30to120s"],
    [120_000, "gt120s"],
    [Number.NaN, "lt10s"],
  ])("%s ms -> %s", (ms, bucket) => expect(msBucket(ms)).toBe(bucket));
});

describe("createLoginAbandonTracker", () => {
  it("reports an open attempt once, with closed-set properties only", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(DESKTOP);
    const c = clock();
    const t = createLoginAbandonTracker(c.now);
    t.start("phone", "phone_entered_number");
    c.advance(4_000);
    t.step("phone_otp_sent");
    c.advance(40_000);
    t.flush("pagehide");
    t.flush("pagehide");
    t.flush("route");
    expect(abandons()).toEqual([
      [
        "login_abandon",
        { method: "phone", step: "phone_otp_sent", ms_since_attempt: "30to120s", ua_class: "desktop", leave: "abandon", trigger: "pagehide" },
      ],
    ]);
  });

  it("an ended attempt (success or error) reports nothing", () => {
    const t = createLoginAbandonTracker();
    t.start("google", "google_popup_open");
    t.end();
    t.flush("pagehide");
    t.start("email", "email_entered");
    t.end();
    t.flush("route");
    expect(abandons()).toHaveLength(0);
  });

  it("no attempt, nothing to report; step() without an attempt is a no-op", () => {
    const t = createLoginAbandonTracker();
    t.step("phone_otp_sent");
    t.flush("pagehide");
    expect(track).not.toHaveBeenCalled();
  });

  it("the Google redirect and the Chrome hand-off are recorded as leave=expected, not abandonment", () => {
    const t = createLoginAbandonTracker();
    t.start("google", "google_redirect_started");
    t.flush("pagehide");
    t.start("chrome_handoff", "chrome_handoff_tapped");
    t.flush("freeze");
    expect(abandons().map((c) => [c[1].method, c[1].step, c[1].leave, c[1].trigger])).toEqual([
      ["google", "google_redirect_started", "expected", "pagehide"],
      ["chrome_handoff", "chrome_handoff_tapped", "expected", "freeze"],
    ]);
  });

  it("login_step: the phone funnel steps, once each per attempt; never for other methods", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(DESKTOP);
    const t = createLoginAbandonTracker();
    t.start("phone", "phone_entered_number");
    t.step("phone_otp_sent");
    t.step("phone_otp_entered");
    t.step("phone_otp_entered"); // a second Verify tap
    t.start("phone", "phone_entered_number"); // a new attempt (Change number, Send again)
    t.step("phone_otp_sent");
    t.start("email", "email_entered");
    t.step("phone_otp_sent");
    expect(steps()).toEqual([
      ["login_step", { method: "phone", step: "phone_otp_sent", ua_class: "desktop" }],
      ["login_step", { method: "phone", step: "phone_otp_entered", ua_class: "desktop" }],
      ["login_step", { method: "phone", step: "phone_otp_sent", ua_class: "desktop" }],
    ]);
  });

  it("install(): pagehide and freeze report; a visibilitychange (SMS app and back) does not", () => {
    const t = createLoginAbandonTracker();
    const remove = t.install(window);
    t.start("phone", "phone_entered_number");
    t.step("phone_otp_sent");
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(abandons()).toHaveLength(0);
    expect(t.isOpen()).toBe(true);
    window.dispatchEvent(new Event("pagehide"));
    expect(abandons()).toHaveLength(1);
    t.start("google", "google_popup_open");
    document.dispatchEvent(new Event("freeze"));
    expect(abandons().map((c) => c[1].trigger)).toEqual(["pagehide", "freeze"]);
    remove();
    t.start("email", "email_entered");
    window.dispatchEvent(new Event("pagehide"));
    expect(abandons()).toHaveLength(2); // removed listeners report nothing
    Reflect.deleteProperty(document, "visibilityState");
  });

  it("every value is a slug the onboarding sender accepts", () => {
    const t = createLoginAbandonTracker();
    t.start("chrome_handoff", "chrome_handoff_tapped");
    t.flush("route");
    for (const v of Object.values(abandons()[0][1] as Record<string, string>)) {
      expect(v).toMatch(/^[a-z0-9][a-z0-9_-]{0,63}$/i);
    }
  });

  it("a failing sender never throws into the page", () => {
    track.mockImplementation(() => {
      throw new Error("analytics down");
    });
    const t = createLoginAbandonTracker();
    t.start("phone", "phone_entered_number");
    expect(() => t.step("phone_otp_sent")).not.toThrow();
    expect(() => t.flush("pagehide")).not.toThrow();
    track.mockReset();
  });
});
