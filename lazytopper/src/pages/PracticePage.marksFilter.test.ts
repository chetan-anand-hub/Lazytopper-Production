import { describe, it, expect } from "vitest";
import {
  parseMarksValue,
  marksTokenToBucketSet,
  parseMarksRangeParams,
  questionMatchesFilters,
  selectInRangeFromPool,
} from "./PracticePage";
import type { PracticeQuestion } from "../data/predictionDataService";

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

/**
 * PR-E1 FINAL-BUG FIX — single-pool unification.
 *
 * THE BUG: the "N available" hint and the displayed set were computed from TWO
 * DIFFERENT engine draws (a 200-count count-draw vs the ~100 display draw). Two
 * independent random samples → the hint promised more in-range questions than the
 * display draw actually contained (hint "10", display 5–6) even when the bank had
 * enough. selectInRangeFromPool now derives BOTH numbers from ONE shared pool, so
 * the hint can never exceed what the display delivers, and a narrow in-range band
 * fills to committedCount whenever the pool genuinely has enough. The honest
 * thin-bank case still reports the REAL smaller number.
 *
 * Helpers under test are PURE (no React / no engine fetch), so the invariant is
 * locked directly: available >= displayed.length, and
 * displayed.length === min(available, committedCount).
 */
const mkQ = (id: string, marks: number, section: string): PracticeQuestion =>
  ({ id, marks, section, questionText: `Q ${id}`, difficulty: "Medium", format: "" } as unknown as PracticeQuestion);

const RANGE_3_5 = parseMarksRangeParams("3", "5")!; // {min:3,max:5}

describe("questionMatchesFilters — exact range predicate (shared by hint + display)", () => {
  it("keeps 3/4/5-mark questions and drops 1/2-mark for a 3–5 band", () => {
    expect(questionMatchesFilters(mkQ("a", 3, "C"), "all", "all", "all", "all", RANGE_3_5)).toBe(true);
    expect(questionMatchesFilters(mkQ("b", 4, "E"), "all", "all", "all", "all", RANGE_3_5)).toBe(true);
    expect(questionMatchesFilters(mkQ("c", 5, "D"), "all", "all", "all", "all", RANGE_3_5)).toBe(true);
    expect(questionMatchesFilters(mkQ("d", 2, "B"), "all", "all", "all", "all", RANGE_3_5)).toBe(false);
    expect(questionMatchesFilters(mkQ("e", 1, "A"), "all", "all", "all", "all", RANGE_3_5)).toBe(false);
  });
});

describe("selectInRangeFromPool — hint and display share ONE pool (the fixed two-pool bug)", () => {
  it("bank HAS enough in-range → display fills to committedCount (not fewer)", () => {
    // Pool of 20: ten in-range (3–5), ten out-of-range — mirrors a healthy bank.
    const pool: PracticeQuestion[] = [
      ...Array.from({ length: 10 }, (_, i) => mkQ(`in-${i}`, 3 + (i % 3), "C")), // marks 3,4,5...
      ...Array.from({ length: 10 }, (_, i) => mkQ(`out-${i}`, i % 2 === 0 ? 1 : 2, "A")),
    ];
    const committedCount = 10;
    const { available, displayed } = selectInRangeFromPool(
      pool, "all", "all", "all", "all", RANGE_3_5, committedCount,
    );
    expect(available).toBe(10);            // hint reflects THIS pool
    expect(displayed.length).toBe(10);     // display fills to committedCount — NOT 5–6
    expect(displayed.every((q) => Number((q as { marks: number }).marks) >= 3)).toBe(true);
  });

  it("INVARIANT: hint can never promise more than the display delivers from the same pool", () => {
    const pool: PracticeQuestion[] = Array.from({ length: 30 }, (_, i) =>
      mkQ(`q-${i}`, (i % 5) + 1, "C"), // marks cycle 1..5 → ~18 in 3–5 band
    );
    for (const committedCount of [3, 5, 10, 25]) {
      const { available, displayed } = selectInRangeFromPool(
        pool, "all", "all", "all", "all", RANGE_3_5, committedCount,
      );
      // The hint (available) is always an upper bound the display fills up to.
      expect(displayed.length).toBeLessThanOrEqual(available);
      expect(displayed.length).toBe(Math.min(available, committedCount));
    }
  });

  it("HONEST thin-bank: when the pool truly lacks committedCount in-range, the hint shows the REAL smaller number and display === that", () => {
    // Only 4 in-range questions exist in the whole pool — a genuinely thin bank.
    const pool: PracticeQuestion[] = [
      mkQ("in-0", 3, "C"), mkQ("in-1", 4, "E"), mkQ("in-2", 5, "D"), mkQ("in-3", 3, "C"),
      ...Array.from({ length: 12 }, (_, i) => mkQ(`out-${i}`, 1, "A")),
    ];
    const committedCount = 10; // student asked for 10
    const { available, displayed } = selectInRangeFromPool(
      pool, "all", "all", "all", "all", RANGE_3_5, committedCount,
    );
    expect(available).toBe(4);          // honest: the REAL in-range count, not a padded 10
    expect(displayed.length).toBe(4);   // display shows the real 4, no fabricated fillers
    expect(displayed.length).toBe(available); // hint and display agree exactly
  });

  it("empty / unbuilt pool → 0 available, 0 displayed (honest empty state)", () => {
    const { available, displayed } = selectInRangeFromPool(
      [], "all", "all", "all", "all", RANGE_3_5, 10,
    );
    expect(available).toBe(0);
    expect(displayed.length).toBe(0);
  });
});
