import { describe, it, expect } from "vitest";
import {
  sectionFromTotalMarks,
  aggregateMistakeLog,
  weakestTopic,
  weakSections,
  sectionBoostsFor,
  SECTION_BOOST_STRENGTH,
  type RawMistakeEntry,
} from "./worksheetMiSelector";
import type { WorksheetTopic } from "./worksheetModel";

// FIX A — pure scope-relative Mistake-Intelligence selector tests. Deterministic
// (nowMs is injected). Runs in CI/Codespaces vitest; not in the Windows quality-gate.

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

const TOPICS: WorksheetTopic[] = [
  { key: "real-numbers", label: "Real Numbers" },
  { key: "circles", label: "Circles" },
  { key: "trigonometry", label: "Trigonometry" },
];

const entry = (e: Partial<RawMistakeEntry>): RawMistakeEntry => ({
  timestamp: iso(1 * DAY),
  ...e,
});

describe("sectionFromTotalMarks — CBSE band proxy (honest unknown otherwise)", () => {
  it("maps the five canonical CBSE mark values to their section", () => {
    expect(sectionFromTotalMarks(1)).toBe("A");
    expect(sectionFromTotalMarks(2)).toBe("B");
    expect(sectionFromTotalMarks(3)).toBe("C");
    expect(sectionFromTotalMarks(4)).toBe("E"); // case study
    expect(sectionFromTotalMarks(5)).toBe("D"); // long answer
  });
  it("returns null (unknown — never fabricates a section) for anything else", () => {
    expect(sectionFromTotalMarks(0)).toBeNull();
    expect(sectionFromTotalMarks(6)).toBeNull();
    expect(sectionFromTotalMarks(2.5)).toBeNull();
    expect(sectionFromTotalMarks(undefined)).toBeNull();
    expect(sectionFromTotalMarks("x")).toBeNull();
  });
});

describe("aggregateMistakeLog — scope-relative, derivation not fabrication", () => {
  it("aggregates marks lost per topic and matches topic by label OR key", () => {
    const mi = aggregateMistakeLog(
      [
        entry({ topic: "Real Numbers", totalMarks: 3, marksLost: 2 }), // by label
        entry({ topic: "real-numbers", totalMarks: 5, marksLost: 3 }), // by key
        entry({ topic: "Circles", totalMarks: 2, marksLost: 1 }),
      ],
      TOPICS,
      NOW,
    );
    expect(mi.hasData).toBe(true);
    expect(mi.byTopic.get("real-numbers")?.marksLost).toBe(5);
    expect(mi.byTopic.get("circles")?.marksLost).toBe(1);
  });

  it("derives section loss from the totalMarks band", () => {
    const mi = aggregateMistakeLog(
      [
        entry({ topic: "real-numbers", totalMarks: 3, marksLost: 2 }), // → C
        entry({ topic: "real-numbers", totalMarks: 3, marksLost: 1 }), // → C
        entry({ topic: "real-numbers", totalMarks: 5, marksLost: 4 }), // → D
      ],
      TOPICS,
      NOW,
    );
    const rn = mi.byTopic.get("real-numbers")!;
    expect(rn.sectionLoss.C).toBe(3);
    expect(rn.sectionLoss.D).toBe(4);
    expect(rn.unknownSectionLoss).toBe(0);
  });

  it("HONEST UNKNOWN: a non-band totalMarks contributes to marksLost but NO section", () => {
    const mi = aggregateMistakeLog(
      [
        entry({ topic: "real-numbers", totalMarks: 0, marksLost: 2 }), // C&I upload, unknown band
        entry({ topic: "real-numbers", totalMarks: 3, marksLost: 1 }), // → C
      ],
      TOPICS,
      NOW,
    );
    const rn = mi.byTopic.get("real-numbers")!;
    expect(rn.marksLost).toBe(3); // both counted toward the topic total
    expect(rn.sectionLoss.C).toBe(1);
    expect(rn.unknownSectionLoss).toBe(2); // never fabricated into a section
  });

  it("ignores entries outside the 30-day window, with no marks lost, or unmatched", () => {
    const mi = aggregateMistakeLog(
      [
        entry({ topic: "real-numbers", totalMarks: 3, marksLost: 2, timestamp: iso(40 * DAY) }), // stale
        entry({ topic: "real-numbers", totalMarks: 3, marksLost: 0 }), // clean (no loss)
        entry({ topic: "not-a-real-topic", totalMarks: 3, marksLost: 5 }), // unmatched
      ],
      TOPICS,
      NOW,
    );
    expect(mi.hasData).toBe(false);
    expect(mi.byTopic.size).toBe(0);
  });

  it("sums the 4-type mistake mix per topic", () => {
    const mi = aggregateMistakeLog(
      [
        entry({ topic: "circles", totalMarks: 3, marksLost: 2, mistakeCounts: { conceptual: 1, calculation: 2 } }),
        entry({ topic: "circles", totalMarks: 3, marksLost: 1, mistakeCounts: { silly: 1 } }),
      ],
      TOPICS,
      NOW,
    );
    const c = mi.byTopic.get("circles")!.mistakeTypes;
    expect(c).toEqual({ conceptual: 1, calculation: 2, silly: 1, presentation: 0 });
  });
});

describe("weakestTopic — scope-relative weakest, honest null", () => {
  const mi = aggregateMistakeLog(
    [
      entry({ topic: "real-numbers", totalMarks: 3, marksLost: 6 }),
      entry({ topic: "circles", totalMarks: 3, marksLost: 2 }),
    ],
    TOPICS,
    NOW,
  );
  it("returns the topic with the most marks lost among candidates", () => {
    expect(weakestTopic(mi, TOPICS)?.key).toBe("real-numbers");
  });
  it("is scope-relative: restricted candidates yield the weakest AMONG them", () => {
    const circlesOnly = TOPICS.filter((t) => t.key === "circles");
    expect(weakestTopic(mi, circlesOnly)?.key).toBe("circles");
  });
  it("returns null when no candidate has any loss", () => {
    const trigOnly = TOPICS.filter((t) => t.key === "trigonometry");
    expect(weakestTopic(mi, trigOnly)).toBeNull();
  });
});

describe("weakSections + sectionBoostsFor — weight toward weak sections, no no-op", () => {
  const mi = aggregateMistakeLog(
    [
      entry({ topic: "real-numbers", totalMarks: 3, marksLost: 6 }), // C = 6
      entry({ topic: "real-numbers", totalMarks: 5, marksLost: 3 }), // D = 3
      entry({ topic: "real-numbers", totalMarks: 0, marksLost: 4 }), // unknown
    ],
    TOPICS,
    NOW,
  );
  const rn = mi.byTopic.get("real-numbers")!;

  it("ranks weak sections by marks lost, excluding the unknown band", () => {
    expect(weakSections(rn)).toEqual(["C", "D"]);
  });

  it("boosts the top weak section to SECTION_BOOST_STRENGTH; lighter sections scale down", () => {
    const boosts = sectionBoostsFor(rn);
    expect(boosts.C).toBeCloseTo(SECTION_BOOST_STRENGTH); // top → full strength
    expect(boosts.D).toBeGreaterThan(1);
    expect(boosts.D).toBeLessThan(boosts.C!);
    expect(boosts.A).toBeUndefined(); // no loss → no boost
  });

  it("returns {} when there is no usable section signal (never a no-op toggle)", () => {
    const unknownOnly = aggregateMistakeLog(
      [entry({ topic: "circles", totalMarks: 0, marksLost: 5 })],
      TOPICS,
      NOW,
    );
    expect(sectionBoostsFor(unknownOnly.byTopic.get("circles"))).toEqual({});
    expect(sectionBoostsFor(null)).toEqual({});
  });
});
