import { describe, it, expect } from "vitest";
import { parseMarksValue, marksTokenToBucketSet } from "./PracticePage";

/**
 * PR-E1 — PracticePage CONSUMES the concept mark band via the `marks` query param,
 * now extended to accept a comma SET of buckets (a concept band that spans more
 * than one bucket → range -> set). These tests lock that parse so the band the
 * Topic Hub emits (e.g. "marks=1,23") is actually honoured by the page filter.
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
