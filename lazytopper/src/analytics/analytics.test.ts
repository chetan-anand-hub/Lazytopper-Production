import { describe, it, expect } from "vitest";
import { isAutomatedContext, normalisePath } from "./analytics";

/**
 * Guards for the two properties that, if they broke, would break silently: the capture
 * detector and the path redactor. Both are pure functions taking their inputs as
 * arguments precisely so they can be tested without a DOM — a detector you cannot test
 * is a detector you are trusting on faith.
 *
 * ⚠ Every block here carries a CONTROL — a case that must come out the OTHER way. A
 * detector that returns `true` unconditionally would satisfy every "disabled under
 * capture" assertion on its own, and analytics would then be dead in production with a
 * fully green suite.
 */
describe("isAutomatedContext — the capture must not be counted", () => {
  it("is TRUE for the loopback origin the SEO capture serves from", () => {
    // captureStaticBodies.ts:289,698 — server.listen(0, "127.0.0.1")
    expect(isAutomatedContext("127.0.0.1", false)).toBe(true);
    expect(isAutomatedContext("localhost", false)).toBe(true);
    expect(isAutomatedContext("::1", false)).toBe(true);
  });

  it("is TRUE for a driven browser even on a non-loopback host", () => {
    expect(isAutomatedContext("www.lazytopper.com", true)).toBe(true);
  });

  it("★ CONTROL — is FALSE on production, so the detector can actually fail", () => {
    expect(isAutomatedContext("www.lazytopper.com", false)).toBe(false);
  });

  it("★ CONTROL — is FALSE on a Vercel preview, which the acceptance suite runs against", () => {
    // A production-hostname ALLOWLIST would return false here and the acceptance checks
    // would pass while measuring nothing. This asserts we did not write one.
    expect(isAutomatedContext("lazytopper-git-lane-analytics-1.vercel.app", false)).toBe(
      false,
    );
  });
});

describe("normalisePath — no credential and no personal data leaves the page", () => {
  it("★ REDACTS the QR handoff token, which is a live capability credential", () => {
    // App.tsx:1235 — 256-bit, 5-minute, single-use, write-only.
    const token = "a".repeat(64);
    expect(normalisePath(`/u/${token}`)).toBe("/u/:token");
    expect(normalisePath(`/u/${token}`)).not.toContain(token);
  });

  it("drops the query string and hash wholesale", () => {
    expect(normalisePath("/login?oobCode=SECRET&continueUrl=x")).toBe("/login");
    expect(normalisePath("/notes/light#section-2")).toBe("/notes/light");
  });

  it("★ CONTROL — keeps ordinary content paths intact, or it answers nothing", () => {
    // If this redacted too, every row would collapse to one and "which pages" would be
    // unanswerable — the failure mode opposite to the leak above.
    expect(normalisePath("/notes/electricity")).toBe("/notes/electricity");
    expect(normalisePath("/topic-hub/10/science/light")).toBe("/topic-hub/10/science/light");
    expect(normalisePath("/cbse/class-10")).toBe("/cbse/class-10");
  });

  it("collapses a trailing slash so one page is one row", () => {
    expect(normalisePath("/pricing/")).toBe("/pricing");
    expect(normalisePath("/")).toBe("/");
  });

  it("caps length", () => {
    expect(normalisePath(`/topic-hub/${"x".repeat(500)}`).length).toBeLessThanOrEqual(200);
  });
});
