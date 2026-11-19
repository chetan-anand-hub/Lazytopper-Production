// TS-NAV-1 — the series return-chain rules: detect a series paper, tag the links that leave it, read the tag back, safe redirects, kill switch.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isSafeInternalPath,
  isSeriesPaperLocation,
  seriesBackFromSearch,
  seriesPaperPath,
  tagWhenSeriesPaper,
  withSeriesReturn,
} from "./seriesNav";

afterEach(() => vi.unstubAllEnvs());

describe("isSeriesPaperLocation", () => {
  it("a series chapter test and a series full mock are series papers", () => {
    expect(isSeriesPaperLocation("/chapter-test/10/Maths/real-numbers", "?series=1")).toBe(true);
    expect(isSeriesPaperLocation("/full-mock/10/Science", "?paper=7")).toBe(true);
  });
  it("the ordinary (non-series) chapter test / full mock / other pages are not", () => {
    expect(isSeriesPaperLocation("/chapter-test/10/Maths/real-numbers", "")).toBe(false);
    expect(isSeriesPaperLocation("/full-mock/10/Science", "")).toBe(false);
    expect(isSeriesPaperLocation("/full-mock/10/Science", "?paper=abc")).toBe(false);
    expect(isSeriesPaperLocation("/practice/10/Maths", "?series=1")).toBe(false);
  });
  it("VITE_TS_NAV_DISABLED turns it off", () => {
    vi.stubEnv("VITE_TS_NAV_DISABLED", "1");
    expect(isSeriesPaperLocation("/full-mock/10/Science", "?paper=7")).toBe(false);
  });
});

describe("tagging links that leave a series paper", () => {
  const paper = "/chapter-test/10/Maths/real-numbers?series=1";
  it("adds from=test-series and returnTo, keeping the rest of the query and the hash", () => {
    const out = withSeriesReturn("/packs?buy=test_series#x", paper);
    const u = new URL(out, "https://x.test");
    expect(u.pathname).toBe("/packs");
    expect(u.searchParams.get("buy")).toBe("test_series");
    expect(u.searchParams.get("from")).toBe("test-series");
    expect(u.searchParams.get("returnTo")).toBe(paper);
    expect(u.hash).toBe("#x");
  });
  it("keeps a returnTo the link already names", () => {
    const out = withSeriesReturn("/practice/10/Maths?returnTo=%2Fa%3Freview%3D1", paper);
    expect(new URL(out, "https://x.test").searchParams.get("returnTo")).toBe("/a?review=1");
  });
  it("leaves a non-internal target untouched", () => {
    expect(withSeriesReturn("https://evil.test/x", paper)).toBe("https://evil.test/x");
    expect(withSeriesReturn("//evil.test/x", paper)).toBe("//evil.test/x");
  });
  it("tagWhenSeriesPaper: tags only on a series paper; elsewhere the link is byte-identical", () => {
    expect(tagWhenSeriesPaper("/board-pass", "/chapter-test/10/Maths/real-numbers", "")).toBe("/board-pass");
    expect(tagWhenSeriesPaper("/board-pass", "/practice/10/Maths", "?x=1")).toBe("/board-pass");
    expect(tagWhenSeriesPaper("/board-pass", "/full-mock/10/Maths", "?paper=3&review=R1")).toBe(
      "/board-pass?from=test-series&returnTo=%2Ffull-mock%2F10%2FMaths%3Fpaper%3D3",
    );
  });
  it("the paper's own path drops review / upload", () => {
    expect(seriesPaperPath("/chapter-test/10/Maths/a", "?series=1&review=R&upload=U")).toBe("/chapter-test/10/Maths/a?series=1");
  });
  it("kill switch: nothing is tagged", () => {
    vi.stubEnv("VITE_TS_NAV_DISABLED", "1");
    expect(withSeriesReturn("/board-pass", paper)).toBe("/board-pass");
  });
});

describe("seriesBackFromSearch", () => {
  it("null without from=test-series (a non-series journey)", () => {
    expect(seriesBackFromSearch("")).toBeNull();
    expect(seriesBackFromSearch("?returnTo=%2Fchapter-test%2F10%2FMaths%2Fa%3Fseries%3D1")).toBeNull();
    expect(seriesBackFromSearch("?from=for_parents")).toBeNull();
  });
  it("the paper in returnTo, else /test-series", () => {
    expect(seriesBackFromSearch("?from=test-series&returnTo=%2Ffull-mock%2F10%2FMaths%3Fpaper%3D3")).toEqual({
      to: "/full-mock/10/Maths?paper=3",
      label: "Test paper",
    });
    expect(seriesBackFromSearch("?from=test-series")).toEqual({ to: "/test-series", label: "Test Series" });
  });
  it("rejects an external or off-chain returnTo (falls back to /test-series)", () => {
    for (const bad of ["https://evil.test/", "//evil.test/", "javascript:alert(1)", "/admin/students", "/practice/10/Maths"]) {
      expect(seriesBackFromSearch(`?from=test-series&returnTo=${encodeURIComponent(bad)}`)).toEqual({ to: "/test-series", label: "Test Series" });
    }
  });
  it("kill switch: null", () => {
    vi.stubEnv("VITE_TS_NAV_DISABLED", "1");
    expect(seriesBackFromSearch("?from=test-series")).toBeNull();
  });
});

describe("isSafeInternalPath", () => {
  it("accepts internal paths only", () => {
    expect(isSafeInternalPath("/a?b=1")).toBe(true);
    for (const bad of ["a", "//a", "https://a", "/a\\b", "/a\nb", 5, null]) expect(isSafeInternalPath(bad)).toBe(false);
  });
});
