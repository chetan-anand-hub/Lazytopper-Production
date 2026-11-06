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
  codelessErrorSlug,
  describePhoneError,
  isGoogleCancel,
  shouldRescueToPhone,
  PHONE_CODE_EXPIRED_MESSAGE,
  PHONE_GENERIC_MESSAGE,
  PHONE_HUMAN_CHECK_MESSAGE,
  PHONE_NO_CODE_REQUESTED_MESSAGE,
  PHONE_SMS_LIMIT_MESSAGE,
  PHONE_TOO_MANY_MESSAGE,
  PHONE_WRONG_CODE_MESSAGE,
  OTP_NOT_REQUESTED_CODE,
  RECAPTCHA_NOT_READY_CODE,
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
    [null, "no-error-value"], // LOGIN-FIX-1 — was "unknown"
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

describe("LOGIN-FIX-1 · errors with no Firebase code get a fixed slug, never their message", () => {
  const cases: Array<[unknown, string]> = [
    [new Error("reCAPTCHA has already been rendered in this element"), "recaptcha-already-rendered"],
    [new Error("reCAPTCHA client element has been removed: 0"), "recaptcha-element-removed"],
    [{ code: RECAPTCHA_NOT_READY_CODE }, "recaptcha-not-ready"],
    [{ code: OTP_NOT_REQUESTED_CODE }, "otp-not-requested"],
    [new Error("Unable to load external scripts"), "script-load-failed"],
    [new Error("Firebase Auth is not configured"), "auth-not-configured"],
    ["Timeout", "timeout"],
    [new Error("recaptcha Enterprise site key undefined"), "recaptcha-other"],
    [undefined, "no-error-value"],
    [42, "non-error-value"],
    [new Error("+919876543210"), "unknown"],
  ];
  it.each(cases)("%j -> %s", (err, expected) => {
    expect(telemetryErrorCode(err)).toBe(expected);
    expect(telemetryErrorCode(err)).toMatch(/^[a-z0-9][a-z0-9_-]{0,63}$/i);
  });
  it("a real Firebase code is still sent as-is (minus auth/)", () => {
    expect(telemetryErrorCode({ code: "auth/invalid-verification-code" })).toBe("invalid-verification-code");
    expect(telemetryErrorCode({ code: "auth/captcha-check-failed" })).toBe("captcha-check-failed");
  });
  it("codelessErrorSlug never echoes the message", () => {
    expect(codelessErrorSlug(new Error("someone@example.com 9876543210"))).toBe("unknown");
  });
});

describe("LOGIN-FIX-1 · phone telemetry carries the step", () => {
  it("phone errors get step; google / email never do", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    );
    track.mockClear();
    trackLoginError("phone", { code: "auth/invalid-verification-code" }, undefined, "verify");
    trackLoginError("phone", new Error("reCAPTCHA has already been rendered in this element"), undefined, "send");
    trackLoginError("email", { code: "auth/invalid-credential" }, undefined, "send");
    expect(track.mock.calls).toEqual([
      ["login_error", { method: "phone", ua_class: "desktop", error_code: "invalid-verification-code", step: "verify" }],
      ["login_error", { method: "phone", ua_class: "desktop", error_code: "recaptcha-already-rendered", step: "send" }],
      ["login_error", { method: "email", ua_class: "desktop", error_code: "invalid-credential" }],
    ]);
  });
});

describe("LOGIN-FIX-1 · phone messages in a student's words", () => {
  const cases: Array<[unknown, string]> = [
    [{ code: "auth/invalid-verification-code" }, PHONE_WRONG_CODE_MESSAGE],
    [{ code: "auth/code-expired" }, PHONE_CODE_EXPIRED_MESSAGE],
    [{ code: "auth/too-many-requests" }, PHONE_TOO_MANY_MESSAGE],
    [{ code: "auth/quota-exceeded" }, PHONE_SMS_LIMIT_MESSAGE],
    [{ code: "auth/captcha-check-failed" }, PHONE_HUMAN_CHECK_MESSAGE],
    [{ code: "auth/invalid-app-credential" }, PHONE_HUMAN_CHECK_MESSAGE],
    [{ code: "auth/internal-error" }, PHONE_HUMAN_CHECK_MESSAGE],
    [{ code: RECAPTCHA_NOT_READY_CODE }, PHONE_HUMAN_CHECK_MESSAGE],
    [new Error("reCAPTCHA has already been rendered in this element"), PHONE_HUMAN_CHECK_MESSAGE],
    [{ code: OTP_NOT_REQUESTED_CODE }, PHONE_NO_CODE_REQUESTED_MESSAGE],
    [{ code: "auth/invalid-phone-number" }, "Enter a valid 10-digit mobile number."],
    [{ code: "auth/network-request-failed" }, "Network error. Check your connection and try again."],
    [{ code: "auth/something-new" }, PHONE_GENERIC_MESSAGE],
    [null, PHONE_GENERIC_MESSAGE],
  ];
  it.each(cases)("%j", (err, message) => {
    expect(describePhoneError(err)).toBe(message);
  });
});

describe("LOGIN-FIX-1 · closing the Google window is a cancel", () => {
  it("isGoogleCancel is popup-closed-by-user only, and it no longer forces the phone step", () => {
    expect(isGoogleCancel({ code: "auth/popup-closed-by-user" })).toBe(true);
    expect(isGoogleCancel({ code: "auth/popup-blocked" })).toBe(false);
    expect(isGoogleCancel({ code: "auth/cancelled-popup-request" })).toBe(false);
    expect(shouldRescueToPhone({ code: "auth/popup-closed-by-user" })).toBe(false);
    expect(shouldRescueToPhone({ code: "auth/popup-blocked" })).toBe(true);
  });
});
