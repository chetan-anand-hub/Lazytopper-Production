/** PARENT-PAY-FIRST-1 - the guest message (never a price), URL and kill switch. */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildParentForwardMessage,
  forwardProductOf,
  isParentPayFirstDisabled,
  parentForwardUrl,
} from "./parentForward";

afterEach(() => vi.unstubAllEnvs());

const PASS = { kind: "pass" as const, sku: "till_boards", label: "Board Pass" };
const PACK = { kind: "pack" as const, sku: "pack_chapter", target: "jemh108", label: "Chapter Pack" };
const TS = { kind: "pack" as const, sku: "test_series", label: "Test Series" };
const T = (iso: string) => Date.parse(iso);

describe("kill switch", () => {
  it("is on only for 1/true/on/yes", () => {
    expect(isParentPayFirstDisabled()).toBe(false);
    for (const v of ["1", "true", "ON", "yes"]) {
      vi.stubEnv("VITE_PARENT_PAY_FIRST_DISABLED", v);
      expect(isParentPayFirstDisabled()).toBe(true);
    }
    vi.stubEnv("VITE_PARENT_PAY_FIRST_DISABLED", "0");
    expect(isParentPayFirstDisabled()).toBe(false);
  });
});

describe("parentForwardUrl", () => {
  it("is tagged utm_source=parent_forward and lands on this product", () => {
    const pass = new URL(parentForwardUrl(PASS, "https://www.lazytopper.com"));
    expect(pass.pathname).toBe("/pricing");
    expect(pass.searchParams.get("utm_source")).toBe("parent_forward");
    expect(pass.searchParams.get("buy")).toBe("board_pass");
    const pack = new URL(parentForwardUrl(PACK, "https://www.lazytopper.com"));
    expect(pack.searchParams.get("buy")).toBe("pack_chapter");
    expect(pack.searchParams.get("t")).toBe("jemh108");
    expect(pack.searchParams.get("utm_source")).toBe("parent_forward");
    const ts = new URL(parentForwardUrl(TS, "https://www.lazytopper.com"));
    expect(ts.pathname).toBe("/test-series");
    expect(ts.searchParams.get("utm_source")).toBe("parent_forward");
  });
  it("respects a non-root base without doubling slashes", () => {
    expect(parentForwardUrl(TS, "https://x.test", "/sub/")).toMatch(/^https:\/\/x\.test\/sub\/test-series\?/);
  });
});

describe("buildParentForwardMessage - the guest message never quotes a price", () => {
  const url = "https://x.test/pricing?utm_source=parent_forward";
  it("names the product, carries the link, never a rupee figure / digits-price, never a single-use promise, never AI / answer key", () => {
    for (const flow of ["attach", "number"] as const) {
      for (const item of [PASS, PACK, TS]) {
        const m = buildParentForwardMessage({ name: item.label, url, flow });
        expect(m).toContain(item.label);
        expect(m).toContain(url);
        expect(m).toContain("one-time payment");
        expect(m.replace(url, "")).not.toMatch(/₹|Rs\.?|INR|\d/);
        expect(m).not.toMatch(/single|once|expires|days|\bAI\b|answer key/i);
      }
    }
    expect(buildParentForwardMessage({ name: "x", url, flow: "attach" })).toMatch(/enter my mobile number/);
  });
  it("the sent text has no price on 26 Nov, 29 Nov, 1 Dec or in 2027 (the message does not depend on the clock)", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      for (const iso of ["2026-11-26T10:00:00+05:30", "2026-11-29T22:00:00+05:30", "2026-12-01T00:30:00+05:30", "2027-01-15T10:00:00+05:30"]) {
        vi.setSystemTime(new Date(iso));
        for (const item of [PASS, PACK, TS]) {
          const text = buildParentForwardMessage({ name: item.label, url: parentForwardUrl(item, "https://www.lazytopper.com"), flow: "attach" });
          expect(text.replace(/https?:\/\/\S+/, "")).not.toMatch(/₹|\d/);
        }
      }
    } finally {
      vi.useRealTimers();
    }
  });
  it("forwardProductOf", () => {
    expect([forwardProductOf(PASS), forwardProductOf(PACK), forwardProductOf(TS)]).toEqual(["board_pass", "pack", "test_series"]);
  });
});
