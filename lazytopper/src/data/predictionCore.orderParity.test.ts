// LOW-END-1 PR-1 (L3, P18) — Practice's ordering is pinned BEFORE the ranking is made cheaper.
//
// `getLikelyQuestionsForConcept` sorted a whole chapter with a comparator that recomputed
// `getAdjustedScore` (five multipliers, one of them a recurrence scan over the historical
// dataset on first sight of a question) on BOTH sides of EVERY comparison. That was
// Practice's 2.2 s input freeze on a budget phone (LOW-END-SCOUT-1, P6).
//
// The fix must not move a single question. This file holds the baseline that was captured
// from the UNCHANGED code (the fixture beside it was written before predictionCore.ts was
// touched) and requires the current code to reproduce it exactly:
//
//   (a) for EVERY bank chapter: the ordered id list of getLikelyQuestionsForConcept(slug);
//   (b) for EVERY (chapter, concept) the bank holds: the same, filtered by that concept
//       (one hash per chapter over all of its concepts — 2,167 concepts today);
//   (c) for EVERY chapter and three fixed RNG seeds: the ordered ids Practice actually
//       serves (buildPracticeQuestionsFromEngine, 10 questions, "All" difficulty), with
//       Math.random replaced by a seeded generator so the shuffle is reproducible.
//
// Each list is stored as length + sha256 of the ids joined by "\n" (+ the first three ids,
// so a failure points somewhere). Any reordering, addition or removal changes the hash.
//
// Regenerate ONLY from code whose ordering is known-good:
//     LT_WRITE_ORDER_PARITY=1 npx vitest run src/data/predictionCore.orderParity.test.ts

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import "../test/preloadBankChapters";
import { BANK_CHAPTER_SLUGS, BANK_CHAPTER_SUBJECT } from "./bankChapters/loader";
import { PredictionCore } from "./predictionCore";
import { buildPracticeQuestionsFromEngine } from "../components/practice/practiceQuestionBuilder";

const FIXTURE = resolve(__dirname, "predictionCore.orderParity.fixture.json");
const SEEDS = [1, 2, 3] as const;

type Entry = { n: number; sha256: string; head: string[] };
type Baseline = {
  targetYear: string;
  chapters: Record<string, Entry>;
  concepts: Record<string, Entry>;
  practice: Record<string, Entry>;
};

function entry(ids: string[]): Entry {
  return {
    n: ids.length,
    sha256: createHash("sha256").update(ids.join("\n")).digest("hex"),
    head: ids.slice(0, 3),
  };
}

/** mulberry32 — a fixed, tiny PRNG so a shuffled set is reproducible. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function capture(): Baseline {
  const chapters: Record<string, Entry> = {};
  const concepts: Record<string, Entry> = {};
  const practice: Record<string, Entry> = {};
  for (const slug of BANK_CHAPTER_SLUGS) {
    const rows = PredictionCore.getLikelyQuestionsForConcept(slug);
    chapters[slug] = entry(rows.map((q) => String(q.id)));
    const subtopics = [...new Set(rows.map((q) => String(q.subtopic ?? "")).filter(Boolean))].sort();
    // One entry per chapter over ALL its concepts: line i is "<concept>	<ordered ids>".
    concepts[slug] = entry(
      subtopics.map(
        (concept) =>
          `${concept}	${PredictionCore.getLikelyQuestionsForConcept(slug, concept)
            .map((q) => String(q.id))
            .join(",")}`,
      ),
    );
    const subjectKey = BANK_CHAPTER_SUBJECT[slug] === "Science" ? "Science" : "Maths";
    for (const seed of SEEDS) {
      const spy = vi.spyOn(Math, "random").mockImplementation(seeded(seed));
      try {
        const served = buildPracticeQuestionsFromEngine({
          subjectKey,
          topicKey: slug,
          count: 10,
          difficulty: "All",
        });
        practice[`${slug}::seed${seed}`] = entry(served.map((q) => String(q.id)));
      } finally {
        spy.mockRestore();
      }
    }
  }
  return { targetYear: String(import.meta.env.VITE_PREDICTION_TARGET_YEAR), chapters, concepts, practice };
}

describe("L3 / P18 — Practice ordering is identical to the pre-change baseline", () => {
  beforeAll(() => {
    // The Bayesian term depends on the prediction target year; pin it so the baseline does
    // not move on 1 January.
    vi.stubEnv("VITE_PREDICTION_TARGET_YEAR", "2026");
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("every chapter, every concept and every seeded Practice set orders exactly as the baseline", () => {
    const now = capture();
    if (process.env.LT_WRITE_ORDER_PARITY === "1") {
      writeFileSync(FIXTURE, `${JSON.stringify(now, null, 1)}\n`);
    }
    expect(existsSync(FIXTURE), "the baseline fixture must be committed").toBe(true);
    const baseline = JSON.parse(readFileSync(FIXTURE, "utf8")) as Baseline;

    // The comparison covers something real, not three empty maps.
    expect(Object.keys(baseline.chapters).sort()).toEqual([...BANK_CHAPTER_SLUGS].sort());
    expect(Object.keys(baseline.chapters)).toHaveLength(26);
    expect(Object.keys(baseline.concepts)).toHaveLength(26);
    expect(Object.values(baseline.concepts).reduce((sum, e) => sum + e.n, 0)).toBeGreaterThan(1000);
    expect(Object.keys(baseline.practice)).toHaveLength(26 * SEEDS.length);
    expect(Object.values(baseline.chapters).every((e) => e.n > 0)).toBe(true);

    expect(now.targetYear).toBe(baseline.targetYear);
    expect(now.chapters).toEqual(baseline.chapters);
    expect(now.concepts).toEqual(baseline.concepts);
    expect(now.practice).toEqual(baseline.practice);
  });
});
