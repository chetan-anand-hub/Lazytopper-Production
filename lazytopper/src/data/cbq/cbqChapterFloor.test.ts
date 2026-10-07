/**
 * cbqChapterFloor.test.ts — CBQ-1 C3 SCI-TOPUP: the ≥100 per-chapter RATCHET.
 *
 * Owner rule: "must count what students actually see". The count here is NOT a re-implemented
 * filter. It goes through the CBQ chooser's own pool, `buildCbqPracticePool`
 * (components/practice/practiceQuestionBuilder.ts), with the topic label derived exactly as the
 * chooser derives it (`practiceTopicLabel`, components/practice/cbqAvailability.ts):
 *   PredictionCore.getLikelyQuestionsForConcept (served bank, withheld rows already removed)
 *   -> subject filter -> filterCbqs (isCbq) -> dedup by questionKey.
 * Every chooser "N available", every CBQ set build and the Competency preset read that pool, and
 * the test also asserts it equals `chapterCbqCounts` (the chooser's own counter) per chapter.
 *
 * ★ RATCHET. PINNED chapters must keep >= 100 student-visible CBQs. KNOWN_BELOW chapters are
 *   below 100 today; the moment one of them reaches 100 this test FAILS until it is moved into
 *   PINNED — the floor only ever moves up. PINNED ∪ KNOWN_BELOW must be every bank chapter, so a
 *   new chapter cannot slip past unclassified.
 * ★ PLANTED CONTROL. The same counter is run on fixture chapters (a mocked concept label served
 *   by the real buildCbqPracticePool): 99 distinct rows FAIL the floor; 100 rows with one
 *   duplicate stem count 99 and FAIL (proves the dedup is in the count); 100 distinct rows PASS.
 * ★ CLOCK. PredictionCore reads the year; the Date is pinned here (fake timers, Date only), so
 *   this file never reads the real clock and the count is deterministic.
 */

import { describe, it, expect, vi, beforeAll } from "vitest";

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-07T06:00:00.000Z"));
});

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));

const CONTROL = vi.hoisted(() => ({ rows: new Map<string, unknown[]>() }));
vi.mock("../predictionCore", async (importOriginal) => {
  const real = await importOriginal<typeof import("../predictionCore")>();
  const getLikely = real.PredictionCore.getLikelyQuestionsForConcept.bind(real.PredictionCore);
  return {
    ...real,
    PredictionCore: {
      ...real.PredictionCore,
      getLikelyQuestionsForConcept: ((label: string, ...rest: unknown[]) =>
        CONTROL.rows.has(label)
          ? CONTROL.rows.get(label)
          : (getLikely as (...a: unknown[]) => unknown)(label, ...rest)) as typeof real.PredictionCore.getLikelyQuestionsForConcept,
    },
  };
});

import { buildCbqPracticePool, type SubjectKey } from "../../components/practice/practiceQuestionBuilder";
import { chapterCbqCounts, practiceTopicLabel } from "../../components/practice/cbqAvailability";
import { BANK_CHAPTER_SLUGS, BANK_CHAPTER_SUBJECT, ensureAllBankChapters } from "../bankChapters/loader";

const FLOOR = 100;

/** Chapters at or above the floor — each must stay >= 100 student-visible CBQs. */
const PINNED = [
  // Maths (C3 PR-1..PR-3, C2 Maths A)
  "pair-of-linear-equations",
  "quadratic-equations",
  "arithmetic-progression",
  "triangles",
  "coordinate-geometry",
  "trigonometry",
  "circles",
  "areas-related-to-circles",
  "statistics",
  // Science (C2 PR-1..PR-6; C3 SCI-TOPUP lifts the three Chemistry/Environment chapters)
  "chemical-reactions-and-equations",
  "acids-bases-and-salts",
  "metals-and-non-metals",
  "carbon-and-its-compounds",
  "light-reflection-and-refraction",
  "human-eye-and-colourful-world",
  "electricity",
  "magnetic-effects-of-electric-current",
  "life-processes",
  "control-and-coordination",
  "how-do-organisms-reproduce",
  "heredity",
  "our-environment",
] as const;

/**
 * Below the floor today (C2's remaining Maths chapters are not merged yet). When any of these
 * reaches 100 the ratchet test FAILS: move it into PINNED in the same PR.
 */
const KNOWN_BELOW = ["real-numbers", "polynomials", "surface-areas-and-volumes", "probability"] as const;

const subjectOf = (slug: string) => (BANK_CHAPTER_SUBJECT as Record<string, string>)[slug] as SubjectKey;

/** Student-visible CBQs of one chapter: the chooser's own pool, counted. */
function visibleCbqCount(subject: SubjectKey, topicLabel: string): number {
  return buildCbqPracticePool({ subjectKey: subject, topicKey: topicLabel }).length;
}

/** The floor check: the chapters (of `counts`) below FLOOR. */
function belowFloor(counts: Readonly<Record<string, number>>): string[] {
  return Object.entries(counts)
    .filter(([, n]) => n < FLOOR)
    .map(([slug, n]) => `${slug}=${n}`);
}

function fixtureRows(label: string, n: number, duplicateLast = false) {
  return Array.from({ length: n }, (_, i) => {
    const k = duplicateLast && i === n - 1 ? 0 : i;
    return {
      id: `FLOOR-CONTROL-${label}-${i}`,
      subject: "Science",
      topicKey: label,
      marks: (i % 5) + 1,
      questionText: `Floor control stem number ${k} for ${label}`,
      options: [],
      solutionSteps: [],
      competencyVerified: true,
    };
  });
}

beforeAll(async () => {
  await ensureAllBankChapters();
}, 600_000);

describe("CBQ-1 C3 · per-chapter ≥100 student-visible CBQ ratchet", () => {
  it("PINNED ∪ KNOWN_BELOW is exactly the bank's chapter list (no chapter unclassified)", () => {
    const all = [...PINNED, ...KNOWN_BELOW];
    expect(new Set(all).size, "no chapter listed twice").toBe(all.length);
    expect([...all].sort()).toEqual([...BANK_CHAPTER_SLUGS].sort());
  });

  it("the counter is the chooser's: buildCbqPracticePool equals chapterCbqCounts on every chapter", () => {
    for (const slug of BANK_CHAPTER_SLUGS) {
      const subject = subjectOf(slug);
      expect(visibleCbqCount(subject, practiceTopicLabel(subject, slug)), slug).toBe(chapterCbqCounts(subject, slug).total);
    }
  });

  it("★ every PINNED chapter has >= 100 student-visible CBQs", () => {
    const counts: Record<string, number> = {};
    for (const slug of PINNED) counts[slug] = visibleCbqCount(subjectOf(slug), practiceTopicLabel(subjectOf(slug), slug));
    expect(belowFloor(counts), JSON.stringify(counts)).toEqual([]);
  });

  it("★ RATCHET: no KNOWN_BELOW chapter has reached 100 (if one has, move it into PINNED)", () => {
    for (const slug of KNOWN_BELOW) {
      const n = visibleCbqCount(subjectOf(slug), practiceTopicLabel(subjectOf(slug), slug));
      expect(n, `${slug} has ${n} student-visible CBQs — move it into PINNED`).toBeLessThan(FLOOR);
    }
  });

  it("PLANTED CONTROL: the same counter on a 99-row chapter FAILS the floor; 100 rows with one duplicate stem count 99 and FAIL; 100 distinct rows PASS", () => {
    CONTROL.rows.set("__FLOOR_CONTROL_99__", fixtureRows("__FLOOR_CONTROL_99__", 99));
    CONTROL.rows.set("__FLOOR_CONTROL_DUP__", fixtureRows("__FLOOR_CONTROL_DUP__", 100, true));
    CONTROL.rows.set("__FLOOR_CONTROL_100__", fixtureRows("__FLOOR_CONTROL_100__", 100));
    try {
      const n99 = visibleCbqCount("Science", "__FLOOR_CONTROL_99__");
      const nDup = visibleCbqCount("Science", "__FLOOR_CONTROL_DUP__");
      const n100 = visibleCbqCount("Science", "__FLOOR_CONTROL_100__");
      expect([n99, nDup, n100]).toEqual([99, 99, 100]);
      expect(belowFloor({ control99: n99 })).toEqual(["control99=99"]);
      expect(belowFloor({ controlDup: nDup })).toEqual(["controlDup=99"]);
      expect(belowFloor({ control100: n100 })).toEqual([]);
    } finally {
      CONTROL.rows.clear();
    }
  });
});
