import { describe, it, expect, vi, afterEach } from "vitest";

const track = vi.hoisted(() => vi.fn());
vi.mock("../analytics/analytics", () => ({ trackOnboardingEvent: track }));

import {
  describeAuthError,
  GOOGLE_POPUP_TIMEOUT_CODE,
  GOOGLE_POPUP_TIMEOUT_MS,
  GOOGLE_TIMEOUT_MESSAGE,
  POPUP_BLOCKED_MESSAGE,
  POPUP_CLOSED_MESSAGE,
  telemetryErrorCode,
  trackLoginAttempt,
  trackLoginError,
  trackLoginSuccess,
  UNSUPPORTED_ENVIRONMENT_MESSAGE,
  withTimeout,
} from "./authSignal";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  track.mockClear();
});

describe("describeAuthError", () => {
  const cases: Array<[string, string]> = [
    ["auth/popup-closed-by-user", POPUP_CLOSED_MESSAGE],
    ["auth/cancelled-popup-request", ""],
    ["auth/popup-blocked", POPUP_BLOCKED_MESSAGE],
    ["auth/operation-not-supported-in-this-environment", UNSUPPORTED_ENVIRONMENT_MESSAGE],
    ["auth/web-storage-unsupported", UNSUPPORTED_ENVIRONMENT_MESSAGE],
    [GOOGLE_POPUP_TIMEOUT_CODE, GOOGLE_TIMEOUT_MESSAGE],
    ["auth/network-request-failed", "Network error. Check your connection and try again."],
    ["auth/invalid-credential", "Incorrect email or password."],
    ["auth/something-new", "Sign-in failed. Please try again."],
  ];
  it.each(cases)("%s", (code, message) => {
    expect(describeAuthError({ code })).toBe(message);
  });
  it("never returns an empty message for a Google popup failure (cancelled-popup-request is deliberately silent)", () => {
    for (const code of ["auth/popup-closed-by-user", "auth/popup-blocked"]) {
      expect(describeAuthError({ code })).not.toBe("");
    }
  });
  it("the Google failure messages point at the other ways in", () => {
    for (const m of [POPUP_CLOSED_MESSAGE, POPUP_BLOCKED_MESSAGE, UNSUPPORTED_ENVIRONMENT_MESSAGE, GOOGLE_TIMEOUT_MESSAGE]) {
      expect(m).toContain("phone number or email");
    }
  });
  it("copes with non-error values", () => {
    expect(describeAuthError(null)).toBe("Sign-in failed. Please try again.");
    expect(describeAuthError("boom")).toBe("Sign-in failed. Please try again.");
  });
});

describe("telemetryErrorCode", () => {
  const cases: Array<[unknown, string]> = [
    [{ code: "auth/popup-blocked" }, "popup-blocked"],
    [{ code: "auth/operation-not-supported-in-this-environment" }, "operation-not-supported-in-this-environment"],
    [{ code: GOOGLE_POPUP_TIMEOUT_CODE }, "popup-timeout"],
    [{ code: "" }, "unknown"],
    [new Error("a@b.com"), "unknown"],
    [null, "unknown"],
    [{ code: "weird code with spaces/and@symbols" }, "weird-code-with-spaces-and-symbols"],
  ];
  it.each(cases)("%j -> %s", (err, expected) => {
    expect(telemetryErrorCode(err)).toBe(expected);
  });
  it("is always a slug the analytics sender accepts", () => {
    expect(telemetryErrorCode({ code: "x".repeat(200) })).toMatch(/^[a-z0-9][a-z0-9_-]{0,63}$/i);
  });
});

describe("withTimeout", () => {
  it("passes a value through and clears its timer", async () => {
    vi.useFakeTimers();
    await expect(withTimeout(Promise.resolve(7), GOOGLE_POPUP_TIMEOUT_MS)).resolves.toBe(7);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("passes a rejection through unchanged", async () => {
    vi.useFakeTimers();
    const err = { code: "auth/popup-blocked" };
    await expect(withTimeout(Promise.reject(err), GOOGLE_POPUP_TIMEOUT_MS)).rejects.toBe(err);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("rejects with the timeout code after 45 s of silence, and a late settle is harmless", async () => {
    vi.useFakeTimers();
    let release: (v: number) => void = () => {};
    const slow = new Promise<number>((res) => {
      release = res;
    });
    const guarded = withTimeout(slow, GOOGLE_POPUP_TIMEOUT_MS);
    const assertion = expect(guarded).rejects.toMatchObject({ code: GOOGLE_POPUP_TIMEOUT_CODE });
    await vi.advanceTimersByTimeAsync(GOOGLE_POPUP_TIMEOUT_MS - 1);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    release(1);
    await Promise.resolve();
  });
  it("is about 45 seconds", () => {
    expect(GOOGLE_POPUP_TIMEOUT_MS).toBe(45_000);
  });
});

describe("login telemetry", () => {
  it("sends method and ua_class only, and error_code on errors", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Linux; Android 13; SM-S901B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36 com.google.android.youtube/19.12.35",
    );
    trackLoginAttempt("google");
    trackLoginSuccess("phone");
    trackLoginError("google", { code: "auth/popup-blocked", message: "someone@example.com" });
    expect(track.mock.calls).toEqual([
      ["login_attempt", { method: "google", ua_class: "inapp_youtube" }],
      ["login_success", { method: "phone", ua_class: "inapp_youtube" }],
      ["login_error", { method: "google", ua_class: "inapp_youtube", error_code: "popup-blocked" }],
    ]);
  });
  it("GOOGLE-REDIRECT-1: a Google flow rides along as `flow` when given; nothing else changes", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    );
    track.mockClear();
    trackLoginAttempt("google", "redirect");
    trackLoginSuccess("google", "popup");
    trackLoginError("google", { code: "auth/network-request-failed" }, "redirect");
    trackLoginAttempt("email");
    expect(track.mock.calls).toEqual([
      ["login_attempt", { method: "google", ua_class: "desktop", flow: "redirect" }],
      ["login_success", { method: "google", ua_class: "desktop", flow: "popup" }],
      ["login_error", { method: "google", ua_class: "desktop", error_code: "network-request-failed", flow: "redirect" }],
      ["login_attempt", { method: "email", ua_class: "desktop" }],
    ]);
  });
  it("a failing sender never throws into the sign-in", () => {
    track.mockImplementationOnce(() => {
      throw new Error("analytics down");
    });
    expect(() => trackLoginAttempt("email")).not.toThrow();
  });
});

describe("GOOGLE-REDIRECT-1 · redirect-no-result", () => {
  it("has its own slug, message and the phone rescue", async () => {
    const m = await import("./authSignal");
    const err = { code: m.GOOGLE_REDIRECT_NO_RESULT_CODE };
    expect(m.telemetryErrorCode(err)).toBe("redirect-no-result");
    expect(m.describeAuthError(err)).toBe(m.GOOGLE_REDIRECT_NO_RESULT_MESSAGE);
    expect(m.shouldRescueToPhone(err)).toBe(true);
  });
});
