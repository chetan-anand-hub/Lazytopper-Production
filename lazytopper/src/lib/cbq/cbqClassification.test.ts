// CBQ-1 PR-1 — the one CBQ classifier. Synthetic rows only (hardcoded counts are fine
// here: no bank is read). Bank-derived pins live in cbqAvailability.test.ts.

import { describe, it, expect } from "vitest";
import {
  CBQ_ARIA_LABEL,
  CBQ_LABEL_TEXT,
  CBQ_FLAG_CLEARED,
  CBQ_MARK_VALUES,
  cbqFlagOf,
  cbqMarks,
  countCbqsByChapter,
  countCbqsByMarks,
  filterCbqs,
  interleaveCbqsByMarks,
  isCbq,
  type CbqRowLike,
} from "./cbqClassification";

type Row = CbqRowLike & { id: string; isCompetencyBased?: boolean; section?: string; format?: string };
const row = (id: string, marks: unknown, verified: boolean, extra: Partial<Row> = {}): Row => ({
  id,
  marks,
  ...(verified ? { competencyVerified: true as const } : {}),
  ...extra,
});

describe("isCbq — a CBQ iff competencyVerified === true (D1)", () => {
  it("true only for the verified flag", () => {
    expect(isCbq(row("a", 1, true))).toBe(true);
    expect(isCbq(row("b", 4, false))).toBe(false);
    expect(isCbq(null)).toBe(false);
    expect(isCbq(undefined)).toBe(false);
  });

  it("never truthy-coerces: only the literal true counts", () => {
    for (const v of ["true", 1, {}, [], "yes"]) {
      expect(isCbq({ competencyVerified: v }), String(v)).toBe(false);
    }
  });

  it("★ ignores the unreliable legacy isCompetencyBased flag, in BOTH directions", () => {
    // legacy true, not verified -> NOT a CBQ (the legacy flag over-tags ~5,000 rows)
    expect(isCbq(row("legacy", 4, false, { isCompetencyBased: true }))).toBe(false);
    // verified, legacy false -> a CBQ
    expect(isCbq(row("verified", 2, true, { isCompetencyBased: false }))).toBe(true);
  });

  it("ignores section / format: a Section-E case study without the flag is not a CBQ", () => {
    expect(isCbq(row("e", 4, false, { section: "E", format: "case-based" }))).toBe(false);
    expect(isCbq(row("a1", 1, true, { section: "A", format: "MCQ" }))).toBe(true);
  });
});

describe("cbqMarks — the real numeric marks, never the fused '23' bucket", () => {
  it("returns 1..5 and null otherwise", () => {
    for (const m of CBQ_MARK_VALUES) expect(cbqMarks({ marks: m })).toBe(m);
    expect(cbqMarks({ marks: "3" })).toBe(3);
    expect(cbqMarks({ marks: "23" })).toBeNull(); // a bucket token is not a mark value
    expect(cbqMarks({ marks: 0 })).toBeNull();
    expect(cbqMarks({ marks: 6 })).toBeNull();
    expect(cbqMarks({ marks: 2.5 })).toBeNull();
    expect(cbqMarks({})).toBeNull();
    expect(cbqMarks(null)).toBeNull();
  });
});

describe("counting — per mark value and per chapter x mark", () => {
  const rows: Row[] = [
    row("1a", 1, true), row("1b", 1, true), row("2a", 2, true), row("3a", 3, true),
    row("4a", 4, true), row("4b", 4, true), row("5a", 5, true), row("x", undefined, true),
    row("n1", 1, false), row("n4", 4, false, { isCompetencyBased: true }),
  ];

  it("counts only CBQs, every mark value, unknown marks kept in the total", () => {
    const c = countCbqsByMarks(rows);
    expect(c.byMarks).toEqual({ 1: 2, 2: 1, 3: 1, 4: 2, 5: 1 });
    expect(c.unknownMarks).toBe(1);
    expect(c.total).toBe(8);
    expect(filterCbqs(rows).map((r) => r.id)).toEqual(["1a", "1b", "2a", "3a", "4a", "4b", "5a", "x"]);
  });

  it("per chapter", () => {
    const by = countCbqsByChapter({ a: rows, b: [row("n", 3, false)] });
    expect(by.a.total).toBe(8);
    expect(by.b).toEqual({ byMarks: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, unknownMarks: 0, total: 0 });
  });
});

describe("interleaveCbqsByMarks — any head slice is mixed-marks; a permutation", () => {
  it("round-robins the mark groups, keeping each group's order", () => {
    const rows = [row("4a", 4, true), row("4b", 4, true), row("4c", 4, true), row("1a", 1, true), row("2a", 2, true), row("1b", 1, true)];
    const out = interleaveCbqsByMarks(rows).map((r) => r.id);
    expect(out).toEqual(["1a", "2a", "4a", "1b", "4b", "4c"]);
    expect([...out].sort()).toEqual(rows.map((r) => r.id).sort()); // nothing dropped or added
  });

  it("empty in, empty out", () => {
    expect(interleaveCbqsByMarks([])).toEqual([]);
  });
});

describe("carrying the flag through a mapper", () => {
  it("cbqFlagOf carries it only for a CBQ; a spread of CBQ_FLAG_CLEARED drops an inherited flag", () => {
    expect({ id: "x", ...cbqFlagOf(row("a", 2, true)) }).toEqual({ id: "x", competencyVerified: true });
    expect({ id: "y", ...cbqFlagOf(row("b", 2, false, { isCompetencyBased: true })) }).toEqual({ id: "y" });
    // An AI variant spread from a CBQ seed is NOT a CBQ.
    const variant = { ...row("seed", 4, true), ...CBQ_FLAG_CLEARED, id: "seed-AI-1" };
    expect(isCbq(variant)).toBe(false);
  });
});

describe("the label strings", () => {
  it("visible text and accessible name", () => {
    expect(CBQ_LABEL_TEXT).toBe("CBQ");
    expect(CBQ_ARIA_LABEL).toBe("Competency-based question");
  });
});
