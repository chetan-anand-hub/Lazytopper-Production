import { describe, it, expect } from "vitest";
import { isSafeInternalPath } from "./safeInternalPath";

// UTIL-LEVEL tests for the redirect guard ([FU-SIGNUP-UNSAFE-REDIRECT]). These assert
// isSafeInternalPath's own semantics only — they do NOT prove SignUpPage applies it.
// The call-site wiring (that SignUpPage actually routes an off-site `from` to "/") is
// covered separately in pages/SignUpPage.redirect.test.tsx.
// `resolve` below re-expresses the intended call-site formula purely for readability;
// mutating THIS util (e.g. `return true`) turns the reject cases red.

const resolve = (from: string | null | undefined) => (isSafeInternalPath(from) ? from : "/");

describe("isSafeInternalPath — signup redirect guard", () => {
  it("rejects an absolute off-site URL → resolves to /", () => {
    expect(isSafeInternalPath("https://evil.com")).toBe(false);
    expect(resolve("https://evil.com")).toBe("/");
  });

  it("rejects a protocol-relative URL → resolves to /", () => {
    expect(isSafeInternalPath("//evil.com")).toBe(false);
    expect(resolve("//evil.com")).toBe("/");
  });

  it("passes a legitimate internal path through unchanged", () => {
    expect(isSafeInternalPath("/practice")).toBe(true);
    expect(resolve("/practice")).toBe("/practice");
  });

  it("rejects further hostile shapes (backslash + javascript scheme)", () => {
    expect(isSafeInternalPath("/\\evil.com")).toBe(false);
    expect(isSafeInternalPath("\\evil.com")).toBe(false);
    expect(isSafeInternalPath("javascript:alert(1)")).toBe(false);
    expect(isSafeInternalPath("")).toBe(false);
    expect(isSafeInternalPath(null)).toBe(false);
    expect(isSafeInternalPath(undefined)).toBe(false);
  });
});
