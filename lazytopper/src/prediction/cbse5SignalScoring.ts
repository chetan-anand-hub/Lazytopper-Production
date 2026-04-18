import { getCanonicalHistoricalDataset, type HistoricalQuestionItem } from "./historicalDataset";
import { computeRotationSignal, type RotationSignal } from "./rotationPairTracker";
import { computeSQPSignal, type SQPSignal } from "./sqpIngestionPipeline";
import { isGuaranteedArchetype, getGuaranteedBoost } from "./guaranteedArchetypes";
import {
  isScienceDeletedFor2026_27,
  SCIENCE_DELETED_CHAPTERS_2026_27,
  isMathsDeletedForYear,
} from "./cbseHistoricalArchetypes";

export interface FiveSignalWeights {
  historicalFrequency: number;
  rotation: number;
  sqpAlignment: number;
  nepPolicy: number;
  difficultyDistribution: number;
}

export const DEFAULT_SIGNAL_WEIGHTS: FiveSignalWeights = {
  historicalFrequency: 0.30,
  rotation: 0.20,
  sqpAlignment: 0.25,
  nepPolicy: 0.15,
  difficultyDistribution: 0.10,
};

export interface FiveSignalResult {
  compositeScore: number;
  confidencePercent: number;
  confidenceBand: "low" | "medium" | "high";
  confidenceRationale: string;
  signals: {
    historicalFrequency: number;
    rotation: number;
    sqpAlignment: number;
    nepPolicy: number;
    difficultyDistribution: number;
  };
  rotationDetail: RotationSignal;
  sqpDetail: SQPSignal;
  isGuaranteed: boolean;
  guaranteedBoost: number;
}

export interface FiveSignalInput {
  subject: "Maths" | "Science";
  topic: string;
  subtopic: string;
  marks: number;
  format: string;
  bloom: string;
  difficulty: string;
  policyTag?: string;
  pastBoardYear?: string;
}

export interface FiveSignalOptions {
  weights?: FiveSignalWeights;
  cutoffYear?: number;
}

const TOPIC_KEY_TO_LABEL: Record<string, string> = {
  "chemicalreactions": "Chemical Reactions & Equations",
  "chemicalreactionsandequations": "Chemical Reactions & Equations",
  "acidsbasessalts": "Acids, Bases & Salts",
  "acidsbasesandsalts": "Acids, Bases & Salts",
  "metalsandnonmetals": "Metals and Non-metals",
  "metalsnonmetals": "Metals and Non-metals",
  "carbonanditscompounds": "Carbon & its Compounds",
  "carboncompounds": "Carbon & its Compounds",
  "electricity": "Electricity",
  "magneticeffectsofelectriccurrent": "Magnetic Effects of Electric Current",
  "magneticeffects": "Magnetic Effects of Electric Current",
  "lightreflectionandrefraction": "Light – Reflection & Refraction",
  "lightreflectionrefraction": "Light – Reflection & Refraction",
  "humaneyeandcolourfulworld": "Human Eye and the Colourful World",
  "humaneyecolourfulworld": "Human Eye and the Colourful World",
  "lifeprocesses": "Life Processes",
  "howdoorganismsreproduce": "How do Organisms Reproduce?",
  "reproduction": "How do Organisms Reproduce?",
  "heredityevolution": "Heredity",
  "heredityandevolution": "Heredity",
  "ourenvironment": "Our Environment",
  "managementofnaturalresources": "Management of Natural Resources",
  "realnumbers": "Real Numbers",
  "polynomials": "Polynomials",
  "pairoflinearequationsintwovariables": "Pair of Linear Equations in Two Variables",
  "linearequations": "Pair of Linear Equations in Two Variables",
  "quadraticequations": "Quadratic Equations",
  "arithmeticprogression": "Arithmetic Progression",
  "arithmeticprogressions": "Arithmetic Progression",
  "triangles": "Triangles",
  "coordinategeometry": "Coordinate Geometry",
  "trigonometry": "Trigonometry",
  "trigonometricidentities": "Trigonometry",
  "circles": "Circles",
  "areasrelatedtocircles": "Areas Related to Circles",
  "surfaceareasandvolumes": "Surface Areas and Volumes",
  "statistics": "Statistics",
  "probability": "Probability",
};

function normalizeTopicKey(raw: string): string {
  const compact = raw.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const mapped = TOPIC_KEY_TO_LABEL[compact];
  if (mapped) return mapped;
  return raw.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[^a-zA-Z0-9]+/g, " ").trim();
}

function norm(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function fuzzyMatch(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wordsA = new Set(na.split(" "));
  const wordsB = new Set(nb.split(" "));
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return Math.min(wordsA.size, wordsB.size) >= 2 && overlap / Math.min(wordsA.size, wordsB.size) >= 0.7;
}

function getFilteredItems(cutoffYear?: number): HistoricalQuestionItem[] {
  const dataset = getCanonicalHistoricalDataset();
  if (cutoffYear == null) return dataset.items;
  return dataset.items.filter(i => i.sourceYear < cutoffYear);
}

function computeHistoricalFrequencySignal(
  subject: "Maths" | "Science",
  topic: string,
  subtopic: string,
  targetYear: number,
  cutoffYear?: number
): number {
  const items = getFilteredItems(cutoffYear).filter(i => i.subject === subject);
  const boardYears = [...new Set(items.filter(i => i.sourceType === "official_board").map(i => i.sourceYear))];
  const totalBoardYears = Math.max(boardYears.length, 1);

  const yearsWithSubtopic = new Set<number>();
  const yearsWithTopic = new Set<number>();

  for (const item of items) {
    if (item.sourceType !== "official_board") continue;
    if (fuzzyMatch(item.topic, topic)) {
      yearsWithTopic.add(item.sourceYear);
      if (fuzzyMatch(item.subtopic, subtopic)) {
        yearsWithSubtopic.add(item.sourceYear);
      }
    }
  }

  const subtopicRate = (yearsWithSubtopic.size + 1) / (totalBoardYears + 2);
  const topicRate = (yearsWithTopic.size + 1) / (totalBoardYears + 2);

  const recentYears = boardYears.filter(y => y >= targetYear - 3);
  let recentHits = 0;
  for (const y of recentYears) {
    if (yearsWithSubtopic.has(y)) recentHits++;
  }
  const recentRate = recentYears.length > 0 ? recentHits / recentYears.length : 0;

  const signal = subtopicRate * 0.5 + topicRate * 0.3 + recentRate * 0.2;
  return Math.min(1, Math.max(0, signal));
}

function computeNEPPolicySignal(
  format: string,
  bloom: string,
  policyTag?: string
): number {
  const fmt = norm(format);
  const bl = norm(bloom);
  let signal = 0.5;

  if (fmt.includes("case")) signal += 0.25;
  else if (fmt.includes("assertion")) signal += 0.20;

  if (bl === "applying" || bl === "analysing") signal += 0.15;
  else if (bl === "evaluating") signal += 0.10;
  else if (bl === "remembering") signal -= 0.10;

  if (policyTag) {
    const tag = policyTag.toLowerCase();
    if (tag.includes("must-crack") || tag.includes("core")) signal += 0.10;
    else if (tag.includes("high-roi") || tag.includes("high_yield")) signal += 0.05;
  }

  return Math.min(1, Math.max(0, signal));
}

function computeDifficultyDistributionSignal(
  difficulty: string,
  marks: number
): number {
  const d = norm(difficulty);
  if (d === "easy" && marks <= 2) return 0.7;
  if (d === "easy" && marks > 2) return 0.5;
  if (d === "medium") return 0.8;
  if (d === "hard" && marks >= 3) return 0.7;
  if (d === "hard" && marks < 3) return 0.5;
  return 0.6;
}

export function compute5SignalScore(
  input: FiveSignalInput,
  targetYear: number,
  weightsOrOptions?: FiveSignalWeights | FiveSignalOptions
): FiveSignalResult {
  let weights = DEFAULT_SIGNAL_WEIGHTS;
  let cutoffYear: number | undefined;

  if (weightsOrOptions) {
    if ("historicalFrequency" in weightsOrOptions) {
      weights = weightsOrOptions;
    } else {
      weights = weightsOrOptions.weights ?? DEFAULT_SIGNAL_WEIGHTS;
      cutoffYear = weightsOrOptions.cutoffYear;
    }
  }

  const resolvedTopic = normalizeTopicKey(input.topic);

  // Guard: if this Science topic/subtopic has been removed from the 2026-27
  // syllabus, return a zeroed score so it never surfaces in recommendations.
  // Historical archetype data is preserved for trend analysis; only forward
  // predictions are blocked.
  if (
    input.subject === "Science" &&
    targetYear >= SCIENCE_DELETED_CHAPTERS_2026_27.effectiveFromYear &&
    isScienceDeletedFor2026_27(resolvedTopic, input.subtopic)
  ) {
    return {
      compositeScore: 0,
      confidencePercent: 0,
      confidenceBand: "low",
      confidenceRationale: `Excluded from ${targetYear} predictions — topic removed from 2026-27 CBSE Science syllabus.`,
      signals: {
        historicalFrequency: 0,
        rotation: 0,
        sqpAlignment: 0,
        nepPolicy: 0,
        difficultyDistribution: 0,
      },
      rotationDetail: {
        gapYears: 0,
        lastAppeared: null,
        appearedYears: [],
        totalYears: 0,
        rotationBoost: 0,
        pairPartnerLastAppeared: null,
      },
      sqpDetail: {
        matchesSQP: false,
        sqpYear: null,
        sqpBoost: 0,
        sqpMatchType: "none",
        sqpMatchDetails: "Topic excluded from 2026-27 syllabus.",
      },
      isGuaranteed: false,
      guaranteedBoost: 0,
    };
  }

  // Guard: if this Maths topic/subtopic has been removed from the 2026-27
  // syllabus, return a zeroed score for the same reason.
  if (
    input.subject === "Maths" &&
    isMathsDeletedForYear(resolvedTopic, input.subtopic, targetYear)
  ) {
    return {
      compositeScore: 0,
      confidencePercent: 0,
      confidenceBand: "low",
      confidenceRationale: `Excluded from ${targetYear} predictions — topic removed from 2026-27 CBSE Maths syllabus.`,
      signals: {
        historicalFrequency: 0,
        rotation: 0,
        sqpAlignment: 0,
        nepPolicy: 0,
        difficultyDistribution: 0,
      },
      rotationDetail: {
        gapYears: 0,
        lastAppeared: null,
        appearedYears: [],
        totalYears: 0,
        rotationBoost: 0,
        pairPartnerLastAppeared: null,
      },
      sqpDetail: {
        matchesSQP: false,
        sqpYear: null,
        sqpBoost: 0,
        sqpMatchType: "none",
        sqpMatchDetails: "Topic excluded from 2026-27 Maths syllabus.",
      },
      isGuaranteed: false,
      guaranteedBoost: 0,
    };
  }

  const histSignal = computeHistoricalFrequencySignal(
    input.subject, resolvedTopic, input.subtopic, targetYear, cutoffYear
  );

  const rotationDetail = computeRotationSignal({
    subject: input.subject,
    topic: resolvedTopic,
    subtopic: input.subtopic,
    targetYear,
    cutoffYear,
  });
  const rotationSignal = Math.min(1, Math.max(0, 0.5 + rotationDetail.rotationBoost));

  const sqpDetail = computeSQPSignal({
    subject: input.subject,
    topic: resolvedTopic,
    subtopic: input.subtopic,
    marks: input.marks,
    format: input.format,
    targetYear,
  });
  const sqpSignal = Math.min(1, Math.max(0, sqpDetail.sqpBoost));

  const nepSignal = computeNEPPolicySignal(input.format, input.bloom, input.policyTag);

  const diffSignal = computeDifficultyDistributionSignal(input.difficulty, input.marks);

  const signals = {
    historicalFrequency: histSignal,
    rotation: rotationSignal,
    sqpAlignment: sqpSignal,
    nepPolicy: nepSignal,
    difficultyDistribution: diffSignal,
  };

  let compositeScore =
    signals.historicalFrequency * weights.historicalFrequency +
    signals.rotation * weights.rotation +
    signals.sqpAlignment * weights.sqpAlignment +
    signals.nepPolicy * weights.nepPolicy +
    signals.difficultyDistribution * weights.difficultyDistribution;

  const arch = isGuaranteedArchetype(input.subject, resolvedTopic, input.subtopic);
  const isGuaranteed = arch !== null;
  const guaranteedBoostVal = getGuaranteedBoost(input.subject, resolvedTopic, input.subtopic);

  if (isGuaranteed) {
    compositeScore = Math.min(1, compositeScore + guaranteedBoostVal);
  }

  compositeScore = Math.min(1, Math.max(0, compositeScore));

  const confidencePercent = Math.round(compositeScore * 100);

  const confidenceBand: "low" | "medium" | "high" =
    confidencePercent >= 70 ? "high" : confidencePercent >= 40 ? "medium" : "low";

  const parts: string[] = [];
  if (histSignal >= 0.7) parts.push(`appears ${Math.round(histSignal * 100)}% of years`);
  if (sqpDetail.matchesSQP) parts.push(`matches SQP ${sqpDetail.sqpYear || ""}`);
  if (isGuaranteed) parts.push("guaranteed archetype");
  if (rotationDetail.gapYears >= 3) parts.push(`${rotationDetail.gapYears}yr gap (rotation due)`);
  if (nepSignal >= 0.7) parts.push("NEP-aligned");
  if (parts.length === 0) parts.push(`${confidencePercent}% composite likelihood`);

  const confidenceRationale = `${confidencePercent}% likely — ${parts.join(", ")}`;

  return {
    compositeScore,
    confidencePercent,
    confidenceBand,
    confidenceRationale,
    signals,
    rotationDetail,
    sqpDetail,
    isGuaranteed,
    guaranteedBoost: guaranteedBoostVal,
  };
}

export function compute5SignalScoreBatch(
  inputs: FiveSignalInput[],
  targetYear: number,
  weightsOrOptions?: FiveSignalWeights | FiveSignalOptions
): FiveSignalResult[] {
  return inputs.map(input => compute5SignalScore(input, targetYear, weightsOrOptions));
}
