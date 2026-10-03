import { describe, it, expect } from "vitest";
import { ga4PageLocation, isAutomatedContext, normalisePath } from "./analytics";

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

/**
 * FRICTION-FIX-1 · F6 — personal data in a path segment. Mutations this block turns RED:
 * drop the `@` rule (the email cases); drop the 20+ rule (the uid cases); drop the slug
 * carve-out (the long-chapter control).
 */
describe("normalisePath — F6: an email or an opaque id in a segment never leaves the page", () => {
  const UID = "aB3dE5gH7jK9mN1pQ3sT5vX7yZ9b"; // 28 chars, the shape of a Firebase uid

  it("the fixture really is a 28-character uid shape", () => {
    expect(UID).toHaveLength(28);
    expect(UID).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("★ /admin/students/<28-char uid> -> /admin/students/:id", () => {
    expect(normalisePath(`/admin/students/${UID}`)).toBe("/admin/students/:id");
    expect(normalisePath(`/admin/students/${UID}/`)).toBe("/admin/students/:id");
    expect(normalisePath(`/admin/students/${UID}?tab=feed#x`)).toBe("/admin/students/:id");
  });

  it("any 20+ character [A-Za-z0-9_-] id segment -> :id, wherever it sits", () => {
    expect(normalisePath(`/${UID}`)).toBe("/:id");
    expect(normalisePath(`/x/${UID}/y`)).toBe("/x/:id/y");
    expect(normalisePath("/s/Ab_Cd-Ef_Gh-Ij_Kl-Mn01")).toBe("/s/:id"); // 20 chars, _ and -
  });

  it("the boundary: 19 characters is kept, 20 is redacted", () => {
    const nineteen = "Ab1Cd2Ef3Gh4Ij5Kl6M";
    const twenty = `${nineteen}n`;
    expect(nineteen).toHaveLength(19);
    expect(twenty).toHaveLength(20);
    expect(normalisePath(`/s/${nineteen}`)).toBe(`/s/${nineteen}`);
    expect(normalisePath(`/s/${twenty}`)).toBe("/s/:id");
  });

  it("★ any segment containing @ -> :email (raw or percent-encoded)", () => {
    expect(normalisePath("/admin/students/student@example.com")).toBe("/admin/students/:email");
    expect(normalisePath("/a@b")).toBe("/:email");
    expect(normalisePath("/admin/students/student%40example.com/feed")).toBe("/admin/students/:email/feed");
  });

  it("/u/:token is unchanged", () => {
    expect(normalisePath(`/u/${"a".repeat(64)}`)).toBe("/u/:token");
    expect(normalisePath(`/u/${UID}`)).toBe("/u/:token");
  });

  it("★ CONTROL — /notes/trigonometry and the long chapter slugs are content, kept as-is", () => {
    expect(normalisePath("/notes/trigonometry")).toBe("/notes/trigonometry");
    // 20+ characters of the same set, but lowercase kebab-case words: content, not an id.
    for (const slug of [
      "areas-related-to-circles",
      "chemical-reactions-and-equations",
      "light-reflection-and-refraction",
      "acids-bases-and-salts",
    ]) {
      expect(slug.length).toBeGreaterThanOrEqual(20);
      expect(normalisePath(`/notes/${slug}`)).toBe(`/notes/${slug}`);
    }
  });

  it("WHERE ELSE — the GA4 page_location is built through the same cleaner", () => {
    const loc = ga4PageLocation(`/admin/students/${UID}`, "?utm_source=x&email=a@b.c", "https://www.example.com", "/app");
    expect(loc).toBe("https://www.example.com/app/admin/students/:id?utm_source=x");
    expect(loc).not.toContain(UID);
  });
});
