import { describe, it, expect } from "vitest";
import { isSafeInternalPath } from "./safeInternalPath";

// Guard applied to /sign-up's post-auth redirect target ([FU-SIGNUP-UNSAFE-REDIRECT]).
// These mirror the resolution at SignUpPage.tsx: `isSafeInternalPath(st.from) ? st.from : "/"`.
// Mutation check: dropping the guard at the call site (returning `st.from || "/"`) makes
// cases 1 and 2 below resolve to the off-site value instead of "/", failing the test.

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
