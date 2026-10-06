// QUICK-FIXES-1 PR-1 — Q1 pin: a FULL-SUBJECT Quick Practice set draws from EVERY board
// chapter of the subject, in proportion to served questions, no chapter above 30% of a set.
//
// The pipeline below is the one PracticePage runs for a full-subject arrival: the hub's
// own query helper → PracticePage's resolver → one board-blueprint fetch per chapter
// (the unchanged per-topic engine call) → composeFullSubjectSet, weighted by each
// chapter's SERVED rows. 20 seeded sets per subject.
//
// THE DEFECT IT PINS (P4): the hub sent no scope and PracticePage fell back to its default
// chapter, so every "full subject" set was Real Numbers (or Chemical Reactions) only.
// CONTROL: the same draw with the old single default chapter must FAIL assertion (c).

import { beforeAll, describe, expect, it } from "vitest";
import {
  appendFullSubjectScope,
  allocateFullSubjectCounts,
  composeFullSubjectSet,
  fullSubjectChapterKeys,
  resolveFullSubjectChapterKeys,
  FULL_SUBJECT_MAX_CHAPTER_SHARE,
} from "./fullSubjectPractice";
import { buildPracticeQuestionsWithAiTopup, resolvePracticePackKey } from "./practiceQuestionBuilder";
import { ensureAllBankChapters, getBankRows } from "../../data/bankChapters/loader";
import { WITHHELD_QUESTION_IDS } from "../../data/canonicalQuestionBank";
import { BOARD_CHAPTER_KEYS, chapterUnit } from "../../config/syllabus2026-27";
import { resolveTopicDisplayName } from "../../utils/topicResolver";
import type { PracticeQuestion } from "../../data/predictionDataService";
import type { PerTopicPool } from "./multiTopicPractice";

const DEFAULT_SET_SIZE = 10; // PracticePage's recommendedCount default
const SEEDS = Array.from({ length: 20 }, (_, i) => 1 + i * 7919);
const SUBJECTS = [
  { subjectKey: "Maths" as const, lower: "maths" as const },
  { subjectKey: "Science" as const, lower: "science" as const },
];

// PracticePage's multi-topic board blueprint (MT_BLUEPRINT), verbatim.
const MT_BLUEPRINT: Array<{ section: "A" | "B" | "C" | "D" | "E"; share: number }> = [
  { section: "A", share: 0.3 },
  { section: "B", share: 0.2 },
  { section: "C", share: 0.2 },
  { section: "D", share: 0.2 },
  { section: "E", share: 0.1 },
];

async function fetchPools(subjectKey: "Maths" | "Science", keys: string[]): Promise<PerTopicPool[]> {
  return Promise.all(
    keys.map(async (key) => {
      const label = resolveTopicDisplayName(subjectKey, key);
      const packKey = resolvePracticePackKey({ subjectKey, topicParam: key, explicitTopicKey: key });
      const parts = await Promise.all(
        MT_BLUEPRINT.map(({ section, share }) =>
          buildPracticeQuestionsWithAiTopup({
            grade: "10",
            subjectKey,
            topicLabel: label,
            packTopicKey: packKey,
            count: Math.max(1, Math.round(DEFAULT_SET_SIZE * share)),
            difficulty: "All",
            sectionFilter: section,
          }),
        ),
      );
      return { key, questions: parts.flat() };
    }),
  );
}

function chapterOf(pools: PerTopicPool[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of pools) for (const q of p.questions) m.set(String(q.id), p.key);
  return m;
}

function shares(set: PracticeQuestion[], byId: Map<string, string>): Map<string, number> {
  const out = new Map<string, number>();
  for (const q of set) {
    const ch = byId.get(String(q.id)) ?? "?";
    out.set(ch, (out.get(ch) ?? 0) + 1);
  }
  return out;
}

beforeAll(async () => {
  await ensureAllBankChapters();
}, 60000);

describe("full-subject Quick Practice (QUICK-FIXES-1 Q1)", () => {
  for (const { subjectKey, lower } of SUBJECTS) {
    describe(subjectKey, () => {
      // The hub's URL → PracticePage's chapter set.
      const sp = new URLSearchParams();
      appendFullSubjectScope(sp, subjectKey, "All");
      const keys = resolveFullSubjectChapterKeys(sp, subjectKey);
      const boardKeys = BOARD_CHAPTER_KEYS.filter((k) => chapterUnit(k)?.subject === lower);

      it("the hub's full-subject URL resolves to EVERY board chapter of the subject", () => {
        expect(sp.get("scope")).toBe("full-subject");
        expect(boardKeys.length).toBe(13);
        expect([...keys].sort()).toEqual([...boardKeys].sort());
      });

      it("20 seeded sets: max chapter share ≤ 30%, every served chapter appears, ≥ 6 chapters per set, no withheld row", async () => {
        const pools = await fetchPools(subjectKey, keys);
        const byId = chapterOf(pools);
        const weights = new Map(keys.map((k) => [k, getBankRows([k]).length]));
        const servedChapters = keys.filter((k) => (weights.get(k) ?? 0) > 0);
        expect(servedChapters.length).toBeGreaterThanOrEqual(6);

        const seen = new Set<string>();
        const perSet: number[] = [];
        let maxShare = 0;
        for (const seed of SEEDS) {
          const set = composeFullSubjectSet({ pools, weights, total: DEFAULT_SET_SIZE, seed });
          expect(set.length).toBe(DEFAULT_SET_SIZE);
          for (const q of set) expect(WITHHELD_QUESTION_IDS.has(String(q.id))).toBe(false);
          const s = shares(set, byId);
          for (const [ch, n] of s) {
            seen.add(ch);
            maxShare = Math.max(maxShare, n / set.length);
          }
          perSet.push(s.size);
          // (a) no chapter above 30% of THIS set
          expect(Math.max(...s.values()) / set.length).toBeLessThanOrEqual(FULL_SUBJECT_MAX_CHAPTER_SHARE);
          // (c) a typical (default-size) set spans ≥ 6 chapters
          expect(s.size).toBeGreaterThanOrEqual(6);
          // (a) under SKEW too: the real bank is balanced enough that proportional alone stays
          // under 30%, so the cap is exercised with one chapter weighted 50x (a lopsided
          // bank) — the same real pools, the same seed. Without the cap it would take ~80%.
          const skew = new Map(weights);
          skew.set(keys[0], (weights.get(keys[0]) ?? 1) * 50);
          const lop = composeFullSubjectSet({ pools, weights: skew, total: DEFAULT_SET_SIZE, seed });
          const ls = shares(lop, byId);
          expect(Math.max(...ls.values()) / lop.length).toBeLessThanOrEqual(FULL_SUBJECT_MAX_CHAPTER_SHARE);
        }
        // (b) across the 20 sets, every board chapter with served questions appears
        expect(servedChapters.filter((k) => !seen.has(k))).toEqual([]);
        const sorted = [...perSet].sort((a, b) => a - b);
        // Evidence line for the report (min / median chapters per set, max share).
        console.info(
          `[Q1] ${subjectKey}: chapters/set min ${sorted[0]} median ${sorted[Math.floor(sorted.length / 2)]}; max share ${(maxShare * 100).toFixed(0)}%`,
        );
      }, 60000);

      it("deterministic: the same seed draws the same set", async () => {
        const pools = await fetchPools(subjectKey, keys);
        const weights = new Map(keys.map((k) => [k, getBankRows([k]).length]));
        const a = composeFullSubjectSet({ pools, weights, total: DEFAULT_SET_SIZE, seed: 42 });
        const b = composeFullSubjectSet({ pools, weights, total: DEFAULT_SET_SIZE, seed: 42 });
        expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
      }, 60000);

      it("CONTROL: the pre-fix draw (one default chapter) fails the ≥ 6-chapter bar", async () => {
        // No scope on the URL → not a full-subject request → PracticePage's default chapter.
        expect(resolveFullSubjectChapterKeys(new URLSearchParams("source=practice"), subjectKey)).toEqual([]);
        const fallback = subjectKey === "Science" ? "chemical-reactions-and-equations" : "real-numbers";
        const pools = await fetchPools(subjectKey, [fallback]);
        const set = composeFullSubjectSet({ pools, total: DEFAULT_SET_SIZE, seed: 1, maxShare: 1 });
        expect(shares(set, chapterOf(pools)).size).toBeLessThan(6);
      }, 60000);
    });
  }

  it("a Science stream narrows the chapter set to that stream", () => {
    const physics = fullSubjectChapterKeys("Science", "Physics");
    expect(physics.length).toBeGreaterThan(0);
    expect(physics.length).toBeLessThan(13);
    expect(physics).toContain("electricity");
    expect(physics).not.toContain("life-processes");
  });

  it("an explicit topic= or topics= is never a full-subject request", () => {
    expect(resolveFullSubjectChapterKeys(new URLSearchParams("scope=full-subject&topic=polynomials"), "Maths")).toEqual([]);
    expect(resolveFullSubjectChapterKeys(new URLSearchParams("scope=full-subject&topics=a,b"), "Maths")).toEqual([]);
  });

  it("allocation never exceeds the cap and stays honestly short when the pool is thin", () => {
    const alloc = allocateFullSubjectCounts(
      [
        { key: "a", weight: 1000, poolSize: 50 },
        { key: "b", weight: 1, poolSize: 1 },
      ],
      10,
      7,
    );
    expect(alloc.get("a")).toBe(3); // 30% of 10 — the rich chapter cannot swamp the set
    expect(alloc.get("b")).toBe(1);
  });
});
