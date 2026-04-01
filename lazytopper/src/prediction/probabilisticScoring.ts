import type { HistoricalQuestionItem } from "./historicalDataset";

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
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function archetypeKeyOf(input: ProbabilisticScoreInput): string {
  return [
    input.subject,
    norm(input.topic),
    norm(input.subtopic),
    String(input.marks),
    norm(input.format),
  ].join("|");
}

function recencyWeight(targetYear: number, year: number): number {
  const delta = Math.max(0, targetYear - year);
  return Math.exp(-0.22 * delta);
}

function policyBoost(context: ProbabilisticContext, input: ProbabilisticScoreInput): number {
  const fmt = norm(input.format);
  if (context.policyRegime === "nep_competency_2023_plus") {
    if (fmt.includes("case")) return 1.28;
    if (fmt.includes("assertion")) return 1.22;
    if (input.bloom === "Applying" || input.bloom === "Analysing") return 1.12;
  }
  if (context.policyRegime === "nep_transition_2020_2022") {
    if (fmt.includes("case")) return 1.12;
    if (fmt.includes("assertion")) return 1.08;
  }
  return 1.0;
}

export function scoreArchetypeWithBayesianSmoothing(args: {
  input: ProbabilisticScoreInput;
  context: ProbabilisticContext;
  historicalItems: HistoricalQuestionItem[];
}): ProbabilisticScoreResult {
  const { input, context, historicalItems } = args;
  const archetypeKey = archetypeKeyOf(input);
  const subjectItems = historicalItems.filter((x) => x.subject === input.subject);

  // Dirichlet-like smoothing at archetype level.
  const uniqueArchetypes = new Set(subjectItems.map((x) => x.archetypeKey)).size || 1;
  const alpha = 1.5;

  let weightedTotal = 0;
  let weightedArchetype = 0;
  const yearHits = new Set<number>();

  for (const item of subjectItems) {
    const w = recencyWeight(context.targetYear, item.sourceYear);
    weightedTotal += w;
    if (item.archetypeKey === archetypeKey) {
      weightedArchetype += w;
      yearHits.add(item.sourceYear);
    }
  }

  const posterior =
    (weightedArchetype + alpha) /
    (weightedTotal + alpha * uniqueArchetypes);

  const policy = policyBoost(context, input);
  const trend = Math.max(0.7, Math.min(1.35, context.topicTrendWeight ?? 1.0));
  const combined = Math.max(0, Math.min(1, posterior * policy * trend));

  // Confidence grows with recurrence across years + posterior mass.
  const recurrence = Math.min(1, yearHits.size / 4);
  const confidence = Math.max(
    0,
    Math.min(1, combined * 0.7 + recurrence * 0.3)
  );

  const confidenceBand: "low" | "medium" | "high" =
    confidence >= 0.67 ? "high" : confidence >= 0.4 ? "medium" : "low";

  const rationale = `Confidence ${confidenceBand}: seen in ${yearHits.size} historical year(s), policy-fit x${policy.toFixed(
    2
  )}, trend-weight x${trend.toFixed(2)}.`;

  return {
    posterior: combined,
    confidence,
    confidenceBand,
    rationale,
  };
}
