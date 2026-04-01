// src/data/predictionScoring.ts
// Phase 0 – scoring helpers for CanonicalQuestion.
// This is a *non-destructive* scoring stub: it adds a predictionScore
// field but does NOT change which questions your existing engine picks.
// Later phases can refine the math using topic trends, HPQ tiers, etc.

import type { CanonicalQuestion } from "./predictionTypes";

// -------------------------
// Helper: year → recency
// -------------------------

function parseYear(y?: string): number | undefined {
  if (!y) return undefined;
  const n = parseInt(y, 10);
  return Number.isNaN(n) ? undefined : n;
}

function recencyScore(pastBoardYear?: string): number {
  const year = parseYear(pastBoardYear);
  if (!year) return 1; // neutral if unknown
  // Very rough: newer papers get slightly higher weight.
  if (year >= 2023) return 1.3;
  if (year >= 2020) return 1.15;
  if (year >= 2017) return 1.05;
  return 1.0;
}

// -------------------------
// Helper: policy tags → boost
// -------------------------

function policyBoost(tag?: string): number {
  if (!tag) return 1;
  const key = tag.toLowerCase();
  if (key.includes("must-crack") || key.includes("core")) return 1.4;
  if (key.includes("high-roi") || key.includes("high_yield")) return 1.2;
  if (key.includes("good-to-do")) return 1.05;
  return 1.0;
}

// -------------------------
// Helper: base topic weight
// (Phase 0 stub – can be wired to topic trends later)
// -------------------------

function baseTopicWeight(_topicKey: string): number {
  // For now, give all topics equal base weight = 1.
  // In Phase 1 we will read from class10MathTopicTrends / ScienceTopicTrends.
  return 1.0;
}

// -------------------------
// Helper: rotation factor
// (Phase 0: neutral – rotation engine lives elsewhere)
// -------------------------

function rotationFactor(_q: CanonicalQuestion): number {
  // Later we can down-weight questions over-used in mocks or practice.
  return 1.0;
}

// -------------------------
// Main scoring function
// -------------------------

export function computePredictionScore(q: CanonicalQuestion): number {
  const freqComponent = baseTopicWeight(q.topicKey);
  const recencyComponent = recencyScore(q.pastBoardYear);
  const policyComponent = policyBoost(q.policyTag);
  const rotationComponent = rotationFactor(q);

  // Multiply components, keep numbers small & interpretable.
  const raw =
    freqComponent * recencyComponent * policyComponent * rotationComponent;

  // Clamp to a reasonable range if needed.
  const score = Math.max(0.5, Math.min(raw, 5));
  return score;
}

/**
 * Apply predictionScore to an array of CanonicalQuestion.
 * This is pure: it returns a new array and does not mutate inputs.
 */
export function applyPredictionScoring(
  questions: CanonicalQuestion[]
): CanonicalQuestion[] {
  return questions.map((q) => ({
    ...q,
    predictionScore: computePredictionScore(q),
  }));
}

