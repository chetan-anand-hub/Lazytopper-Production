// @vitest-environment node
//
// WITHHOLD-METAL-007 (18 Oct 2026; owner ruling ~23:52 IST, from a student's WhatsApp report at 23:42 IST) - pins this lane's one withhold.
//
// PYQ-S-2026-METAL-007 is CBSE 2026 31/4/1 Q12: "(A) Varun is diabetic ... pancreatic duct ... OR (B) Sunil ... hot iron rod ...
// reflex action". That is Control & Coordination (Biology), but the row is filed under metals-and-non-metals, so a student saw it
// as Q7 of a Chemistry test. Owner ruling: withhold ONLY this row now; the row stays unchanged in metalsNonMetals.pyq2026.ts for
// the later re-file-and-repair lane, and no other row is touched.
// Mechanism (the #1222 WITHHOLD-TRI-GDR-1 pattern): the id in the BANK-STEPS-1 PAUSE block of WITHHELD_QUESTION_IDS + a `paused`
// WRONG-CONTENT entry in bankSteps1Ledger.ts; gen:bank-chapters adds it to the chapter's withheld list.
//
// Import-based: every pool is built from the real modules, never from file text. Surfaces: the served bank, the chapter loader
// (Practice, Solutions, selectBankQuestions), PredictionCore (Topic Hub / Practice engine), Quick Practice (practice builder +
// generatePracticeSet), Chapter Test, Worksheet, Full Mock, "Try a board question" and Important Questions (HPQ).
import { describe, expect, it, vi } from "vitest";
import "../../test/preloadBankChapters";
import { RAW_CANONICAL_QUESTION_BANK, WITHHELD_QUESTION_IDS, canonicalQuestionBank } from "../canonicalQuestionBank";
import { getBankRows, getBankRowsForSubject } from "../bankChapters/loader";
import { selectBankQuestions } from "../bankQuery";
import { resolveCanonicalSlug } from "../syllabus/canonicalTopicSlug";
import { PredictionCore } from "../predictionCore";
import { generatePracticeSet } from "../practiceSetGenerator";
import { getHighlyProbableQuestions } from "../highlyProbableQuestions";
import { buildPracticeQuestionsFromEngine } from "../../components/practice/practiceQuestionBuilder";
import { drawChapterTest, isEligibleForChapterTest } from "../../components/chaptertest/chapterTestBlueprint";
import { FM_BLUEPRINT, buildUnionPool, fullMockChapterWeights, sectionPool } from "../../components/fullmock/fullMockBlueprint";
import { getTopics, planWorksheet } from "../../components/worksheet/worksheetModel";
import { pickBoardTryQuestion } from "../../components/checkimprove/boardQuestionPick";

const ID = "PYQ-S-2026-METAL-007";
const SUBJECT = "Science" as const;
const SLUG = "metals-and-non-metals";
const STEM = "Varun is diabetic";

const RAW = new Map(RAW_CANONICAL_QUESTION_BANK.map((q) => [q.id, q]));
const FIXED_CREATED_AT = "2026-01-01T00:00:00.000Z";
const SEEDS = Array.from({ length: 30 }, (_, i) => ((i + 1) * 2654435761) >>> 0);

function seeded(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

describe("WITHHOLD-METAL-007 - the served bank", () => {
  it("the row is still in the raw bank (withhold, never delete), in WITHHELD_QUESTION_IDS and not served", () => {
    expect(RAW.has(ID), "must stay in the raw bank").toBe(true);
    expect(WITHHELD_QUESTION_IDS.has(ID)).toBe(true);
    expect(canonicalQuestionBank.some((q) => q.id === ID)).toBe(false);
  });

  it("no served row carries the Varun stem", () => {
    expect(canonicalQuestionBank.filter((q) => String(q.questionText ?? "").includes(STEM)).map((q) => q.id)).toEqual([]);
  });

  it("the served bank drops by exactly this one row (no bank-wide total is pinned)", () => {
    const servedWithoutThisLane = RAW_CANONICAL_QUESTION_BANK.filter((q) => !WITHHELD_QUESTION_IDS.has(q.id) || q.id === ID);
    expect(RAW_CANONICAL_QUESTION_BANK.filter((q) => q.id === ID).length).toBe(1);
    expect(canonicalQuestionBank.length).toBe(servedWithoutThisLane.length - 1);
  });

  it("the chapter loader, the subject loader and selectBankQuestions no longer return it", () => {
    expect(getBankRows([SLUG]).some((q) => q.id === ID)).toBe(false);
    expect(getBankRowsForSubject(SUBJECT).some((q) => q.id === ID)).toBe(false);
    expect(selectBankQuestions({ subject: SUBJECT, topicKeys: [SLUG] }).some((q) => q.id === ID)).toBe(false);
    expect(getBankRows([SLUG]).length).toBeGreaterThan(0);
  });

  it("PredictionCore (Topic Hub / Practice engine) never returns it", () => {
    expect(PredictionCore.getLikelyQuestionsForConcept(SLUG).some((q) => q.id === ID)).toBe(false);
    expect(PredictionCore.getLikelyQuestionsForConcept(SLUG, "General").some((q) => q.id === ID)).toBe(false);
    expect(PredictionCore.getQuestionsForSubject(SUBJECT).some((q) => q.id === ID)).toBe(false);
    expect(PredictionCore.getLikelyQuestionsForConcept(SLUG).length).toBeGreaterThan(0);
  });
});

describe("WITHHOLD-METAL-007 - every serving surface excludes the row", () => {
  it("Quick Practice: no seeded Practice set on Metals contains it (30 seeds, 10 questions)", () => {
    let served = 0;
    for (const seed of SEEDS) {
      const spy = vi.spyOn(Math, "random").mockImplementation(seeded(seed));
      try {
        const ids = buildPracticeQuestionsFromEngine({ subjectKey: SUBJECT, topicKey: SLUG, count: 10, difficulty: "All" }).map((q) => String(q.id));
        served += ids.length;
        expect(ids, `seed ${seed}`).not.toContain(ID);
      } finally {
        spy.mockRestore();
      }
    }
    expect(served).toBeGreaterThan(0);
  });

  it("Quick Practice: generatePracticeSet on Metals (whole chapter and the row's own 'General' concept) never contains it", () => {
    for (const conceptKey of [undefined, "General"]) {
      const set = generatePracticeSet({ subject: SUBJECT, topicKey: SLUG, conceptKey, totalQuestions: 50, shuffle: false });
      expect(set.questions.map((q) => q.id), String(conceptKey)).not.toContain(ID);
    }
  });

  it("Chapter Test: no draw on Metals contains it (30 seeds)", () => {
    let drawn = 0;
    for (const seed of SEEDS) {
      const t = drawChapterTest({ subject: SUBJECT, topicKey: SLUG, topicLabel: SLUG, worksheetId: "ct-wh", createdAt: FIXED_CREATED_AT, seed });
      drawn += t.paper.questions.length;
      expect(t.paper.questions.map((q) => q.id), `seed ${seed}`).not.toContain(ID);
    }
    expect(drawn).toBeGreaterThan(0);
  });

  it("Worksheet: absent from every Science topic pool", () => {
    let pooled = 0;
    for (const t of getTopics(SUBJECT)) {
      const plan = planWorksheet({ subject: SUBJECT, scope: "topic", topics: [t], requested: 10 });
      const ids = (plan.pools.get(t.key) ?? []).map((q) => q.id);
      pooled += ids.length;
      expect(ids, t.key).not.toContain(ID);
    }
    expect(pooled).toBeGreaterThan(0);
  });

  it("Full Mock: absent from the Science union pool and every section pool", () => {
    const slugs = new Set(fullMockChapterWeights(SUBJECT).map((c) => c.slug));
    expect(slugs.has(SLUG)).toBe(true);
    const pool = buildUnionPool(SUBJECT, slugs);
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.map((q) => q.id)).not.toContain(ID);
    for (const spec of FM_BLUEPRINT) expect(sectionPool(pool, spec.section).map((q) => q.id), spec.section).not.toContain(ID);
  });

  it("Try a board question: walking every Science offer never yields it", async () => {
    const offered = new Set<string>();
    for (let rotation = 0; rotation < 2000; rotation += 1) {
      const q = await pickBoardTryQuestion({ subject: SUBJECT, exclude: offered, rotation });
      if (!q || offered.has(q.id)) break; // nothing fresh left: the picker repeats
      offered.add(q.id);
    }
    expect(offered.size).toBeGreaterThan(0);
    expect(offered.has(ID)).toBe(false);
  });

  it("Important Questions (HPQ, its own curated set): carries neither the id nor the stem", () => {
    const hpq = JSON.stringify(getHighlyProbableQuestions(SUBJECT));
    expect(hpq.length).toBeGreaterThan(2);
    expect(hpq.includes(ID)).toBe(false);
    expect(hpq.includes(STEM)).toBe(false);
  });

  it("CONTROL: the raw row resolves to Metals and is Chapter-Test eligible, so the pool checks are not vacuous", () => {
    const row = RAW.get(ID)!;
    expect(row.subject).toBe(SUBJECT);
    expect(resolveCanonicalSlug(row.topicKey)).toBe(SLUG);
    expect(String(row.questionText)).toContain(STEM);
    expect(isEligibleForChapterTest(row)).toBe(true);
  });
});
