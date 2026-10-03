// @vitest-environment node
/**
 * GUARD — BANK-SPLIT-1 PR-2 (L2, L3, L4, L5): the per-chapter bank is the aggregator, split.
 *
 * The aggregator (canonicalQuestionBank.ts) stays the one source of truth. Everything the
 * app now reads per chapter must be provably the same rows, in the same order:
 *   1. every generated file under src/data/bankChapters/ is byte-for-byte what the
 *      generator derives from the aggregator RIGHT NOW (chapter modules, registry, id index);
 *   2. for every chapter, the loaded rows ARE the aggregator's rows of that slug (same
 *      objects, same order), and the union over chapters IS the served aggregator;
 *   3. the AI-pack and withheld id sets carried per chapter equal the aggregator's;
 *   4. PredictionCore built per chapter / per subject equals the whole-bank build filtered;
 *   5. the id index answers exactly what the bank answered;
 *   6. reading a chapter that was not loaded throws (never a silent []).
 * A mismatch means a pack or the aggregator moved: regenerate (pnpm run gen:bank-chapters),
 * do not relax an assertion.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import type { CanonicalQuestion } from "../predictionTypes";
import {
  RAW_CANONICAL_QUESTION_BANK,
  canonicalQuestionBank,
  WITHHELD_QUESTION_IDS,
  AI_GENERATED_QUESTION_IDS,
} from "../canonicalQuestionBank";
import { resolveCanonicalSlug } from "../syllabus/canonicalTopicSlug";
import { allDesktopTopics } from "../../lib/desktop/topics";
import {
  parseAggregator,
  planChapters,
  renderAll,
  renderBankIdIndex,
  type ChapterPlan,
} from "../../../scripts/bankChapters/renderBankChapters";
import {
  BANK_CHAPTER_SLUGS,
  BankChapterNotLoadedError,
  __resetBankChaptersForTest,
  ensureAllBankChapters,
  ensureBankChapters,
  getBankRows,
  getBankRowsForSubject,
  isAiGeneratedBankId,
} from "./loader";
import { PredictionCore, getAdjustedScore, type CanonicalQuestionWithScore } from "../predictionCore";
import { selectBankQuestions } from "../bankQuery";
import { conceptForQuestionId } from "../../services/progressBankIndex";

const DATA = resolve(process.cwd(), "src/data");
const DIR = resolve(DATA, "bankChapters");
const HAND_WRITTEN = new Set(["defineChapter.ts", "loader.ts", "bankIdIndex.ts", "useBankChapters.ts"]);

const packs = import.meta.glob("../questionBanks/**/*.ts", { eager: true }) as Record<
  string,
  Record<string, unknown>
>;

const slugOf = (q: { topicKey: string }) => resolveCanonicalSlug(q.topicKey);
const ids = (rows: readonly { id: string }[]) => rows.map((q) => q.id);

let plans: ChapterPlan[];
let expected: Map<string, string>;

beforeAll(async () => {
  const shape = parseAggregator(readFileSync(resolve(DATA, "canonicalQuestionBank.ts"), "utf8"));
  const arrays = new Map<string, readonly CanonicalQuestion[]>();
  for (const name of shape.spreads) {
    const key = `..${shape.imports.get(name)!.slice(1)}.ts`;
    const arr = packs[key]?.[name];
    if (!Array.isArray(arr)) throw new Error(`no array ${name} in ${key}`);
    arrays.set(name, arr as CanonicalQuestion[]);
  }
  const chapters = allDesktopTopics().map((t) => ({ slug: t.slug, subject: t.subject as "Maths" | "Science" }));
  plans = planChapters(shape, arrays, WITHHELD_QUESTION_IDS, chapters, resolveCanonicalSlug);
  expected = renderAll(plans, canonicalQuestionBank);
  await ensureAllBankChapters();
});

describe("L2/L3 · the generated files are what the generator derives from the aggregator", () => {
  it("every generated file is byte-for-byte the generator's output RIGHT NOW", () => {
    const stale: string[] = [];
    for (const [rel, text] of expected) {
      if (readFileSync(resolve(DIR, rel), "utf8") !== text) stale.push(rel);
    }
    expect(stale, "regenerate with: pnpm run gen:bank-chapters").toEqual([]);
    expect(expected.size).toBe(BANK_CHAPTER_SLUGS.length + 2);
  });

  it("there is no stray module in src/data/bankChapters (only generated + the hand-written four)", () => {
    const extra = readdirSync(DIR).filter(
      (f) => f.endsWith(".ts") && !f.includes(".test.") && !expected.has(f) && !HAND_WRITTEN.has(f),
    );
    expect(extra).toEqual([]);
  });

  it("CONTROL: the byte compare detects one changed id-index entry", () => {
    const tampered = canonicalQuestionBank.map((q, i) => (i === 100 ? { ...q, subtopic: `${q.subtopic}x` } : q));
    expect(renderBankIdIndex(tampered)).not.toBe(expected.get("bankIdIndex.generated.ts"));
  });

  it("the spread arrays concatenate to RAW_CANONICAL_QUESTION_BANK row for row", () => {
    const shape = parseAggregator(readFileSync(resolve(DATA, "canonicalQuestionBank.ts"), "utf8"));
    const concat = shape.spreads.flatMap((n) => packs[`..${shape.imports.get(n)!.slice(1)}.ts`][n] as CanonicalQuestion[]);
    expect(concat.length).toBe(RAW_CANONICAL_QUESTION_BANK.length);
    expect(concat.every((q, i) => q === RAW_CANONICAL_QUESTION_BANK[i])).toBe(true);
  });
});

describe("L3 · chapter parity: the loaded rows ARE the aggregator's rows", () => {
  it("for every chapter: same row objects, same order as canonicalQuestionBank filtered to the slug", () => {
    const bad: string[] = [];
    for (const slug of BANK_CHAPTER_SLUGS) {
      const want = canonicalQuestionBank.filter((q) => slugOf(q) === slug);
      const got = getBankRows([slug]);
      if (got.length !== want.length || got.some((q, i) => q !== want[i])) {
        bad.push(`${slug}: got ${got.length}, aggregator ${want.length}`);
      }
      expect(want.length, `${slug} has no rows`).toBeGreaterThan(0);
    }
    expect(bad).toEqual([]);
  });

  it("the union over all chapters IS the served aggregator (ids AND order), and each subject is too", () => {
    const all = getBankRows(BANK_CHAPTER_SLUGS);
    expect(all.length).toBe(canonicalQuestionBank.length);
    expect(all.every((q, i) => q === canonicalQuestionBank[i])).toBe(true);
    for (const subject of ["Maths", "Science"]) {
      const want = canonicalQuestionBank.filter((q) => q.subject === subject);
      const got = getBankRowsForSubject(subject);
      expect(ids(got)).toEqual(ids(want));
    }
    // eslint-disable-next-line no-console
    console.log(`BANK_CHAPTERS: chapters=${BANK_CHAPTER_SLUGS.length} rows=${all.length} served=${canonicalQuestionBank.length}`);
  });

  it("the AI-pack ids carried per chapter equal AI_GENERATED_QUESTION_IDS, row by row", () => {
    const mismatched = canonicalQuestionBank.filter((q) => isAiGeneratedBankId(q.id) !== AI_GENERATED_QUESTION_IDS.has(q.id));
    expect(ids(mismatched)).toEqual([]);
    const missing = [...AI_GENERATED_QUESTION_IDS].filter((id) => !isAiGeneratedBankId(id));
    expect(missing).toEqual([]);
  });

  it("the withheld ids listed per chapter equal WITHHELD_QUESTION_IDS ∩ RAW", () => {
    const listed = plans.flatMap((p) => p.withheld).sort();
    const rawIds = new Set(ids(RAW_CANONICAL_QUESTION_BANK));
    expect(listed).toEqual([...WITHHELD_QUESTION_IDS].filter((id) => rawIds.has(id)).sort());
    expect(plans.reduce((n, p) => n + p.servedRows, 0)).toBe(canonicalQuestionBank.length);
  });
});

describe("L4/L5 · PredictionCore per chapter / per subject equals the whole-bank build", () => {
  const view = (rows: readonly CanonicalQuestionWithScore[]) =>
    rows.map((q) => `${q.id}|${q._source}|${q._adjustedScore}|${getAdjustedScore(q)}`);

  it("getLikelyQuestionsForConcept(slug) == getAllQuestions() filtered to the exact slug, sorted", () => {
    const all = PredictionCore.getAllQuestions() as CanonicalQuestionWithScore[];
    for (const slug of BANK_CHAPTER_SLUGS) {
      const want = all.filter((q) => slugOf(q) === slug).sort((a, b) => getAdjustedScore(b) - getAdjustedScore(a));
      const got = PredictionCore.getLikelyQuestionsForConcept(slug) as CanonicalQuestionWithScore[];
      expect(view(got), slug).toEqual(view(want));
    }
  });

  it("getQuestionsForSubject(s) == getAllQuestions().filter(subject) (same rows, order and scores)", () => {
    const all = PredictionCore.getAllQuestions() as CanonicalQuestionWithScore[];
    for (const subject of ["Maths", "Science"]) {
      const got = PredictionCore.getQuestionsForSubject(subject) as CanonicalQuestionWithScore[];
      expect(view(got)).toEqual(view(all.filter((q) => q.subject === subject)));
    }
  });

  it("exact slug: circles and areas-related-to-circles no longer return each other's rows", () => {
    const circles = PredictionCore.getLikelyQuestionsForConcept("circles");
    const areas = PredictionCore.getLikelyQuestionsForConcept("areas-related-to-circles");
    expect(circles.length).toBeGreaterThan(0);
    expect(areas.length).toBeGreaterThan(0);
    expect(circles.every((q) => slugOf(q) === "circles")).toBe(true);
    expect(areas.every((q) => slugOf(q) === "areas-related-to-circles")).toBe(true);
  });
});

describe("L2 · the id index answers exactly what the bank answered", () => {
  it("conceptForQuestionId(id) for every served id equals the derivation over the bank rows", () => {
    const bad: string[] = [];
    for (const q of canonicalQuestionBank) {
      const want = {
        subtopic: typeof q.subtopic === "string" ? q.subtopic.trim() : "",
        section: typeof q.section === "string" ? q.section.trim() : "",
        topicKey: String(q.topicKey || "").trim().toLowerCase(),
      };
      const got = conceptForQuestionId(q.id);
      if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(q.id);
    }
    expect(bad).toEqual([]);
    const withheld = [...WITHHELD_QUESTION_IDS].filter((id) => conceptForQuestionId(id) !== null);
    expect(withheld, "a withheld row must not resolve").toEqual([]);
  });
});

describe("L4 · a chapter that was not loaded THROWS — never a silent []", () => {
  it("CONTROL: with the cache empty every sync bank API throws BankChapterNotLoadedError", async () => {
    __resetBankChaptersForTest();
    try {
      expect(() => getBankRows(["triangles"])).toThrow(BankChapterNotLoadedError);
      expect(() => selectBankQuestions({ subject: "Maths", topicKeys: ["triangles"] })).toThrow(BankChapterNotLoadedError);
      expect(() => PredictionCore.getLikelyQuestionsForConcept("triangles")).toThrow(BankChapterNotLoadedError);
      expect(() => PredictionCore.getQuestionsForSubject("Maths")).toThrow(BankChapterNotLoadedError);
      expect(() => PredictionCore.getAllQuestions()).toThrow(BankChapterNotLoadedError);
      // A key that is not a bank chapter has no rows to load: an honest [], not a throw.
      expect(getBankRows(["not-a-chapter"])).toEqual([]);
      // Loading one chapter makes exactly that chapter readable.
      await ensureBankChapters(["Triangles"]);
      expect(getBankRows(["triangles"]).length).toBeGreaterThan(0);
      expect(() => getBankRows(["circles"])).toThrow(BankChapterNotLoadedError);
    } finally {
      await ensureAllBankChapters();
    }
  });
});
