import { describe, it, expect } from "vitest";
import { parseMarksValue, marksTokenToBucketSet, parseMarksRangeParams } from "./PracticePage";

/**
 * PR-E1 — PracticePage CONSUMES the concept mark band. The HUB path still uses the
 * coarse `marks` bucket param (single bucket or comma SET) — tested below and kept
 * untouched. The CONCEPT-ROW path was switched (amendment) to an EXACT numeric
 * range via marksMin/marksMax (parseMarksRangeParams) so "3–5" yields ONLY 3,4,5
 * with NO 2-mark contamination — tested at the bottom.
 */

describe("parseMarksValue — accepts single bucket OR comma SET (PR-E1)", () => {
  it("passes through 'all' / empty / invalid as 'all'", () => {
    expect(parseMarksValue(null)).toBe("all");
    expect(parseMarksValue("")).toBe("all");
    expect(parseMarksValue("all")).toBe("all");
    expect(parseMarksValue("bogus")).toBe("all");
  });

  it("passes through a single valid bucket", () => {
    expect(parseMarksValue("1")).toBe("1");
    expect(parseMarksValue("23")).toBe("23");
    expect(parseMarksValue("5")).toBe("5");
    expect(parseMarksValue("4")).toBe("4");
  });

  it("canonicalises a comma SET (dedup + canonical order)", () => {
    expect(parseMarksValue("1,23")).toBe("1,23");
    expect(parseMarksValue("23,1")).toBe("1,23"); // re-ordered to canonical
    expect(parseMarksValue("23,5")).toBe("23,5");
    expect(parseMarksValue("1,1,23")).toBe("1,23"); // dedup
  });

  it("drops invalid members from a set, keeping the valid remainder", () => {
    expect(parseMarksValue("1,bogus,23")).toBe("1,23");
    expect(parseMarksValue("bogus,nope")).toBe("all");
  });
});

describe("marksTokenToBucketSet — the active filter buckets", () => {
  it("'all' → empty set (no filtering)", () => {
    expect(marksTokenToBucketSet("all").size).toBe(0);
  });

  it("a single bucket → that one bucket", () => {
    const s = marksTokenToBucketSet("23");
    expect([...s]).toEqual(["23"]);
  });

  it("a comma set → all its buckets (union the band spans)", () => {
    const s = marksTokenToBucketSet("1,23");
    expect(s.has("1")).toBe(true);
    expect(s.has("23")).toBe(true);
    expect(s.has("5")).toBe(false);
  });
});

/**
 * EXACT-RANGE consumer (PR-E1 amendment) — the concept-row path filters on the
 * real numeric `marks` field via parseMarksRangeParams(marksMin, marksMax). This
 * is what kills the coarse-bucket 2/3-mark fusion bug.
 */
describe("parseMarksRangeParams — concept-row exact numeric range", () => {
  it("parses a valid pair into {min,max}", () => {
    expect(parseMarksRangeParams("3", "5")).toEqual({ min: 3, max: 5 });
    expect(parseMarksRangeParams("1", "2")).toEqual({ min: 1, max: 2 });
    expect(parseMarksRangeParams("2", "3")).toEqual({ min: 2, max: 3 });
  });

  it("normalises a reversed pair (min<=max)", () => {
    expect(parseMarksRangeParams("5", "3")).toEqual({ min: 3, max: 5 });
  });

  it("treats a single present param as min==max", () => {
    expect(parseMarksRangeParams("4", null)).toEqual({ min: 4, max: 4 });
    expect(parseMarksRangeParams(null, "1")).toEqual({ min: 1, max: 1 });
  });

  it("returns null when absent or out of the CBSE 1..5 range (honest default)", () => {
    expect(parseMarksRangeParams(null, null)).toBeNull();
    expect(parseMarksRangeParams("", "")).toBeNull();
    expect(parseMarksRangeParams("0", "9")).toBeNull(); // both invalid
    expect(parseMarksRangeParams("x", "y")).toBeNull();
  });

  it("the '3–5' range excludes 2 and the '2–3' range includes 3 (the fixed bug)", () => {
    const r35 = parseMarksRangeParams("3", "5")!;
    expect(2 >= r35.min && 2 <= r35.max).toBe(false); // NO 2-mark contamination
    expect([3, 4, 5].every((m) => m >= r35.min && m <= r35.max)).toBe(true);
    const r23 = parseMarksRangeParams("2", "3")!;
    expect(3 >= r23.min && 3 <= r23.max).toBe(true); // 3-mark now included
    expect(4 >= r23.min && 4 <= r23.max).toBe(false);
  });
});
