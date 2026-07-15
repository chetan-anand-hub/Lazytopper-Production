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

/**
 * UNIQUE SETS (2026-07-15). Every test ABOVE calls with the original 7 args and is
 * byte-unchanged — that they still pass IS the no-regression proof: omit the seen-set
 * and the offset and the draw behaves exactly as it always did.
 */
describe("selectInRangeFromPool — unique sets (unseen-preference + exhaustion)", () => {
  // 12 in-range (3–5) questions, ids in-0..in-11.
  const pool12: PracticeQuestion[] = Array.from({ length: 12 }, (_, i) =>
    mkQ(`in-${i}`, 3 + (i % 3), "C"),
  );
  const idsOf = (qs: PracticeQuestion[]) => qs.map((q) => String((q as { id: string }).id));

  it("no seen-set + no offset → byte-identical to the legacy head-of-pool draw", () => {
    const legacy = selectInRangeFromPool(pool12, "all", "all", "all", "all", RANGE_3_5, 5);
    const explicit = selectInRangeFromPool(
      pool12, "all", "all", "all", "all", RANGE_3_5, 5, new Set(), 0,
    );
    expect(idsOf(explicit.displayed)).toEqual(idsOf(legacy.displayed));
    expect(idsOf(legacy.displayed)).toEqual(["in-0", "in-1", "in-2", "in-3", "in-4"]);
  });

  it("UNSEEN-PREFERENCE: seen questions are pushed behind every unseen one", () => {
    const seen = new Set(["in-0", "in-1", "in-2"]);
    const { displayed } = selectInRangeFromPool(
      pool12, "all", "all", "all", "all", RANGE_3_5, 5, seen, 0,
    );
    // The three seen ids are excluded from a 5-slot draw while 9 unseen remain.
    expect(idsOf(displayed).some((id) => seen.has(id))).toBe(false);
    expect(displayed.length).toBe(5);
  });

  it("EXHAUSTION-RECOMBINATION: everything seen → NOT the identical set, and never fabricated", () => {
    const allSeen = new Set(idsOf(pool12));
    const visitA = selectInRangeFromPool(
      pool12, "all", "all", "all", "all", RANGE_3_5, 5, allSeen, 0,
    );
    const visitB = selectInRangeFromPool(
      pool12, "all", "all", "all", "all", RANGE_3_5, 5, allSeen, 5,
    );
    // A repeat visit is still a DIFFERENT practice experience...
    expect(idsOf(visitB.displayed)).not.toEqual(idsOf(visitA.displayed));
    // ...but only ever real bank questions, recombined — never invented, never padded.
    expect(idsOf(visitB.displayed).every((id) => allSeen.has(id))).toBe(true);
    expect(visitB.displayed.length).toBe(5);
    expect(visitB.available).toBe(12);
  });

  it("the seen-set NEVER shrinks `available` — the hint means the same thing as before", () => {
    const bare = selectInRangeFromPool(pool12, "all", "all", "all", "all", RANGE_3_5, 5);
    for (const seen of [new Set<string>(), new Set(["in-0"]), new Set(idsOf(pool12))]) {
      const { available } = selectInRangeFromPool(
        pool12, "all", "all", "all", "all", RANGE_3_5, 5, seen, 7,
      );
      // Rotation is a PERMUTATION, not a filter: `available` is untouched, so the
      // "N available" hint never falls as the student practises.
      expect(available).toBe(bare.available);
    }
  });

  it("INVARIANT holds under unseen-preference AND exhaustion, at every count", () => {
    const cases: Array<[string, Set<string>, number]> = [
      ["no seen", new Set(), 0],
      ["some seen", new Set(["in-0", "in-3", "in-7"]), 4],
      ["all seen", new Set(idsOf(pool12)), 9],
      ["offset > pool length", new Set(["in-1"]), 1000],
    ];
    for (const [, seen, offset] of cases) {
      for (const committedCount of [1, 3, 5, 12, 25]) {
        const { available, displayed } = selectInRangeFromPool(
          pool12, "all", "all", "all", "all", RANGE_3_5, committedCount, seen, offset,
        );
        expect(displayed.length).toBe(Math.min(available, committedCount));
        // No duplicates: a permutation can never serve the same question twice.
        expect(new Set(idsOf(displayed)).size).toBe(displayed.length);
      }
    }
  });

  it("HONEST thin-bank survives rotation: a real 4 stays 4, never padded", () => {
    const thin: PracticeQuestion[] = [
      mkQ("in-0", 3, "C"), mkQ("in-1", 4, "E"), mkQ("in-2", 5, "D"), mkQ("in-3", 3, "C"),
      ...Array.from({ length: 12 }, (_, i) => mkQ(`out-${i}`, 1, "A")),
    ];
    const { available, displayed } = selectInRangeFromPool(
      thin, "all", "all", "all", "all", RANGE_3_5, 10, new Set(["in-0", "in-1"]), 3,
    );
    expect(available).toBe(4);
    expect(displayed.length).toBe(4);
  });
});
