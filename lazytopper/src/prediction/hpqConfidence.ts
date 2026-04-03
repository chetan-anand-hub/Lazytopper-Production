import type { HPQQuestion, HPQSubject } from "../data/highlyProbableQuestions";
import { compute5SignalScore } from "./cbse5SignalScoring";

export interface HPQConfidence {
  confidenceScore: number;
  confidenceBand: "low" | "medium" | "high";
  confidenceRationale: string;
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

function toBloomStr(raw: HPQQuestion["bloomSkill"]): string {
  if (
    raw === "Remembering" ||
    raw === "Understanding" ||
    raw === "Applying" ||
    raw === "Analysing" ||
    raw === "Evaluating"
  ) {
    return raw;
  }
  return "Understanding";
}

function predictionTargetYear(): number {
  try {
    const envValue = Number(import.meta.env?.VITE_PREDICTION_TARGET_YEAR || "");
    if (Number.isFinite(envValue) && envValue >= 2018) return envValue;
  } catch {}
  return new Date().getFullYear();
}

export function deriveHPQConfidence(args: {
  subject: HPQSubject;
  topic: string;
  question: HPQQuestion;
}): HPQConfidence {
  const { subject, topic, question } = args;
  const targetYear = predictionTargetYear();

  const result = compute5SignalScore(
    {
      subject,
      topic,
      subtopic: question.subtopic || question.concept || "general",
      marks: question.marks ?? 1,
      format: mapQuestionTypeToFormat(question.type),
      bloom: toBloomStr(question.bloomSkill),
      difficulty: question.difficulty || "Medium",
      policyTag: question.policyTag,
      pastBoardYear: question.pastBoardYear,
    },
    targetYear
  );

  return {
    confidenceScore: result.compositeScore,
    confidenceBand: result.confidenceBand,
    confidenceRationale: result.confidenceRationale,
  };
}
