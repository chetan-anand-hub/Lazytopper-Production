import type { CanonicalQuestion } from "./predictionTypes";
import { class10MathTopicTrends } from "./class10MathTopicTrends";
import { class10ScienceTopicTrends } from "./class10ScienceTopicTrends";
import { compute5SignalScore, type FiveSignalResult } from "../prediction/cbse5SignalScoring";

export interface PredictionScoreInput {
  subject: string;
  topicKey: string;
  subtopic: string;
  marks: number;
  format: string;
  bloomSkill: string;
  difficulty: string;
  policyTag?: string;
  pastBoardYear?: string;
}

const mathWeightageCache = new Map<string, number>();
const scienceWeightageCache = new Map<string, number>();

function normKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function buildMathWeightageMap(): void {
  if (mathWeightageCache.size > 0) return;
  const topics = class10MathTopicTrends.topics as Record<string, { weightagePercent: number }>;
  for (const [key, val] of Object.entries(topics)) {
    mathWeightageCache.set(normKey(key), val.weightagePercent);
  }
}

function buildScienceWeightageMap(): void {
  if (scienceWeightageCache.size > 0) return;
  const topics = class10ScienceTopicTrends.topics;
  for (const val of Object.values(topics)) {
    scienceWeightageCache.set(normKey(val.topicName), val.weightagePercent);
  }
}

function baseTopicWeight(topicKey: string, subject?: string): number {
  const nk = normKey(topicKey);
  if (subject === "Science") {
    buildScienceWeightageMap();
    const pct = scienceWeightageCache.get(nk);
    if (pct != null) return 0.7 + (pct / 10) * 0.6;
  } else {
    buildMathWeightageMap();
    const pct = mathWeightageCache.get(nk);
    if (pct != null) return 0.7 + (pct / 11) * 0.6;
  }
  return 1.0;
}

function predictionTargetYear(): number {
  try {
    const envValue = Number(import.meta.env?.VITE_PREDICTION_TARGET_YEAR || "");
    if (Number.isFinite(envValue) && envValue >= 2018) return envValue;
  } catch {}
  return new Date().getFullYear();
}

const fiveSignalCache = new Map<string, FiveSignalResult>();

export function invalidatePredictionCaches(): void {
  fiveSignalCache.clear();
  mathWeightageCache.clear();
  scienceWeightageCache.clear();
}

function get5SignalResult(q: PredictionScoreInput): FiveSignalResult {
  const targetYear = predictionTargetYear();
  const cacheKey = `${q.subject}|${q.topicKey}|${q.subtopic}|${q.marks}|${q.format}|${q.bloomSkill}|${q.difficulty}|${q.policyTag || ""}|${targetYear}`;
  const cached = fiveSignalCache.get(cacheKey);
  if (cached) return cached;
  const result = compute5SignalScore(
    {
      subject: (q.subject === "Science" ? "Science" : "Maths") as "Maths" | "Science",
      topic: q.topicKey,
      subtopic: q.subtopic,
      marks: q.marks,
      format: q.format,
      bloom: q.bloomSkill,
      difficulty: q.difficulty,
      policyTag: q.policyTag,
      pastBoardYear: q.pastBoardYear,
    },
    targetYear
  );

  fiveSignalCache.set(cacheKey, result);
  return result;
}

export function computePredictionScore(q: PredictionScoreInput): number {
  const fiveSignal = get5SignalResult(q);
  const topicWeight = baseTopicWeight(q.topicKey, q.subject);
  const raw = topicWeight * (0.6 + fiveSignal.compositeScore * 1.8);
  return Math.max(0.5, Math.min(raw, 5));
}

export function computePredictionConfidence(q: PredictionScoreInput): {
  confidencePercent: number;
  confidenceBand: "low" | "medium" | "high";
  confidenceRationale: string;
  isGuaranteed: boolean;
} {
  const result = get5SignalResult(q);
  return {
    confidencePercent: result.confidencePercent,
    confidenceBand: result.confidenceBand,
    confidenceRationale: result.confidenceRationale,
    isGuaranteed: result.isGuaranteed,
  };
}

export function get5SignalBreakdown(q: PredictionScoreInput): FiveSignalResult {
  return get5SignalResult(q);
}

export function applyPredictionScoring(
  questions: CanonicalQuestion[]
): CanonicalQuestion[] {
  return questions.map((q) => ({
    ...q,
    predictionScore: computePredictionScore(q),
  }));
}

export { runBacktest, runBacktestAcceptanceGate, calibrateWeights } from "../prediction/backtestEngine";
export type { BacktestSummary, BacktestGateResult, CalibrationResult } from "../prediction/backtestEngine";
