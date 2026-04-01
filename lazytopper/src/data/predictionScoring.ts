import type { CanonicalQuestion } from "./predictionTypes";
import { class10MathTopicTrends } from "./class10MathTopicTrends";
import { class10ScienceTopicTrends } from "./class10ScienceTopicTrends";
import { getSubtopicAppearanceByYear, getCanonicalHistoricalDataset } from "../prediction/historicalDataset";

function parseYear(y?: string): number | undefined {
  if (!y) return undefined;
  const n = parseInt(y, 10);
  return Number.isNaN(n) ? undefined : n;
}

function recencyScore(pastBoardYear?: string): number {
  const year = parseYear(pastBoardYear);
  if (!year) return 1;
  if (year >= 2023) return 1.3;
  if (year >= 2020) return 1.15;
  if (year >= 2017) return 1.05;
  return 1.0;
}

function policyBoost(tag?: string): number {
  if (!tag) return 1;
  const key = tag.toLowerCase();
  if (key.includes("must-crack") || key.includes("core")) return 1.4;
  if (key.includes("high-roi") || key.includes("high_yield")) return 1.2;
  if (key.includes("good-to-do")) return 1.05;
  return 1.0;
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

function rotationFactor(q: CanonicalQuestion): number {
  const subject = (q.subject === "Science" ? "Science" : "Maths") as "Maths" | "Science";
  const years = getSubtopicAppearanceByYear(subject, q.topicKey, q.subtopic);
  if (years.length === 0) return 1.0;

  const dataset = getCanonicalHistoricalDataset();
  const totalYears = dataset.years.length;
  if (totalYears === 0) return 1.0;

  const appearanceRate = years.length / totalYears;

  const targetYear = dataset.years[dataset.years.length - 1] + 1;
  const lastAppearance = years[years.length - 1];
  const gap = targetYear - lastAppearance;

  let recencySignal: number;
  if (gap === 0) recencySignal = -0.08;
  else if (gap === 1) recencySignal = -0.04;
  else if (gap >= 3) recencySignal = 0.12;
  else recencySignal = 0.06;

  let frequencySignal: number;
  if (appearanceRate >= 0.8) {
    frequencySignal = 0.10;
  } else if (appearanceRate >= 0.5) {
    frequencySignal = 0.04;
  } else if (appearanceRate >= 0.3) {
    frequencySignal = 0.0;
  } else {
    frequencySignal = -0.06;
  }

  return Math.max(0.75, Math.min(1.25, 1.0 + recencySignal + frequencySignal));
}

export function computePredictionScore(q: CanonicalQuestion): number {
  const freqComponent = baseTopicWeight(q.topicKey, q.subject);
  const recencyComponent = recencyScore(q.pastBoardYear);
  const policyComponent = policyBoost(q.policyTag);
  const rotationComponent = rotationFactor(q);

  const raw =
    freqComponent * recencyComponent * policyComponent * rotationComponent;

  const score = Math.max(0.5, Math.min(raw, 5));
  return score;
}

export function applyPredictionScoring(
  questions: CanonicalQuestion[]
): CanonicalQuestion[] {
  return questions.map((q) => ({
    ...q,
    predictionScore: computePredictionScore(q),
  }));
}
