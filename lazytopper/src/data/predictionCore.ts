// src/data/predictionCore.ts
//
// PredictionCore is a thin wrapper around the canonical question bank.  It
// provides helper functions to fetch questions by topic and to sort them
// by an optional prediction score.  In the full implementation these
// functions will incorporate policy weighting, recency and other factors.

import type { BloomLevel, CanonicalQuestion, DifficultyLevel, QuestionFormat } from "./predictionTypes";
import { canonicalQuestionBank, AI_GENERATED_QUESTION_IDS } from "./canonicalQuestionBank";
import { predictedQuestions } from "./predictedQuestions";
import { predictedQuestionsScience } from "./predictedQuestionsScience";
import { class10ScienceTopicTrends } from "./class10ScienceTopicTrends";
import { QUESTION_TYPE_MULTIPLIER } from "../data/cbseCompetencyPolicy";
import { computePredictionScore } from "./predictionScoring";
import { getCanonicalHistoricalDataset } from "../prediction/historicalDataset";
import { scoreTopicRecurrenceConfidence } from "../prediction/probabilisticScoring";
import {
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

function buildUnifiedQuestionBank(): CanonicalQuestionWithScore[] {
  const targetYear = predictionTargetYear();

  // Stamp tier provenance at the point the source-of-origin is still known.
  // canonicalQuestionBank carries no `_source`; classify each item by its
  // membership in the AI-pack id set captured at ingest. The predicted layer
  // already carries `_source: "predicted"` from its converters above.
  const stampedCanonical: CanonicalQuestionWithScore[] = canonicalQuestionBank.map(
    (q) => ({
      ...q,
      _source: AI_GENERATED_QUESTION_IDS.has(q.id)
        ? ("ai-generated" as const)
        : ("authentic" as const),
    })
  );

  const merged = dedupeById([
    ...stampedCanonical,
    ...toCanonicalFromMathPredicted(),
    ...toCanonicalFromSciencePredicted(),
  ]).filter((q) => !isScienceDeletedQuestion(q, targetYear));

  return merged.map((q) => {
    const explicit = Number(q.predictionScore ?? 0);
    const adjustedBase = explicit > 0 ? explicit : computePredictionScore(q);
    return { ...q, _adjustedScore: adjustedBase };
  });
}

const unifiedQuestionBank: CanonicalQuestionWithScore[] = buildUnifiedQuestionBank();
const historicalItems = getCanonicalHistoricalDataset().items;
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

function getBayesianMultiplier(q: CanonicalQuestionWithScore): number {
  const cached = bayesianScoreCache.get(q.id);
  if (cached != null) return cached;

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
    historicalItems,
  });

  const multiplier = 0.85 + scored.posterior * 1.15 + scored.confidence * 0.6;
  bayesianScoreCache.set(q.id, multiplier);
  return multiplier;
}

function topicMatches(questionTopic: string, requestedTopic: string): boolean {
  const q = normaliseTopic(questionTopic);
  const r = normaliseTopic(requestedTopic);
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
   * Return all canonical questions (Maths + Science).
   */
  getAllQuestions(): CanonicalQuestion[] {
    return unifiedQuestionBank;
  },

  /**
   * Lookup a question by ID.
   */
  getQuestionById(id: string): CanonicalQuestion | undefined {
    return unifiedQuestionBank.find((q) => q.id === id);
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
    return unifiedQuestionBank
      .filter((q) => topicMatches(q.topicKey, topicKey))
      .filter((q) => (conceptKey ? topicMatches(q.subtopic, conceptKey) : true))
      .sort((a, b) => getAdjustedScore(b) - getAdjustedScore(a));
  },
};
