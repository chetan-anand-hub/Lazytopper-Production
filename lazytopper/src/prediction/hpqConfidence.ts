import type { HPQQuestion, HPQSubject } from "../data/highlyProbableQuestions";
import { getCanonicalHistoricalDataset } from "./historicalDataset";
import { scoreArchetypeWithBayesianSmoothing } from "./probabilisticScoring";

export interface HPQConfidence {
  confidenceScore: number;
  confidenceBand: "low" | "medium" | "high";
  confidenceRationale: string;
}

function mapLikelihoodToYearHint(likelihood: string | undefined): number {
  const v = String(likelihood || "").toLowerCase();
  if (v.includes("very high")) return 2025;
  if (v.includes("high")) return 2024;
  if (v.includes("medium-high")) return 2023;
  return 2022;
}

function toPolicyRegime(targetYear: number) {
  if (targetYear >= 2023) return "nep_competency_2023_plus" as const;
  if (targetYear >= 2020) return "nep_transition_2020_2022" as const;
  return "nep_pre_2020" as const;
}

function toBloomLevel(raw: HPQQuestion["bloomSkill"]) {
  if (
    raw === "Remembering" ||
    raw === "Understanding" ||
    raw === "Applying" ||
    raw === "Analysing" ||
    raw === "Evaluating"
  ) {
    return raw;
  }
  return "Understanding" as const;
}

function mapQuestionTypeToFormat(type: string | undefined): string {
  switch (type) {
    case "AssertionReason":
      return "Assertion-Reasoning";
    case "CaseBased":
      return "Case-Based";
    case "SourceBased":
      return "Source-Based";
    case "VeryShort":
      return "VSA";
    case "Diagram":
      return "Short";
    case "MCQ":
      return "MCQ";
    case "Short":
      return "Short";
    case "Long":
      return "Long";
    default:
      return type || "Short";
  }
}

export function deriveHPQConfidence(args: {
  subject: HPQSubject;
  topic: string;
  question: HPQQuestion;
}): HPQConfidence {
  const { subject, topic, question } = args;
  const dataset = getCanonicalHistoricalDataset();
  const yearHint =
    Number(question.pastBoardYear || "") ||
    mapLikelihoodToYearHint(question.likelihood);

  const scored = scoreArchetypeWithBayesianSmoothing({
    input: {
      subject,
      topic,
      subtopic: question.subtopic || question.concept || "general",
      marks: question.marks ?? 1,
      format: mapQuestionTypeToFormat(question.type),
      bloom: toBloomLevel(question.bloomSkill),
      policyTag: question.policyTag,
      sourceYearHint: yearHint,
    },
    context: {
      targetYear: yearHint,
      policyRegime: toPolicyRegime(yearHint),
      topicTrendWeight: question.tier === "must-crack" ? 1.18 : question.tier === "high-roi" ? 1.08 : 0.96,
    },
    historicalItems: dataset.items,
  });

  return {
    confidenceScore: scored.confidence,
    confidenceBand: scored.confidenceBand,
    confidenceRationale: scored.rationale,
  };
}
