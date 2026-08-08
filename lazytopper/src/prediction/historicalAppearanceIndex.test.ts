// src/prediction/historicalAppearanceIndex.test.ts
//
// The shared appearance primitive and the marks-weighted `expectedMarks` signal.

import { describe, it, expect } from "vitest";
import type { HistoricalQuestionItem } from "./historicalDataset";
import { compute5SignalScore } from "./cbse5SignalScoring";
import {
  getSubtopicAppearance,
  expectedMarks,
  laplaceRate,
  LEGACY_FUZZY_STRATEGY,
} from "./historicalAppearanceIndex";

const TARGET_YEAR = 2026;

// ── fixture corpus ───────────────────────────────────────────────────────────
// Built explicitly so frequency can be held IDENTICAL while marks vary. That
// controlled comparison is impossible against the real corpus, where the two
// always move together.

let idSeq = 0;
function item(
  partial: Partial<HistoricalQuestionItem> & {
    topic: string;
    subtopic: string;
    marks: number;
    sourceYear: number;
  }
): HistoricalQuestionItem {
  return {
    id: `fx-${idSeq++}`,
    subject: "Maths",
    format: "Short",
    bloom: "Applying",
    competencyType: "procedural",
    sourceType: "official_board",
    sourceOrigin: "official",
    sourceLabel: `CBSE Board ${partial.sourceYear}`,
    archetypeKey: `${partial.topic}|${partial.subtopic}`,
    ...partial,
  } as HistoricalQuestionItem;
}

const YEARS = [2020, 2021, 2022, 2023, 2024];

/**
 * Two subtopics inside one topic, appearing in EXACTLY the same years — one
 * always worth 1 mark, the other always worth 5.
 */
const EQUAL_FREQUENCY_CORPUS: HistoricalQuestionItem[] = [
  ...YEARS.map((y) => item({ topic: "Algebra", subtopic: "Tiny Recall", marks: 1, sourceYear: y })),
  ...YEARS.map((y) => item({ topic: "Algebra", subtopic: "Long Proof", marks: 5, sourceYear: y })),
];

describe("getSubtopicAppearance — the shared primitive", () => {
  it("counts appearances per subtopic per year over official-board items only", () => {
    const corpus = [
      ...EQUAL_FREQUENCY_CORPUS,
      // An SQP item in a year the subtopic otherwise never appeared. It must NOT
      // create an appearance year.
      item({
        topic: "Algebra",
        subtopic: "Tiny Recall",
        marks: 1,
        sourceYear: 2019,
        sourceType: "official_sqp",
        sourceOrigin: "sample",
      }),
    ];
    const a = getSubtopicAppearance("Maths", "Algebra", "Tiny Recall", { corpus });
    expect([...a.yearsWithSubtopic].sort()).toEqual(YEARS);
    expect(a.yearsWithSubtopic).not.toContain(2019);
    expect(a.totalBoardYears).toBe(5);
    expect(a.subtopicMarks).toEqual([1, 1, 1, 1, 1]);
  });

  it("honours cutoffYear so backtests cannot see the future", () => {
    const a = getSubtopicAppearance("Maths", "Algebra", "Tiny Recall", {
      corpus: EQUAL_FREQUENCY_CORPUS,
      cutoffYear: 2023,
    });
    expect([...a.yearsWithSubtopic].sort()).toEqual([2020, 2021, 2022]);
    // CONTROL: without the cutoff the later years ARE present, so the assertion
    // above is testing the cutoff rather than an empty corpus.
    const uncut = getSubtopicAppearance("Maths", "Algebra", "Tiny Recall", {
      corpus: EQUAL_FREQUENCY_CORPUS,
    });
    expect([...uncut.yearsWithSubtopic].sort()).toEqual(YEARS);
  });

  it("separates subjects", () => {
    const corpus = [
      ...EQUAL_FREQUENCY_CORPUS,
      ...YEARS.map((y) =>
        item({ subject: "Science", topic: "Algebra", subtopic: "Tiny Recall", marks: 3, sourceYear: y })
      ),
    ];
    const maths = getSubtopicAppearance("Maths", "Algebra", "Tiny Recall", { corpus });
    const science = getSubtopicAppearance("Science", "Algebra", "Tiny Recall", { corpus });
    expect(maths.subtopicMarks).toEqual([1, 1, 1, 1, 1]);
    expect(science.subtopicMarks).toEqual([3, 3, 3, 3, 3]);
  });
});

describe("expectedMarks — the marks-weighted signal (gap 6)", () => {
  it("★ distinguishes a 1-marker from a 5-marker at IDENTICAL frequency", () => {
    const opts = { corpus: EQUAL_FREQUENCY_CORPUS };
    const tiny = expectedMarks("Maths", "Algebra", "Tiny Recall", opts);
    const long = expectedMarks("Maths", "Algebra", "Long Proof", opts);

    // Precondition: the frequencies really are identical, so the difference
    // below can ONLY come from marks. Without this the test would pass for the
    // wrong reason.
    expect(tiny.appearanceRate).toBe(long.appearanceRate);
    expect(tiny.appearances).toBe(long.appearances);

    expect(tiny.meanMarks).toBe(1);
    expect(long.meanMarks).toBe(5);
    expect(long.expectedMarks).toBeCloseTo(tiny.expectedMarks * 5, 10);
    expect(long.expectedMarks).toBeGreaterThan(tiny.expectedMarks);
  });

  it("CONTROL: the PRESENCE signal cannot tell those two apart", () => {
    // This is the defect `expectedMarks` exists to fix. If this control ever
    // goes red, the frequency signal has started carrying marks and the new
    // signal's justification needs re-checking.
    const tiny = getSubtopicAppearance("Maths", "Algebra", "Tiny Recall", {
      corpus: EQUAL_FREQUENCY_CORPUS,
    });
    const long = getSubtopicAppearance("Maths", "Algebra", "Long Proof", {
      corpus: EQUAL_FREQUENCY_CORPUS,
    });
    expect(laplaceRate(tiny.yearsWithSubtopic.length, tiny.totalBoardYears)).toBe(
      laplaceRate(long.yearsWithSubtopic.length, long.totalBoardYears)
    );
  });

  it("ranks by marks × rate, not by marks alone", () => {
    const corpus = [
      // 5-mark, but seen in ONE year out of five.
      item({ topic: "Algebra", subtopic: "Rare Big", marks: 5, sourceYear: 2020 }),
      // 1-mark, seen every year.
      ...YEARS.map((y) => item({ topic: "Algebra", subtopic: "Common Small", marks: 1, sourceYear: y })),
      // padding so totalBoardYears is 5
      ...YEARS.map((y) => item({ topic: "Padding", subtopic: "Pad", marks: 1, sourceYear: y })),
    ];
    const rare = expectedMarks("Maths", "Algebra", "Rare Big", { corpus });
    const common = expectedMarks("Maths", "Algebra", "Common Small", { corpus });
    // rare: 5 * (1+1)/(5+2) = 1.4286 ; common: 1 * (5+1)/(5+2) = 0.857
    expect(rare.expectedMarks).toBeCloseTo(5 * (2 / 7), 10);
    expect(common.expectedMarks).toBeCloseTo(1 * (6 / 7), 10);
    expect(rare.expectedMarks).toBeGreaterThan(common.expectedMarks);
  });

  it("Laplace bounds hold at both extremes — never 0, never 1", () => {
    const neverCorpus = YEARS.map((y) =>
      item({ topic: "Algebra", subtopic: "Something Else", marks: 2, sourceYear: y })
    );
    const never = expectedMarks("Maths", "Algebra", "Never Ever Asked", { corpus: neverCorpus });
    expect(never.appearances).toBe(0);
    expect(never.appearanceRate).toBe(1 / 7); // (0+1)/(5+2)
    expect(never.appearanceRate).toBeGreaterThan(0);

    const always = expectedMarks("Maths", "Algebra", "Tiny Recall", {
      corpus: EQUAL_FREQUENCY_CORPUS,
    });
    expect(always.appearances).toBe(5);
    expect(always.appearanceRate).toBe(6 / 7); // (5+1)/(5+2)
    expect(always.appearanceRate).toBeLessThan(1);
  });

  it("uses the SAME Laplace smoothing the frequency signal uses", () => {
    for (const [hits, years] of [
      [0, 5],
      [3, 5],
      [5, 5],
      [0, 1],
    ] as const) {
      expect(laplaceRate(hits, years)).toBe((hits + 1) / (years + 2));
    }
  });

  it("reports marksBasis honestly and backs off when the subtopic was never seen", () => {
    const corpus = YEARS.map((y) =>
      item({ topic: "Algebra", subtopic: "Seen Thing", marks: 4, sourceYear: y })
    );
    const seen = expectedMarks("Maths", "Algebra", "Seen Thing", { corpus });
    expect(seen.marksBasis).toBe("subtopic");
    expect(seen.meanMarks).toBe(4);

    // Unseen subtopic INSIDE a seen topic → topic pool.
    const unseenSub = expectedMarks("Maths", "Algebra", "Totally Absent Subtopic", { corpus });
    expect(unseenSub.marksBasis).toBe("topic");
    expect(unseenSub.meanMarks).toBe(4);
    expect(unseenSub.appearances).toBe(0);

    // Unseen topic entirely → subject pool.
    const unseenTopic = expectedMarks("Maths", "Nonexistent Chapter Xyzzy", "Nothing", { corpus });
    expect(unseenTopic.marksBasis).toBe("subject");

    // Empty corpus → nothing to stand on, and it must say so rather than invent.
    const empty = expectedMarks("Maths", "Algebra", "Anything", { corpus: [] });
    expect(empty.marksBasis).toBe("none");
    expect(empty.meanMarks).toBe(0);
    expect(empty.expectedMarks).toBe(0);
  });

  it("produces real, varying numbers on the REAL corpus (not just fixtures)", () => {
    const probes: Array<[string, string]> = [
      ["Trigonometry", "Trig Ratios/Values"],
      ["Statistics", "Median of Grouped Data"],
      ["Real Numbers", "Fundamental Theorem of Arithmetic"],
      ["Circles", "Tangent Properties"],
      ["Surface Areas and Volumes", "Combination/Transformation"],
    ];
    const results = probes.map(([t, s]) => expectedMarks("Maths", t, s));
    // Every probe must rest on genuine subtopic observations — if any fell back
    // the fixture labels have drifted from the corpus and this test is measuring
    // the fallback, not the signal.
    for (const r of results) {
      expect(r.marksBasis).toBe("subtopic");
      expect(r.expectedMarks).toBeGreaterThan(0);
    }
    // And they must not all collapse to one value.
    expect(new Set(results.map((r) => r.expectedMarks.toFixed(6))).size).toBeGreaterThan(1);
  });
});

describe("both signals agree on the shared appearance input", () => {
  // The point of the extraction: `computeHistoricalFrequencySignal` (inside
  // compute5SignalScore) and `expectedMarks` must read ONE appearance index.
  // Re-deriving the live signal from the primitive and matching it proves they
  // do; pointing either at a different corpus breaks this.
  const CASES: Array<{ topic: string; subtopic: string }> = [
    { topic: "Trigonometry", subtopic: "Trig Ratios/Values" },
    { topic: "Statistics", subtopic: "Median of Grouped Data" },
    { topic: "Circles", subtopic: "Tangent Properties" },
    { topic: "Polynomials", subtopic: "Zeros & Factorisation" },
    { topic: "Quadratic Equations", subtopic: "Nature of Roots (Discriminant)" },
    { topic: "Coordinate Geometry", subtopic: "Distance Formula" },
  ];

  it("re-derives the live frequency signal from the primitive, exactly", () => {
    let compared = 0;
    for (const { topic, subtopic } of CASES) {
      const live = compute5SignalScore(
        {
          subject: "Maths",
          topic,
          subtopic,
          marks: 3,
          format: "Short",
          bloom: "Applying",
          difficulty: "Medium",
        },
        TARGET_YEAR
      ).signals.historicalFrequency;

      const a = getSubtopicAppearance("Maths", topic, subtopic, {
        strategy: LEGACY_FUZZY_STRATEGY,
      });
      const withSub = new Set(a.yearsWithSubtopic);
      const recentYears = a.boardYears.filter((y) => y >= TARGET_YEAR - 3);
      const recentRate =
        recentYears.length > 0
          ? recentYears.filter((y) => withSub.has(y)).length / recentYears.length
          : 0;
      const derived = Math.min(
        1,
        Math.max(
          0,
          laplaceRate(a.yearsWithSubtopic.length, a.totalBoardYears) * 0.5 +
            laplaceRate(a.yearsWithTopic.length, a.totalBoardYears) * 0.3 +
            recentRate * 0.2
        )
      );

      expect(derived).toBeCloseTo(live, 12);
      compared++;
    }
    // Guard against a vacuous pass: the loop must actually have run.
    expect(compared).toBe(CASES.length);
    expect(compared).toBeGreaterThan(0);
  });

  it("expectedMarks reads the SAME appearance years the frequency signal does", () => {
    let compared = 0;
    for (const { topic, subtopic } of CASES) {
      const a = getSubtopicAppearance("Maths", topic, subtopic);
      const em = expectedMarks("Maths", topic, subtopic);
      expect(em.appearances).toBe(a.yearsWithSubtopic.length);
      expect(em.totalBoardYears).toBe(a.totalBoardYears);
      expect(em.appearanceRate).toBe(
        laplaceRate(a.yearsWithSubtopic.length, a.totalBoardYears)
      );
      compared++;
    }
    expect(compared).toBe(CASES.length);
  });

  it("CONTROL: a DIFFERENT corpus produces a different appearance count", () => {
    // Proves the agreement assertions above are sensitive to the corpus at all —
    // otherwise they would pass no matter what either signal read.
    const real = getSubtopicAppearance("Maths", "Trigonometry", "Trig Ratios/Values");
    const fake = getSubtopicAppearance("Maths", "Trigonometry", "Trig Ratios/Values", {
      corpus: EQUAL_FREQUENCY_CORPUS,
    });
    expect(real.yearsWithSubtopic.length).toBeGreaterThan(0);
    expect(fake.yearsWithSubtopic.length).toBe(0);
    expect(real.yearsWithSubtopic.length).not.toBe(fake.yearsWithSubtopic.length);
  });
});
