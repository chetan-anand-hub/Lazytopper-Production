// LazyTopper – Difficulty Auto-Suggest Utility
// Location: src/prediction/difficultyAutoSuggest.ts
// Purpose: Traverse canonical question bank and compute suggested Easy/Medium/Hard
//          difficulty labels using the v1 policy defined in docs/difficultyPolicy_v1.md.

import { PredictionCore } from "../data/predictionCore";

export type DifficultyLabel = "easy" | "medium" | "hard";

// Minimal view of a canonical question with only the fields we need.
// We keep this intentionally loose so it remains compatible with the
// existing canonicalQuestionBank without requiring tight coupling.
export interface CanonicalQuestionLike {
  id?: string;
  topicKey?: string;
  marks?: number;
  bloomLevel?: string;
  format?: string;
  steps?: number;
  calculationLoad?: string;
  hasMultiConcept?: boolean;
  chapterImportance?: string;
  difficulty?: string | DifficultyLabel;
  canonicalDifficulty?: string | DifficultyLabel;
  [key: string]: any;
}

export interface DifficultySuggestion {
  id: string;
  topicKey: string;
  existingDifficulty: DifficultyLabel | null;
  suggestedDifficulty: DifficultyLabel;
  changed: boolean;
  marks: number | null;
  bloomLevel?: string;
  format?: string;
}

export interface DifficultySnapshot {
  totalQuestions: number;
  distribution: Record<DifficultyLabel, number>;
  changedCount: number;
  suggestions: DifficultySuggestion[];
}

// --- Internal helpers -------------------------------------------------------

function normaliseDifficultyLabel(value: unknown): DifficultyLabel | null {
  if (!value) return null;
  const s = String(value).trim().toLowerCase();
  if (!s) return null;
  if (s === "e" || s === "easy") return "easy";
  if (s === "m" || s === "medium" || s === "med") return "medium";
  if (s === "h" || s === "hard") return "hard";
  return null;
}

function normaliseBloomLevel(value: unknown): string {
  if (!value) return "understand";
  return String(value).trim().toLowerCase();
}

function normaliseFormat(value: unknown): string {
  if (!value) return "";
  return String(value).trim().toLowerCase();
}

function normaliseCalculationLoad(value: unknown): string {
  if (!value) return "low";
  return String(value).trim().toLowerCase();
}

function toNumberOrNull(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// --- Core policy implementation --------------------------------------------

// This function implements the v1 difficulty policy described in
// docs/difficultyPolicy_v1.md. It is a pure function of metadata and does not
// depend on student performance.
export function suggestDifficulty(meta: CanonicalQuestionLike): DifficultyLabel {
  const marks = toNumberOrNull(meta.marks) ?? 2; // default mid-band if unknown
  const bloom = normaliseBloomLevel(meta.bloomLevel);
  const format = normaliseFormat(meta.format);
  const steps = toNumberOrNull(meta.steps) ?? 1;
  const calcLoad = normaliseCalculationLoad(meta.calculationLoad);
  const hasMultiConcept = Boolean(meta.hasMultiConcept);

  // 1) Base band from marks
  let score: 0 | 1 | 2;
  if (marks <= 1) {
    score = 0; // easy
  } else if (marks <= 3) {
    score = 1; // medium
  } else {
    score = 2; // hard
  }

  // 2) Bloom adjustment
  let bloomOffset = 0;
  if (bloom === "remember") {
    bloomOffset = -1;
  } else if (bloom === "analyze" || bloom === "analyse" || bloom === "evaluate" || bloom === "create") {
    bloomOffset = 1;
  } else {
    bloomOffset = 0; // understand/apply or unknown
  }

  let adjustedScore = score + bloomOffset;
  if (adjustedScore < 0) adjustedScore = 0;
  if (adjustedScore > 2) adjustedScore = 2;

  // 3) Format / structure nudges (at most +1, only for easy/medium)
  let structureScore = 0;

  const isComplexFormat =
    format === "casestudy" ||
    format === "case-study" ||
    format === "case_study" ||
    format === "assertionreason" ||
    format === "assertion-reason" ||
    format === "assertion_reason" ||
    format === "matchthefollowing" ||
    format === "match-the-following" ||
    format === "match_the_following";

  if (isComplexFormat) {
    structureScore = 1;
  } else if (steps >= 3 || hasMultiConcept) {
    structureScore = 1;
  } else if (calcLoad === "high" && steps >= 2) {
    structureScore = 1;
  }

  if (structureScore === 1 && adjustedScore < 2) {
    adjustedScore = (adjustedScore + 1) as 1 | 2;
  }

  if (adjustedScore <= 0) return "easy";
  if (adjustedScore === 1) return "medium";
  return "hard";
}

// --- Snapshot generation ----------------------------------------------------

export function buildDifficultySnapshotForQuestions(
  questions: CanonicalQuestionLike[]
): DifficultySnapshot {
  const distribution: Record<DifficultyLabel, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
  };

  const suggestions: DifficultySuggestion[] = [];
  let changedCount = 0;

  for (const q of questions) {
    if (!q) continue;

    const id = String(q.id ?? "");
    const topicKey = String(q.topicKey ?? "");
    const marks = toNumberOrNull(q.marks);

    const existing =
      normaliseDifficultyLabel(q.canonicalDifficulty) ??
      normaliseDifficultyLabel(q.difficulty);

    const suggested = suggestDifficulty(q);
    distribution[suggested] += 1;

    const changed = existing != null && existing !== suggested;
    if (changed) {
      changedCount += 1;
    }

    suggestions.push({
      id,
      topicKey,
      existingDifficulty: existing,
      suggestedDifficulty: suggested,
      changed,
      marks,
      bloomLevel: q.bloomLevel,
      format: q.format,
    });
  }

  return {
    totalQuestions: suggestions.length,
    distribution,
    changedCount,
    suggestions,
  };
}

// Convenience helper for debug tooling: compute snapshot from PredictionCore.
export function buildDifficultySnapshot(): DifficultySnapshot {
  const questions = (PredictionCore as any).getAllQuestions
    ? (PredictionCore as any).getAllQuestions()
    : [];

  return buildDifficultySnapshotForQuestions(questions as CanonicalQuestionLike[]);
}