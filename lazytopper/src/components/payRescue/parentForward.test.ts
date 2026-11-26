/** PARENT-PAY-FIRST-1 - the guest message, URL, price quoting and kill switch. The figure always comes from config. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { boardPassPriceDisplay } from "../../config/pricing";
import { packPriceLabel } from "../../services/packs";
import {
  buildParentForwardMessage,
  forwardProductOf,
  isParentPayFirstDisabled,
  parentForwardUrl,
  quotablePrice,
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

describe("quotablePrice reads config and never quotes a price that changes inside 72 hours", () => {
  it("quotes config's tag when nothing changes for 72 h (after 1 Dec, and early in November)", () => {
    const dec = T("2026-12-05T10:00:00+05:30");
    expect(quotablePrice(PASS, dec)).toBe(boardPassPriceDisplay(dec));
    expect(quotablePrice(PASS, dec)).toContain("+ GST");
    expect(quotablePrice(TS, dec)).toBe(packPriceLabel("test_series", dec));
    expect(quotablePrice(PACK, dec)).toBe(packPriceLabel("pack_chapter", dec));
    const nov = T("2026-11-10T10:00:00+05:30");
    expect(quotablePrice(PASS, nov)).toBe(boardPassPriceDisplay(nov));
  });
  it("leaves the figure out when the price switches before the parent can pay (29-30 Nov)", () => {
    expect(quotablePrice(PASS, T("2026-11-29T22:00:00+05:30"))).toBeNull();
    expect(quotablePrice(TS, T("2026-11-29T22:00:00+05:30"))).toBeNull();
  });
  it("is null for an unknown pack sku", () => {
    expect(quotablePrice({ kind: "pack", sku: "pack_nope", label: "x" }, T("2026-12-05T10:00:00+05:30"))).toBeNull();
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

describe("buildParentForwardMessage", () => {
  const url = "https://x.test/pricing?utm_source=parent_forward";
  it("names the product and price, never promises a single-use link, never says AI / answer key", () => {
    for (const flow of ["attach", "number"] as const) {
      const m = buildParentForwardMessage({ name: "Board Pass", price: "₹2,499 + GST", url, flow });
      expect(m).toContain("Board Pass");
      expect(m).toContain("₹2,499 + GST");
      expect(m).toContain(url);
      expect(m).not.toMatch(/single|once|expires|days|\bAI\b|answer key/i);
    }
    expect(buildParentForwardMessage({ name: "x", price: null, url, flow: "attach" })).toContain("one-time payment");
    expect(buildParentForwardMessage({ name: "x", price: null, url, flow: "attach" })).toMatch(/enter my mobile number/);
  });
  it("forwardProductOf", () => {
    expect([forwardProductOf(PASS), forwardProductOf(PACK), forwardProductOf(TS)]).toEqual(["board_pass", "pack", "test_series"]);
  });
});
