import type { HistoricalQuestionItem } from "./historicalDataset";
import {
  isScienceDeletedFor2026_27,
  SCIENCE_DELETED_CHAPTERS_2026_27,
  isMathsDeletedForYear,
} from "./cbseHistoricalArchetypes";

export interface ProbabilisticScoreInput {
  subject: "Maths" | "Science";
  topic: string;
  subtopic: string;
  marks: number;
  format: string;
  bloom:
    | "Remembering"
    | "Understanding"
    | "Applying"
    | "Analysing"
    | "Evaluating"
    | "Creating";
  policyTag?: string;
  sourceYearHint?: number;
}

export interface ProbabilisticContext {
  targetYear: number;
  policyRegime: "nep_pre_2020" | "nep_transition_2020_2022" | "nep_competency_2023_plus";
  topicTrendWeight?: number;
}

export interface ProbabilisticScoreResult {
  posterior: number;
  confidence: number;
  confidenceBand: "low" | "medium" | "high";
  rationale: string;
}

function norm(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripPlural(s: string): string {
  return s.replace(/s$/, "");
}

function fuzzyTopicMatch(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return true;
  if (stripPlural(na) === stripPlural(nb)) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wordsA = new Set(na.split(" "));
  const wordsB = new Set(nb.split(" "));
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  const minLen = Math.min(wordsA.size, wordsB.size);
  return minLen >= 2 && overlap / minLen >= 0.7;
}

function policyBoost(context: ProbabilisticContext, input: ProbabilisticScoreInput): number {
  const fmt = norm(input.format);
  // NEP 2023+ calibration: CBSE shifted case-based from ~10% to ~25% of marks,
  // assertion-reasoning from ~5% to ~15%. Multipliers derived from observed
  // mark-share ratios in 2023-2025 board papers vs 2017-2019 baseline.
  if (context.policyRegime === "nep_competency_2023_plus") {
    if (fmt.includes("case")) return 1.52;
    if (fmt.includes("assertion")) return 1.38;
    if (input.bloom === "Applying" || input.bloom === "Analysing") return 1.18;
    if (input.bloom === "Evaluating") return 1.10;
  }
  // Transition era: early competency signals but traditional still dominant.
  if (context.policyRegime === "nep_transition_2020_2022") {
    if (fmt.includes("case")) return 1.15;
    if (fmt.includes("assertion")) return 1.10;
    if (input.bloom === "Applying") return 1.05;
  }
  return 1.0;
}

export function scoreTopicRecurrenceConfidence(args: {
  input: ProbabilisticScoreInput;
  context: ProbabilisticContext;
  historicalItems: HistoricalQuestionItem[];
}): ProbabilisticScoreResult {
  const { input, context, historicalItems } = args;

  // Guard: Science topics/subtopics deleted from the 2026-27 CBSE syllabus
  // must score zero so they are never surfaced in recommendations or papers.
  if (
    input.subject === "Science" &&
    context.targetYear >= SCIENCE_DELETED_CHAPTERS_2026_27.effectiveFromYear &&
    isScienceDeletedFor2026_27(input.topic, input.subtopic)
  ) {
    const HPQ_CONFIDENCE_FLOOR = 0.18;
    return {
      posterior: 0,
      confidence: HPQ_CONFIDENCE_FLOOR,
      confidenceBand: "low",
      rationale: `Excluded from ${context.targetYear} predictions — topic removed from 2026-27 CBSE Science syllabus.`,
    };
  }

  // Guard: Maths topics/subtopics deleted from the 2026-27 CBSE syllabus
  // must score zero so they are never surfaced in recommendations or papers.
  if (
    input.subject === "Maths" &&
    isMathsDeletedForYear(input.topic, input.subtopic, context.targetYear)
  ) {
    const HPQ_CONFIDENCE_FLOOR = 0.18;
    return {
      posterior: 0,
      confidence: HPQ_CONFIDENCE_FLOOR,
      confidenceBand: "low",
      rationale: `Excluded from ${context.targetYear} predictions — topic removed from 2026-27 CBSE Maths syllabus.`,
    };
  }

  const subjectItems = historicalItems.filter((x) => x.subject === input.subject);

  const inputFormat = norm(input.format);

  const allYears = new Set(subjectItems.map((x) => x.sourceYear));
  const totalYearSpan = Math.max(allYears.size, 1);

  const yearHitsTopicFormat = new Set<number>();
  const yearHitsTopic = new Set<number>();

  for (const item of subjectItems) {
    const topicMatch = fuzzyTopicMatch(item.topic, input.topic);
    if (topicMatch) {
      yearHitsTopic.add(item.sourceYear);
      if (norm(item.format) === inputFormat) {
        yearHitsTopicFormat.add(item.sourceYear);
      }
    }
  }

  const topicRecurrence = Math.min(1, yearHitsTopic.size / totalYearSpan);

  const formatBonus = yearHitsTopicFormat.size > 0
    ? Math.min(0.15, (yearHitsTopicFormat.size / totalYearSpan) * 0.2)
    : 0;

  const baseScore = topicRecurrence * 0.75 + formatBonus;

  const policy = policyBoost(context, input);
  const trend = Math.max(0.7, Math.min(1.35, context.topicTrendWeight ?? 1.0));
  const combined = Math.max(0, Math.min(1, baseScore * policy * trend));

  const yearHits = yearHitsTopicFormat.size > 0 ? yearHitsTopicFormat : yearHitsTopic;
  const recurrence = Math.min(1, yearHits.size / 5);
  const rawConfidence = combined * 0.55 + recurrence * 0.45;
  const HPQ_CONFIDENCE_FLOOR = 0.18;
  const HPQ_CONFIDENCE_CEILING = 0.92;
  const confidence = Math.max(
    HPQ_CONFIDENCE_FLOOR,
    Math.min(HPQ_CONFIDENCE_CEILING, rawConfidence)
  );

  const confidenceBand: "low" | "medium" | "high" =
    confidence >= 0.67 ? "high" : confidence >= 0.4 ? "medium" : "low";

  const rationale = `Likelihood ${confidenceBand}: seen in ${yearHits.size} historical year(s), policy-fit x${policy.toFixed(
    2
  )}, trend-weight x${trend.toFixed(2)}.`;

  return {
    posterior: combined,
    confidence,
    confidenceBand,
    rationale,
  };
}
