// src/data/predictionCore.ts
//
// PredictionCore is a thin wrapper around the canonical question bank.  It
// provides helper functions to fetch questions by topic and to sort them
// by an optional prediction score.  In the full implementation these
// functions will incorporate policy weighting, recency and other factors.

import type { BloomLevel, CanonicalQuestion, DifficultyLevel, QuestionFormat } from "./predictionTypes";
// BANK-SPLIT-1 PR-2 (L4): canonical rows come from the per-chapter cache, never the
// aggregator. The route awaits ensureBankChapters / ensureBankSubject first; every read
// below is synchronous and throws BankChapterNotLoadedError for a chapter not loaded.
import {
  BANK_CHAPTER_SLUGS,
  BankChapterNotLoadedError,
  getBankRows,
  getBankRowsForSubject,
  isAiGeneratedBankId,
  isBankChapterLoaded,
  isBankChapterSlug,
} from "./bankChapters/loader";
import { resolveCanonicalSlug } from "./syllabus/canonicalTopicSlug";
import { predictedQuestions } from "./predictedQuestions";
import { predictedQuestionsScience } from "./predictedQuestionsScience";
import { class10ScienceTopicTrends } from "./class10ScienceTopicTrends";
import { QUESTION_TYPE_MULTIPLIER } from "../data/cbseCompetencyPolicy";
import { computePredictionScore } from "./predictionScoring";
import { getCanonicalHistoricalDataset } from "../prediction/historicalDataset";
import { scoreTopicRecurrenceConfidence } from "../prediction/probabilisticScoring";
import {
  isMathsDeletedForYear,
  isScienceDeletedFor2026_27,
  SCIENCE_DELETED_CHAPTERS_2026_27,
} from "../prediction/cbseHistoricalArchetypes";

// ---------------------------------------------------------------------------
// AI-tier source provenance + ranking (AI-tier PR2a)
// ---------------------------------------------------------------------------
// Tier of a question, derived at ingest from its source file (see
// canonicalQuestionBank.ts `AI_GENERATED_QUESTION_IDS`):
//   - "authentic"    : NCERT / Exemplar / PYQ / SQP / SP / CBE / preboard /
//                      additionalPQ / chapterwise + curated inline items.
//   - "ai-generated" : `.pack1` / `.pack2` / `.pack3` AI packs.
//   - "predicted"    : the predicted-board layer (predictedQuestions[Science]).
//                      A distinct, curated-prediction tier that sits BETWEEN
//                      authentic and AI: more deliberate than a raw AI pack,
//                      but not a verifiable past-paper source.
//
// The field lives on this LOCAL intersection type (the same pattern already
// used for `_adjustedScore`) so the canonical `CanonicalQuestion` type in the
// gated `predictionTypes.ts` is NOT touched. It is stamped at merge time and
// read by `getSourceMultiplier` to soft-demote non-authentic questions.
export type QuestionSource = "authentic" | "ai-generated" | "predicted";

// Soft (NOT hard) ranking multipliers. Authentic ranks at full strength; the
// others are demoted but can still surface when authentic is thin for a topic.
// Tunable in ONE place — owner may collapse "predicted" into "ai-generated" by
// setting both to the same value.
const SOURCE_MULTIPLIER: Record<QuestionSource, number> = {
  authentic: 1.0,
  predicted: 0.6,
  "ai-generated": 0.3,
};

export type CanonicalQuestionWithScore = CanonicalQuestion & {
  _adjustedScore?: number;
  _source?: QuestionSource;
};

const scienceTopicDisplayByKey: Record<string, string> = Object.values(
  class10ScienceTopicTrends.topics
).reduce<Record<string, string>>((acc, entry) => {
  acc[entry.topicKey] = entry.topicName;
  return acc;
}, {});

function normaliseTopic(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]/g, "");
}

function toCanonicalFormat(kind: string | undefined): QuestionFormat {
  const k = String(kind || "").toLowerCase();
  if (k === "mcq") return "MCQ";
  if (k === "assertion-reasoning") return "Assertion-Reasoning";
  if (k === "case-based") return "Case-Based";
  if (k === "long") return "Long";
  return "Short";
}

function toBloomLevel(raw: string | undefined): BloomLevel {
  const value = String(raw || "Understanding");
  if (
    value === "Remembering" ||
    value === "Understanding" ||
    value === "Applying" ||
    value === "Analysing" ||
    value === "Evaluating" ||
    value === "Creating"
  ) {
    return value;
  }
  return "Understanding";
}

function toDifficulty(raw: string | undefined): DifficultyLevel {
  const value = String(raw || "Medium");
  if (value === "Easy" || value === "Medium" || value === "Hard") return value;
  return "Medium";
}

function toCanonicalFromMathPredicted(): CanonicalQuestionWithScore[] {
  return predictedQuestions.map((q) => ({
    _source: "predicted" as const,
    id: q.id,
    subject: "Maths",
    topicKey: q.topicKey,
    subtopic: q.subtopic,
    section: q.section,
    marks: q.marks,
    format: toCanonicalFormat(q.kind),
    difficulty: toDifficulty(q.difficulty),
    bloomSkill: toBloomLevel(q.bloomSkill),
    questionText: q.questionText,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    solutionSteps: q.solutionSteps,
    finalAnswer: q.finalAnswer,
    strategyHint: q.strategyHint,
    policyTag: q.policyTag,
  }));
}

function toCanonicalFromSciencePredicted(): CanonicalQuestionWithScore[] {
  return predictedQuestionsScience.map((q) => ({
    _source: "predicted" as const,
    id: q.id,
    subject: "Science",
    topicKey: scienceTopicDisplayByKey[q.topicKey] ?? q.topicKey,
    subtopic: q.subtopic,
    section: q.section,
    marks: q.marks,
    format: toCanonicalFormat(q.kind),
    difficulty: toDifficulty(q.difficulty),
    bloomSkill: toBloomLevel(q.bloomSkill),
    questionText: q.questionText,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    solutionSteps: q.solutionSteps,
    finalAnswer: q.finalAnswer,
    strategyHint: q.strategyHint,
    policyTag: q.policyTag,
  }));
}

// Exported for the PR2b dedup unit test (predictionCore.pastboardyear.test.ts).
// Not part of the page-facing API.
export function dedupeById<T extends CanonicalQuestion>(questions: T[]): T[] {
  const byId = new Map<string, T>();
  for (const q of questions) {
    const existing = byId.get(q.id);
    if (!existing) {
      byId.set(q.id, q);
      continue;
    }

    // Prefer the higher-scoring duplicate. A former pastBoardYear tiebreaker
    // (prefer the dup that HAS a pastBoardYear) was removed with the AI-tier
    // PR2b provenance strip: predicted questions no longer carry a fabricated
    // pastBoardYear and the authentic bank never had one, so that clause was
    // always false. Dedup is now score-only.
    const existingScore = Number(existing.predictionScore ?? 0);
    const nextScore = Number(q.predictionScore ?? 0);
    if (nextScore > existingScore) {
      byId.set(q.id, q);
    }
  }
  return Array.from(byId.values());
}

function isScienceDeletedQuestion(q: CanonicalQuestion, targetYear: number): boolean {
  if (q.subject !== "Science") return false;
  if (targetYear < SCIENCE_DELETED_CHAPTERS_2026_27.effectiveFromYear) return false;
  return isScienceDeletedFor2026_27(q.topicKey, q.subtopic);
}

// The predicted layer, converted once (maths first, then science — the merge order).
let predictedMemo: CanonicalQuestionWithScore[] | null = null;
function getPredictedQuestions(): CanonicalQuestionWithScore[] {
  if (predictedMemo === null) {
    predictedMemo = [...toCanonicalFromMathPredicted(), ...toCanonicalFromSciencePredicted()];
  }
  return predictedMemo;
}

// The unified-bank pipeline over ANY slice of the canonical rows (in aggregator order)
// plus the matching slice of the predicted layer. Over the whole bank this is exactly
// the pre-split buildUnifiedQuestionBank; over one chapter or one subject it equals the
// whole-bank result filtered to that chapter or subject (bankChapters.guard.test.ts
// proves it row for row, scores included, for every chapter and both subjects).
function buildUnified(
  canonicalRows: readonly CanonicalQuestion[],
  predicted: readonly CanonicalQuestionWithScore[],
): CanonicalQuestionWithScore[] {
  const targetYear = predictionTargetYear();

  // Stamp tier provenance at the point the source-of-origin is still known.
  // Canonical rows carry no `_source`; classify each item by its membership in the
  // AI-pack id set captured at ingest (AI_GENERATED_QUESTION_IDS, carried per chapter).
  // The predicted layer already carries `_source: "predicted"` from its converters above.
  const stampedCanonical: CanonicalQuestionWithScore[] = canonicalRows.map(
    (q) => ({
      ...q,
      _source: isAiGeneratedBankId(q.id)
        ? ("ai-generated" as const)
        : ("authentic" as const),
    })
  );

  const merged = dedupeById([
    ...stampedCanonical,
    ...predicted,
  ]).filter((q) => !isScienceDeletedQuestion(q, targetYear));

  return merged.map((q) => {
    const explicit = Number(q.predictionScore ?? 0);
    const adjustedBase = explicit > 0 ? explicit : computePredictionScore(q);
    return { ...q, _adjustedScore: adjustedBase };
  });
}

function assertLoaded(slugs: readonly string[]): void {
  const missing = slugs.filter((s) => isBankChapterSlug(s) && !isBankChapterLoaded(s));
  if (missing.length) throw new BankChapterNotLoadedError(missing);
}

function buildUnifiedQuestionBank(): CanonicalQuestionWithScore[] {
  return buildUnified(getBankRows(BANK_CHAPTER_SLUGS), getPredictedQuestions());
}

// ★ BUILT ON FIRST USE, NOT AT IMPORT — PERF-1.
//
// These two were module-scope `const`s, so merely importing this file built the whole
// unified bank: two full object-spread clones of every row, a dedupe, a filter, and a
// prediction score each. Measured in real Chromium on an unthrottled desktop, that
// froze the main thread for ~10.6 s in ONE task on every page that reaches this module
// — the page painted at 460 ms and was then unresponsive. It is a product defect first
// and an SEO one second: a student on a mid-range phone waits several times longer.
//
// ⚠ THE COST IS DEFERRED, NOT REMOVED. The first caller still pays it. What changes is
// WHO pays: a visitor reading a chapter page never asks for a prediction, so they now
// pay nothing. That is the whole win, and it is why this is not a rewrite of the
// scoring — the scoring is byte-identical, proven by dumping the built bank before and
// after and comparing the SHA-256 of every row in order.
//
// ⚠ SAFE ONLY BECAUSE NOTHING READS THESE AT MODULE SCOPE. Every reader is inside a
// function: the three `PredictionCore` methods below and `getBayesianMultiplier`. All
// six external call sites are inside exported functions too. A module-scope read in
// another file would have had to change with this, which is what turns a small fix
// into a large one — there is none.
let unifiedQuestionBankMemo: CanonicalQuestionWithScore[] | null = null;
function getUnifiedQuestionBank(): CanonicalQuestionWithScore[] {
  assertLoaded(BANK_CHAPTER_SLUGS);
  if (unifiedQuestionBankMemo === null) {
    unifiedQuestionBankMemo = buildUnifiedQuestionBank();
  }
  return unifiedQuestionBankMemo;
}

// BANK-SPLIT-1 PR-2: the same unified bank, built per canonical chapter slug (a route
// loads one chapter) and per subject (Full Mock / Exam Simulation load one subject).
// Same first-use memo as above, keyed. The loaded check runs on EVERY call, so a memo
// can never stand in for a chapter the route did not load.
const unifiedBySlugMemo = new Map<string, CanonicalQuestionWithScore[]>();
function getUnifiedForSlug(slug: string): CanonicalQuestionWithScore[] {
  assertLoaded([slug]);
  let rows = unifiedBySlugMemo.get(slug);
  if (!rows) {
    rows = buildUnified(
      isBankChapterSlug(slug) ? getBankRows([slug]) : [],
      getPredictedQuestions().filter((q) => topicMatches(q.topicKey, slug)),
    );
    unifiedBySlugMemo.set(slug, rows);
  }
  return rows;
}

const unifiedBySubjectMemo = new Map<string, CanonicalQuestionWithScore[]>();
function getUnifiedForSubject(subject: string): CanonicalQuestionWithScore[] {
  // getBankRowsForSubject throws when a chapter of the subject is not loaded. The exact
  // subject filter keeps the old `getAllQuestions().filter(q => q.subject === subject)`.
  const canonicalRows = getBankRowsForSubject(subject).filter((q) => q.subject === subject);
  let rows = unifiedBySubjectMemo.get(subject);
  if (!rows) {
    rows = buildUnified(
      canonicalRows,
      getPredictedQuestions().filter((q) => q.subject === subject),
    );
    unifiedBySubjectMemo.set(subject, rows);
  }
  return rows;
}

let historicalItemsMemo: ReturnType<typeof getCanonicalHistoricalDataset>["items"] | null = null;
function getHistoricalItems(): ReturnType<typeof getCanonicalHistoricalDataset>["items"] {
  if (historicalItemsMemo === null) {
    historicalItemsMemo = getCanonicalHistoricalDataset().items;
  }
  return historicalItemsMemo;
}

const bayesianScoreCache = new Map<string, number>();

function predictionTargetYear(): number {
  const envValue = Number(import.meta.env?.VITE_PREDICTION_TARGET_YEAR || "");
  if (Number.isFinite(envValue) && envValue >= 2018) return envValue;
  return new Date().getFullYear();
}

function policyRegimeForYear(targetYear: number) {
  if (targetYear >= 2023) return "nep_competency_2023_plus" as const;
  if (targetYear >= 2020) return "nep_transition_2020_2022" as const;
  return "nep_pre_2020" as const;
}

// LOW-END-1 (L3) — THE RECURRENCE SCORE IS SHARED BY EVERY QUESTION WITH THE SAME INPUTS.
//
// scoreTopicRecurrenceConfidence (prediction/probabilisticScoring.ts) is a pure function.
// It reads `subject`, `topic`, `format` and `bloom` from its input, and `subtopic` ONLY inside
// its two syllabus-deletion guards; `marks`, `policyTag` and `sourceYearHint` are passed but
// never read. The rest is the memoised historical dataset and the target year. So every
// question with the same (year, subject, topic, format, bloom) — and, for a deleted
// sub-topic, the same sub-topic — gets the same multiplier. A chapter of ~400 rows has a few
// dozen such combinations; scanning the historical dataset once PER ROW was Practice's
// first-open freeze (LOW-END-SCOUT-1 P6: 2,054 of a 2,174 ms task on profile A).
//
// ⚠ If probabilisticScoring.ts ever reads another input field, this key must grow with it.
// predictionCore.l3Memo.test.ts recomputes EVERY bank row without the memo and requires the
// memoised value to be identical, so a stale key fails there, not silently in production.
// The per-id cache above stays the first lookup, exactly as before.
const bayesianByInputs = new Map<string, number>();

function isDeletedForScoring(q: CanonicalQuestionWithScore, targetYear: number): boolean {
  // The two guards at the top of scoreTopicRecurrenceConfidence, verbatim in condition.
  if (
    q.subject === "Science" &&
    targetYear >= SCIENCE_DELETED_CHAPTERS_2026_27.effectiveFromYear &&
    isScienceDeletedFor2026_27(q.topicKey, q.subtopic)
  ) {
    return true;
  }
  return q.subject === "Maths" && isMathsDeletedForYear(q.topicKey, q.subtopic, targetYear);
}

function bayesianInputKey(q: CanonicalQuestionWithScore, targetYear: number): string {
  const subtopic = isDeletedForScoring(q, targetYear) ? q.subtopic : "";
  // typeof-prefixed so undefined, null, 2 and "2" can never share a key.
  return [targetYear, q.subject, q.topicKey, q.format, q.bloomSkill, subtopic]
    .map((v) => `${typeof v}:${String(v)}`)
    .join("\u0001");
}

/**
 * The multiplier computed from scratch — no cache of any kind. Exported for
 * predictionCore.l3Memo.test.ts ONLY, which proves the memoised path equals it for every
 * bank row. Not a page-facing API.
 */
export function computeBayesianMultiplierUncached(q: CanonicalQuestionWithScore): number {
  const targetYear = predictionTargetYear();
  const scored = scoreTopicRecurrenceConfidence({
    input: {
      subject: q.subject,
      topic: q.topicKey,
      subtopic: q.subtopic,
      marks: q.marks,
      format: q.format,
      bloom: q.bloomSkill,
      policyTag: q.policyTag,
      // pastBoardYear was stripped (PR2b); recurrence is derived from the
      // historical dataset's sourceYear, so this hint falls to the prior year.
      sourceYearHint: targetYear - 1,
    },
    context: {
      targetYear,
      policyRegime: policyRegimeForYear(targetYear),
      topicTrendWeight: q.subject === "Science" ? 1.08 : 1.02,
    },
    historicalItems: getHistoricalItems(),
  });

  return 0.85 + scored.posterior * 1.15 + scored.confidence * 0.6;
}

/** Exported for predictionCore.l3Memo.test.ts ONLY (the memoised path it compares). */
export function getBayesianMultiplier(q: CanonicalQuestionWithScore): number {
  const cached = bayesianScoreCache.get(q.id);
  if (cached != null) return cached;

  const inputKey = bayesianInputKey(q, predictionTargetYear());
  let multiplier = bayesianByInputs.get(inputKey);
  if (multiplier === undefined) {
    multiplier = computeBayesianMultiplierUncached(q);
    bayesianByInputs.set(inputKey, multiplier);
  }
  bayesianScoreCache.set(q.id, multiplier);
  return multiplier;
}

// BANK-SPLIT-1 PR-2 (L5): topic matching is EXACT canonical slug (cofounder ruling).
// It was a two-way substring test on normaliseTopic, so "circles" also returned every
// areas-related-to-circles row and vice versa — the only cross-match among the 26
// chapters. Both sides now resolve to their one topics.ts slug and must be equal.
function topicMatches(questionTopic: string, requestedTopic: string): boolean {
  const q = resolveCanonicalSlug(questionTopic);
  const r = resolveCanonicalSlug(requestedTopic);
  if (!q || !r) return false;
  return q === r;
}

// The concept (subtopic) filter keeps the original two-way substring rule unchanged.
function subtopicMatches(questionSubtopic: string, requestedConcept: string): boolean {
  const q = normaliseTopic(questionSubtopic);
  const r = normaliseTopic(requestedConcept);
  if (!q || !r) return false;
  if (q === r) return true;
  return q.includes(r) || r.includes(q);
}

function getQuestionTypeMultiplier(q: CanonicalQuestion): number {
  // Map canonical formats to policy keys.
  const fmt = (q.format ?? "").toLowerCase();
  if (fmt === "mcq") return QUESTION_TYPE_MULTIPLIER.mcq ?? 1.0;
  if (fmt === "assertion-reasoning")
    return QUESTION_TYPE_MULTIPLIER.assertionReasoning ?? 1.0;
  if (fmt === "case-based") return QUESTION_TYPE_MULTIPLIER.caseBased ?? 1.0;
  // Long/Short/VSA tend to be more traditional unless explicitly tagged.
  if ((q.policyTag ?? "").toLowerCase().includes("case")) {
    return QUESTION_TYPE_MULTIPLIER.caseBased ?? 1.0;
  }
  return QUESTION_TYPE_MULTIPLIER.traditional ?? 1.0;
}

function getBloomMultiplier(q: CanonicalQuestion): number {
  // Lightweight heuristic: gently boost Applying/Analysing (competency focus).
  switch (q.bloomSkill) {
    case "Applying":
      return 1.12;
    case "Analysing":
      return 1.15;
    case "Evaluating":
      return 1.05;
    case "Remembering":
      return 0.92;
    default:
      return 1.0;
  }
}

/**
 * Soft AI-lower ranking term. Authentic questions keep full weight; predicted
 * and AI-generated questions are demoted (but never excluded), so authenticated
 * questions surface first while AI can still appear when authentic is thin.
 * Unstamped questions default to authentic — we never demote on missing data.
 *
 * Exported (AI-tier FU-RANK-MOCKS-HPQ) so the mock engines reuse this ONE
 * SOURCE_MULTIPLIER for their per-slot selection instead of forking a copy.
 * Accepts a bare CanonicalQuestion too — the `_source` field is optional, and
 * the unified bank returned by getAllQuestions() carries it stamped at ingest.
 */
export function getSourceMultiplier(q: CanonicalQuestionWithScore): number {
  return SOURCE_MULTIPLIER[q._source ?? "authentic"];
}

// Exported for ranking unit tests (predictionCore.source.test.ts). Not part of
// the page-facing API — pages use PredictionCore.getLikelyQuestionsForConcept.
export function getAdjustedScore(q: CanonicalQuestionWithScore): number {
  const baseRaw = Number(q._adjustedScore ?? q.predictionScore ?? 0);
  const base = baseRaw > 0 ? baseRaw : 1;
  return (
    base *
    getQuestionTypeMultiplier(q) *
    getBloomMultiplier(q) *
    getBayesianMultiplier(q) *
    getSourceMultiplier(q)
  );
}

export const PredictionCore = {
  /**
   * Return all canonical questions (Maths + Science). Needs every chapter loaded
   * (ensureAllBankChapters); live routes use getQuestionsForSubject instead.
   */
  getAllQuestions(): CanonicalQuestion[] {
    return getUnifiedQuestionBank();
  },

  /**
   * All questions of one subject: identical to getAllQuestions() filtered by subject.
   * Needs that subject's chapters loaded (ensureBankSubject).
   */
  getQuestionsForSubject(subject: string): CanonicalQuestion[] {
    return getUnifiedForSubject(subject);
  },

  /**
   * Lookup a question by ID.
   */
  getQuestionById(id: string): CanonicalQuestion | undefined {
    return getUnifiedQuestionBank().find((q) => q.id === id);
  },

  /**
   * Get likely questions for a topic / concept key.
   * Questions are sorted in descending order of predictionScore (if present);
   * undefined scores default to zero.
   */
  getLikelyQuestionsForConcept(
    topicKey: string,
    conceptKey?: string
  ): CanonicalQuestion[] {
    // Exact slug: the chapter's unified rows are exactly the whole-bank rows whose
    // topicKey resolves to the requested slug (see getUnifiedForSlug). Needs that
    // chapter loaded (ensureBankChapters([topicKey])).
    const slug = resolveCanonicalSlug(topicKey);
    if (!slug) return [];
    // LOW-END-1 (L3) — decorate-sort: each adjusted score is computed ONCE, not on both
    // sides of every comparison. Same comparator values, same stable sort, same order.
    return getUnifiedForSlug(slug)
      .filter((q) => (conceptKey ? subtopicMatches(q.subtopic, conceptKey) : true))
      .map((q) => ({ q, score: getAdjustedScore(q) }))
      .sort((a, b) => b.score - a.score)
      .map((d) => d.q);
  },
};
