// @vitest-environment node
//
// HIDE8-FIG8-1 Part A (19 Oct 2026; owner rulings 06:54 IST "if the bank per topic is healthy ... lets hide them" and 07:08 IST
// "okay then dont hide them, fix the questions. Allow 'wrong chapter' as a reason to hide -- yes") - pins this lane's 3 withholds.
//
// The 3 REFILE-PYQ2026-1 blocked-R rows are correct CBSE 2026 board questions filed under the WRONG chapter, and could not be re-filed
// because LTG rows cite them as templates (ltGenerated.guard requires a template's id-chapter code to name the chapter it sits in):
//   PYQ-S-2026-CHEMRXN-001  31/2/1 Q5   photosynthesis events          Life Processes, filed under chemical-reactions-and-equations
//   PYQ-S-2026-CHEMRXN-004  31/2/3 Q5   photosynthesis equation        Life Processes, filed under chemical-reactions-and-equations
//   PYQ-S-2026-ELEC-010     31/3/3 Q39  wire colours / earthing / fuse Magnetic Effects, filed under electricity
// Mechanism (the #1257 WITHHOLD-METAL-007 pattern): the ids in the BANK-STEPS-1 PAUSE block of WITHHELD_QUESTION_IDS + `paused`
// WRONG-CHAPTER entries in bankSteps1Ledger.ts; gen:bank-chapters adds them to their chapters' withheld lists. ltGenerated.guard
// accepts a paused WRONG-CHAPTER row as a "misfiled" withheld template, so the LTG rows modelled on them stay served.
//
// Import-based: every pool is built from the real modules, never from file text. MUTATION: dropping any one id from
// WITHHELD_QUESTION_IDS turns this file RED (the served-bank, loader and pool tests).
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
import { drawChapterTest } from "../../components/chaptertest/chapterTestBlueprint";
import { FM_BLUEPRINT, buildUnionPool, fullMockChapterWeights, sectionPool } from "../../components/fullmock/fullMockBlueprint";
import { getTopics, planWorksheet } from "../../components/worksheet/worksheetModel";
import { pickBoardTryQuestion } from "../../components/checkimprove/boardQuestionPick";
import { BANK_STEPS_1 } from "./bankSteps1Ledger";

const SUBJECT = "Science" as const;
/** id -> [chapter it is filed under, a stem fragment, the LTG rows that cite it as their template] */
const ROWS: ReadonlyArray<readonly [string, string, string, readonly string[]]> = [
  ["PYQ-S-2026-CHEMRXN-001", "chemical-reactions-and-equations", "The following events occur during the process of photosynthesis", ["LTG-S-CHEMRXN-254", "LTG-S-CHEMRXN-311"]],
  ["PYQ-S-2026-CHEMRXN-004", "chemical-reactions-and-equations", "correct balanced equation for the process of photosynthesis", ["LTG-S-CHEMRXN-264"]],
  ["PYQ-S-2026-ELEC-010", "electricity", "three different connecting wires of three different colours", ["LTG-S-ELEC-299"]],
];
const IDS = ROWS.map(([id]) => id);
const SLUGS = [...new Set(ROWS.map(([, slug]) => slug))];
const RAW = new Map(RAW_CANONICAL_QUESTION_BANK.map((q) => [q.id, q]));
const SERVED = new Set(canonicalQuestionBank.map((q) => q.id));
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
const noneOf = (ids: readonly string[]) => ids.filter((id) => IDS.includes(id));

describe("HIDE8-FIG8-1 Part A - the served bank", () => {
  it("each row is still in the raw bank (withhold, never delete), in WITHHELD_QUESTION_IDS and not served", () => {
    for (const id of IDS) {
      expect(RAW.has(id), `${id} must stay in the raw bank`).toBe(true);
      expect(WITHHELD_QUESTION_IDS.has(id), id).toBe(true);
      expect(SERVED.has(id), id).toBe(false);
    }
  });

  it("each is a paused WRONG-CHAPTER entry of the BANK-STEPS-1 ledger", () => {
    for (const id of IDS) {
      const e = BANK_STEPS_1.find((x) => x.id === id);
      expect(e?.verdict, id).toBe("WRONG-CHAPTER");
      expect(e?.state, id).toBe("paused");
    }
    expect(BANK_STEPS_1.filter((e) => e.verdict === "WRONG-CHAPTER").map((e) => e.id).sort()).toEqual([...IDS].sort());
  });

  it("no served row carries their stems", () => {
    for (const [id, , stem] of ROWS) expect(canonicalQuestionBank.filter((q) => String(q.questionText ?? "").includes(stem)).map((q) => q.id), id).toEqual([]);
  });

  it("the served bank drops by exactly these three rows", () => {
    const servedWithoutThisLane = RAW_CANONICAL_QUESTION_BANK.filter((q) => !WITHHELD_QUESTION_IDS.has(q.id) || IDS.includes(q.id));
    expect(canonicalQuestionBank.length).toBe(servedWithoutThisLane.length - 3);
  });

  it("the LTG rows modelled on them stay served and keep their provenance (shapedFrom unchanged)", () => {
    for (const [id, , , ltg] of ROWS) {
      for (const g of ltg) {
        expect(SERVED.has(g), `${g} must stay served`).toBe(true);
        expect(String(RAW.get(g)?.shapedFrom), g).toBe(id);
      }
    }
  });

  it("the chapter loader, the subject loader, selectBankQuestions and PredictionCore no longer return them", () => {
    for (const slug of SLUGS) {
      expect(noneOf(getBankRows([slug]).map((q) => q.id)), slug).toEqual([]);
      expect(noneOf(selectBankQuestions({ subject: SUBJECT, topicKeys: [slug] }).map((q) => q.id)), slug).toEqual([]);
      expect(noneOf(PredictionCore.getLikelyQuestionsForConcept(slug).map((q) => String(q.id))), slug).toEqual([]);
      expect(getBankRows([slug]).length, slug).toBeGreaterThan(0);
    }
    expect(noneOf(getBankRowsForSubject(SUBJECT).map((q) => q.id))).toEqual([]);
    expect(noneOf(PredictionCore.getQuestionsForSubject(SUBJECT).map((q) => String(q.id)))).toEqual([]);
  });
});

describe("HIDE8-FIG8-1 Part A - every serving surface excludes the rows", () => {
  it("Quick Practice: no seeded Practice set on either chapter contains them (30 seeds, 10 questions)", () => {
    let served = 0;
    for (const slug of SLUGS) {
      for (const seed of SEEDS) {
        const spy = vi.spyOn(Math, "random").mockImplementation(seeded(seed));
        try {
          const ids = buildPracticeQuestionsFromEngine({ subjectKey: SUBJECT, topicKey: slug, count: 10, difficulty: "All" }).map((q) => String(q.id));
          served += ids.length;
          expect(noneOf(ids), `${slug} seed ${seed}`).toEqual([]);
        } finally {
          spy.mockRestore();
        }
      }
      const set = generatePracticeSet({ subject: SUBJECT, topicKey: slug, totalQuestions: 50, shuffle: false });
      expect(noneOf(set.questions.map((q) => q.id)), slug).toEqual([]);
    }
    expect(served).toBeGreaterThan(0);
  });

  it("Chapter Test: no draw on either chapter contains them (30 seeds)", () => {
    let drawn = 0;
    for (const slug of SLUGS) {
      for (const seed of SEEDS) {
        const t = drawChapterTest({ subject: SUBJECT, topicKey: slug, topicLabel: slug, worksheetId: "ct-h8", createdAt: FIXED_CREATED_AT, seed });
        drawn += t.paper.questions.length;
        expect(noneOf(t.paper.questions.map((q) => q.id)), `${slug} seed ${seed}`).toEqual([]);
      }
    }
    expect(drawn).toBeGreaterThan(0);
  });

  it("Worksheet: absent from every Science topic pool", () => {
    let pooled = 0;
    for (const t of getTopics(SUBJECT)) {
      const plan = planWorksheet({ subject: SUBJECT, scope: "topic", topics: [t], requested: 10 });
      const ids = (plan.pools.get(t.key) ?? []).map((q) => q.id);
      pooled += ids.length;
      expect(noneOf(ids), t.key).toEqual([]);
    }
    expect(pooled).toBeGreaterThan(0);
  });

  it("Full Mock: absent from the Science union pool and every section pool", () => {
    const slugs = new Set(fullMockChapterWeights(SUBJECT).map((c) => c.slug));
    for (const slug of SLUGS) expect(slugs.has(slug), slug).toBe(true);
    const pool = buildUnionPool(SUBJECT, slugs);
    expect(pool.length).toBeGreaterThan(0);
    expect(noneOf(pool.map((q) => q.id))).toEqual([]);
    for (const spec of FM_BLUEPRINT) expect(noneOf(sectionPool(pool, spec.section).map((q) => q.id)), spec.section).toEqual([]);
  });

  it("Try a board question: walking every Science offer never yields them", async () => {
    const offered = new Set<string>();
    for (let rotation = 0; rotation < 2000; rotation += 1) {
      const q = await pickBoardTryQuestion({ subject: SUBJECT, exclude: offered, rotation });
      if (!q || offered.has(q.id)) break;
      offered.add(q.id);
    }
    expect(offered.size).toBeGreaterThan(0);
    expect(noneOf([...offered])).toEqual([]);
  });

  it("Important Questions (HPQ): carries none of the ids", () => {
    const hpq = JSON.stringify(getHighlyProbableQuestions(SUBJECT));
    expect(hpq.length).toBeGreaterThan(2);
    for (const id of IDS) expect(hpq.includes(id), id).toBe(false);
  });

  it("CONTROL: each raw row resolves to the chapter it is filed under, so the pool checks are not vacuous", () => {
    for (const [id, slug, stem] of ROWS) {
      const row = RAW.get(id)!;
      expect(row.subject, id).toBe(SUBJECT);
      expect(resolveCanonicalSlug(row.topicKey), id).toBe(slug);
      expect(String(row.questionText), id).toContain(stem);
    }
  });
});
