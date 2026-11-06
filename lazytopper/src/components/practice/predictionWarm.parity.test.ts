// SPEED-HUB-2 — the time-sliced warm-up must serve EXACTLY the questions the synchronous
// path serves, for every chapter of both subjects.
//
// `warmLikelyQuestions` (data/predictionCore.ts) does the first-use work of
// getLikelyQuestionsForConcept — the chapter merge, every row's prediction score and every
// row's ranking score — in slices that yield to the browser, so the CBQ page no longer
// freezes for ~0.5 s after a chapter tap. It must not move a single question.
//
// The fixture beside this file was captured from the UNCHANGED trunk code (90e0a68) before
// predictionCore.ts was touched, with LT_WRITE_WARM_PARITY=1. For every bank chapter it
// stores length + sha256 of:
//   - rows:  every served row in order, in full (JSON, incl. `_adjustedScore` and `_source`);
//   - rank:  the ordered ids with their ranking score (getAdjustedScore);
//   - cbq:   the CBQ practice pool the CBQ landing builds from (buildCbqPracticePool);
//   - pool:  the chapter's full served pool (buildChapterServedPool, the chip counts);
//   - draws: the seeded 10-question Quick Practice draw ("All", the Board-mix shape) and the
//            4-mark draw (marksFilter 4, the case-study band) — three seeds each.
// and for each subject the whole getQuestionsForSubject list (Full Mock / Exam Simulation).
//
// Each capture runs in a FRESH module graph (vi.resetModules) so no memo leaks between them:
//   (1) cold synchronous path, exactly as trunk;
//   (2) warmLikelyQuestions for every chapter first, then the same reads.
// Both must equal the trunk fixture.

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURE = resolve(__dirname, "predictionWarm.parity.fixture.json");
const SEEDS = [1, 2, 3] as const;

type Entry = { n: number; sha256: string };
type Snapshot = Record<string, Entry>;

function entry(lines: string[]): Entry {
  return { n: lines.length, sha256: createHash("sha256").update(lines.join("\n")).digest("hex") };
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

async function capture(warmFirst: boolean): Promise<Snapshot> {
  vi.resetModules();
  const loader = await import("../../data/bankChapters/loader");
  await loader.ensureAllBankChapters();
  const core = await import("../../data/predictionCore");
  const builder = await import("./practiceQuestionBuilder");

  if (warmFirst) {
    const warm = (core as { warmLikelyQuestions?: (keys: readonly string[]) => Promise<void> })
      .warmLikelyQuestions;
    expect(typeof warm).toBe("function");
    await warm!(loader.BANK_CHAPTER_SLUGS);
  }

  const out: Snapshot = {};
  for (const slug of loader.BANK_CHAPTER_SLUGS) {
    const subjectKey = loader.BANK_CHAPTER_SUBJECT[slug] === "Science" ? "Science" : "Maths";
    const rows = core.PredictionCore.getLikelyQuestionsForConcept(slug);
    out[`${slug}::rows`] = entry(rows.map((q) => JSON.stringify(q)));
    out[`${slug}::rank`] = entry(rows.map((q) => `${q.id}\t${core.getAdjustedScore(q)}`));
    out[`${slug}::cbq`] = entry(
      builder.buildCbqPracticePool({ subjectKey, topicKey: slug }).map((q) => String(q.id)),
    );
    out[`${slug}::pool`] = entry(
      builder.buildChapterServedPool({ subjectKey, topicKey: slug }).map((q) => String(q.id)),
    );
    for (const seed of SEEDS) {
      for (const [name, args] of [
        ["marks4", { marksFilter: 4 }],
        ["all", {}],
      ] as const) {
        const spy = vi.spyOn(Math, "random").mockImplementation(seeded(seed));
        try {
          const served = builder.buildPracticeQuestionsFromEngine({
            subjectKey,
            topicKey: slug,
            count: 10,
            difficulty: "All",
            ...args,
          });
          out[`${slug}::${name}::seed${seed}`] = entry(served.map((q) => String(q.id)));
        } finally {
          spy.mockRestore();
        }
      }
    }
  }
  for (const subject of ["Maths", "Science"]) {
    out[`subject::${subject}`] = entry(
      core.PredictionCore.getQuestionsForSubject(subject).map((q) => JSON.stringify(q)),
    );
  }
  return out;
}

describe("SPEED-HUB-2 — warmLikelyQuestions serves exactly the trunk questions", () => {
  beforeAll(() => {
    // The ranking depends on the prediction target year; pin it so the fixture does not
    // move on 1 January.
    vi.stubEnv("VITE_PREDICTION_TARGET_YEAR", "2026");
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("cold sync path and warmed path both equal the trunk fixture, every chapter + both subjects", async () => {
    const cold = await capture(false);
    if (process.env.LT_WRITE_WARM_PARITY === "1") {
      writeFileSync(FIXTURE, `${JSON.stringify(cold, null, 1)}\n`);
      return;
    }
    expect(existsSync(FIXTURE), "the trunk fixture must be committed").toBe(true);
    const baseline = JSON.parse(readFileSync(FIXTURE, "utf8")) as Snapshot;

    // The comparison covers something real: 26 chapters x 10 keys + 2 subjects.
    expect(Object.keys(baseline)).toHaveLength(26 * 10 + 2);
    expect(Object.entries(baseline).filter(([k]) => k.endsWith("::rows")).every(([, e]) => e.n > 0)).toBe(true);
    expect(Object.entries(baseline).filter(([k]) => k.endsWith("::cbq")).some(([, e]) => e.n > 0)).toBe(true);

    expect(cold).toEqual(baseline);
    const warmed = await capture(true);
    expect(warmed).toEqual(baseline);
  }, 600_000);
});
