// TS-UX-SCORE-1 - the Back row on a series paper opened from the Practice-hub chooser, and the chooser's returnTo.
import { describe, expect, it } from "vitest";
import { seriesPaperBackTarget, withReturnTo } from "./seriesNav";
import { SERIES_RULES_START_MS, scorecardUploadNotAllowed } from "./seriesAccess";

describe("seriesPaperBackTarget", () => {
  it("no returnTo: /test-series as today", () => {
    expect(seriesPaperBackTarget("?paper=3")).toEqual({ to: "/test-series", word: "Test Series" });
    expect(seriesPaperBackTarget("")).toEqual({ to: "/test-series", word: "Test Series" });
  });
  it("a safe returnTo to the Practice hub wins", () => {
    expect(seriesPaperBackTarget("?paper=3&returnTo=%2Fpractice-hub")).toEqual({ to: "/practice-hub", word: "Practice" });
  });
  it("an unsafe or foreign returnTo falls back to /test-series", () => {
    for (const bad of ["https://evil.example/x", "//evil.example", "javascript:alert(1)", "/\\evil", "/board-pass", "practice-hub", "/practice-hub-evil"]) {
      expect(seriesPaperBackTarget(`?paper=3&returnTo=${encodeURIComponent(bad)}`)).toEqual({ to: "/test-series", word: "Test Series" });
    }
  });
});

describe("withReturnTo (the chooser's go())", () => {
  it("adds a safe returnTo to a paper URL, keeping its own query", () => {
    expect(withReturnTo("/chapter-test/10/Maths/triangles?series=1&paper=3", "/practice-hub")).toBe("/chapter-test/10/Maths/triangles?series=1&paper=3&returnTo=%2Fpractice-hub");
    expect(withReturnTo("/full-mock/10/Maths?paper=2", "/practice-hub")).toBe("/full-mock/10/Maths?paper=2&returnTo=%2Fpractice-hub");
  });
  it("rejects an unsafe returnTo (the href is returned untouched)", () => {
    for (const bad of ["https://evil.example", "//evil.example", "javascript:x", "/a\\b", "", null, undefined, 5]) {
      expect(withReturnTo("/full-mock/10/Maths?paper=2", bad)).toBe("/full-mock/10/Maths?paper=2");
    }
  });
  it("keeps an existing returnTo", () => {
    expect(withReturnTo("/full-mock/10/Maths?paper=2&returnTo=%2Ffoo", "/practice-hub")).toBe("/full-mock/10/Maths?paper=2&returnTo=%2Ffoo");
  });
});

describe("scorecardUploadNotAllowed (same allow-logic as the paywall)", () => {
  const base = { canCheck: false, createdMs: SERIES_RULES_START_MS + 1000, checking: false, failed: false };
  it("a free paper made under the new rules drops the upload prompt", () => {
    expect(scorecardUploadNotAllowed(base)).toBe(true);
  });
  it("a grandfathered (pre-rules) free paper keeps the upload prompt", () => {
    expect(scorecardUploadNotAllowed({ ...base, createdMs: SERIES_RULES_START_MS - 1000 })).toBe(false);
  });
  it("an account that may check (Board Pass / trial-allowed / series owner) keeps it", () => {
    expect(scorecardUploadNotAllowed({ ...base, canCheck: true })).toBe(false);
  });
  it("unknown created time is not grandfathered; pending or failed reads keep today's prompt", () => {
    expect(scorecardUploadNotAllowed({ ...base, createdMs: NaN })).toBe(true);
    expect(scorecardUploadNotAllowed({ ...base, checking: true })).toBe(false);
    expect(scorecardUploadNotAllowed({ ...base, failed: true })).toBe(false);
  });
});
