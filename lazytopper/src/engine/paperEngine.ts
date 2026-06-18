/* eslint-disable @typescript-eslint/no-explicit-any */
// src/engine/paperEngine.ts

import {
  predictivePapers,
  type PredictivePaper,
  type SectionKey,
  type SubjectKey,
} from "../data/predictivePapers";

import {
  class10MathTopicTrends,
  type Class10MathTopicTrendsData,
} from "../data/class10MathTopicTrends";

import {
  class10ScienceTopicTrends,
  type Class10ScienceTrendsRoot,
} from "../data/class10ScienceTopicTrends";

import { computePredictionScore } from "../data/predictionScoring";
import { runBacktestAcceptanceGate } from "../prediction/backtestEngine";

import {
  predictedQuestions,
  type PredictedQuestion,
} from "../data/predictedQuestions";
import { predictedQuestionsScience } from "../data/predictedQuestionsScience";
import { buildConstrainedPaper } from "../prediction/constrainedPaperConstructor";

const backtestGateCache = new Map<string, boolean>();

let backtestStrictMode = false;

export function setBacktestStrictMode(strict: boolean): void {
  backtestStrictMode = strict;
  backtestGateCache.clear();
}

function checkBacktestGate(subject: "Maths" | "Science"): boolean {
  if (backtestGateCache.has(subject)) return backtestGateCache.get(subject)!;
  try {
    const gate = runBacktestAcceptanceGate(subject);
    backtestGateCache.set(subject, gate.passed);
    if (!gate.passed) {
      const msg = `[PaperEngine] Backtest gate FAILED for ${subject}: ${gate.message}`;
      if (backtestStrictMode) {
        throw new Error(msg);
      }
      console.warn(msg);
    }
    return gate.passed;
  } catch (e) {
    if (backtestStrictMode) throw e;
    backtestGateCache.set(subject, true);
    return true;
  }
}

// Common difficulty labels across Maths & Science
export type DifficultyKey = "Easy" | "Medium" | "Hard";

// ----------------- Engine output types -----------------

export interface GeneratedQuestionSlot {
  questionId: string;
  section: SectionKey;
  marks: number;
  difficulty: DifficultyKey;
  topicKey: string; // generic string; maps back to trends topic keys
}

export interface GeneratedPaper {
  paperId: string;
  subject: SubjectKey;
  totalMarks: number;

  sections: Record<SectionKey, GeneratedQuestionSlot[]>;

  topicMarks: Record<string, number>;

  difficultyMarks: Record<DifficultyKey, number>;

  backtestGatePassed?: boolean;
}

// ----------------- Debug summary types -----------------

export interface TopicCoverageSummary {
  topicKey: string;
  expectedPercent: number; // from trends topic weights (normalised)
  actualPercent: number; // from generated paper marks
  deviationPercentPoints: number; // actual - expected
  marks: number; // marks allocated to this topic in the paper
}

export interface DifficultyCoverageSummary {
  difficulty: DifficultyKey;
  expectedPercent: number; // from trends difficulty distribution
  actualPercent: number; // from generated paper
  deviationPercentPoints: number; // actual - expected
  marks: number;
}

export interface PaperDebugSummary {
  paperId: string;
  subject: SubjectKey;
  totalMarks: number;
  topicCoverage: TopicCoverageSummary[];
  difficultyCoverage: DifficultyCoverageSummary[];
}

// ----------------- Internal helper types -----------------

interface SectionTarget {
  section: SectionKey;
  marksTarget: number;
}

interface CandidateScoreContext {
  subject: "Maths" | "Science";
  topicWeights: Record<string, number>;
  topicMultipliers: Record<string, number>;
  difficultyTargetMarks: Record<DifficultyKey, number>;
  difficultyUsedMarks: Record<DifficultyKey, number>;
}

interface TrendsBundle {
  topicWeights: Record<string, number>;
  difficultyDistribution: Record<DifficultyKey, number>;
}

// ----------------- Public API -----------------

/**
 * Generate a single predictive paper (Maths or Science) for any paperId
 * defined in predictivePapers.ts (P1–P10, SciP1, etc.).
 *
 * - Uses subject from predictivePapers to select the right trends (Maths/Science)
 * - Uses sectionMarks for A–E
 * - Uses difficulty mix from the respective trends file
 * - Uses predictedQuestions.ts, filtering by subject:
 *      Maths   → (q.subject ?? "Maths") === "Maths"
 *      Science → q.subject === "Science"
 */
export function generatePaper(paperId: string): GeneratedPaper {
  const paperMeta = predictivePapers.find((p) => p.id === paperId);

  if (!paperMeta) {
    throw new Error(`No predictive paper metadata found for id=${paperId}`);
  }

  const { subject } = paperMeta;

  // 1. Trends bundle (topic weights + difficulty mix) per subject
  const trendsBundle =
    subject === "Maths"
      ? buildMathsTrendsBundle(class10MathTopicTrends)
      : buildScienceTrendsBundle(class10ScienceTopicTrends);

  // 2. Section targets (marks per section)
  const sectionTargets: SectionTarget[] = (Object.keys(
    paperMeta.sectionMarks
  ) as SectionKey[]).map((section) => ({
    section,
    marksTarget: paperMeta.sectionMarks[section],
  }));

  const totalMarks = Object.values(paperMeta.sectionMarks).reduce(
    (sum, m) => sum + m,
    0
  );

  // 3. Difficulty target marks from trends difficulty mix
  const difficultyTargetMarks: Record<DifficultyKey, number> = {
    Easy: Math.round(
      (trendsBundle.difficultyDistribution.Easy / 100) * totalMarks
    ),
    Medium: Math.round(
      (trendsBundle.difficultyDistribution.Medium / 100) * totalMarks
    ),
    Hard: Math.round(
      (trendsBundle.difficultyDistribution.Hard / 100) * totalMarks
    ),
  };

  const difficultyUsedMarks: Record<DifficultyKey, number> = {
    Easy: 0,
    Medium: 0,
    Hard: 0,
  };

  // 4. Per-paper topic multipliers (algebra-heavy, geometry-heavy, balanced, etc.)
  const topicMultipliers = buildTopicMultipliersForPaper(
    subject,
    paperMeta,
    Object.keys(trendsBundle.topicWeights)
  );

  // 5. Build pools per section, filtered by subject
  const subjectQuestions = filterQuestionsBySubject(subject);

  const poolsBySection: Record<SectionKey, PredictedQuestion[]> = {
    A: [],
    B: [],
    C: [],
    D: [],
    E: [],
  };

  for (const q of subjectQuestions) {
    poolsBySection[q.section].push(q);
  }

  // 6. Greedy section-wise filling
  const sections: Record<SectionKey, GeneratedQuestionSlot[]> = {
    A: [],
    B: [],
    C: [],
    D: [],
    E: [],
  };

  const usedQuestionIds = new Set<string>();

  const scoreContext: CandidateScoreContext = {
    subject: subject as "Maths" | "Science",
    topicWeights: trendsBundle.topicWeights,
    topicMultipliers,
    difficultyTargetMarks,
    difficultyUsedMarks,
  };

  // 6a. Constrained constructor path (integer-constraint style):
  // satisfies section marks exactly and enforces competency-focused quotas.
  const constrained = buildConstrainedPaper({
    candidates: subjectQuestions.map((q) => ({
      id: q.id,
      subject: subject as "Maths" | "Science",
      topicKey: String((q as any).topicKey),
      subtopic: String((q as any).subtopic ?? "general"),
      section: q.section as any,
      marks: Number((q as any).marks ?? 0),
      format: String((q as any).kind ?? "Short"),
      competencyType:
        String((q as any).kind ?? "").toLowerCase().includes("case") ||
        String((q as any).kind ?? "").toLowerCase().includes("assertion")
          ? String((q as any).kind)
          : String((q as any).bloomSkill ?? "procedural"),
      score: scoreQuestion(
        q,
        pickMostUnderfilledDifficulty(
          scoreContext.difficultyTargetMarks,
          scoreContext.difficultyUsedMarks
        ),
        scoreContext
      ),
    })),
    blueprint: {
      sectionMarks: paperMeta.sectionMarks as any,
      competencyFocusedMinShare: 0.5,
      caseBasedMinCount: 3,
    },
  });

  const constrainedRows = constrained.selected;
  const missingGuaranteed = constrained.diagnostics.guaranteedArchetypes
    .filter((g: { included: boolean; reason: string }) => !g.included)
    .filter((g: { reason: string }) => g.reason !== "no matching candidate in question bank");

  if (missingGuaranteed.length > 0) {
    console.error(
      `[PaperEngine] HARD FAIL: ${missingGuaranteed.length} guaranteed archetype(s) missing for ${paperId}:`,
      missingGuaranteed.map((g: { topic: string; subtopic: string; reason: string }) => `${g.topic}/${g.subtopic} (${g.reason})`)
    );
    throw new Error(
      `Guaranteed archetype enforcement failed for ${subject}: ` +
      missingGuaranteed.map((g: { topic: string; subtopic: string }) => `${g.topic}/${g.subtopic}`).join(", ") +
      ". Paper generation aborted."
    );
  }

  if (!constrained.diagnostics.constraintsSatisfied && constrainedRows.length > 0) {
    console.warn(
      `[PaperEngine] Soft constraints not fully satisfied for ${paperId}:`,
      `guaranteed=${constrained.diagnostics.guaranteedAllIncluded}`,
      `focused=${(constrained.diagnostics.competencyFocusedShare * 100).toFixed(0)}%`,
      `case=${constrained.diagnostics.caseBasedCount}`
    );
  }
  if (constrainedRows.length > 0) {
    const sectionsFromConstrained: Record<SectionKey, GeneratedQuestionSlot[]> = {
      A: [],
      B: [],
      C: [],
      D: [],
      E: [],
    };
    constrainedRows.forEach((row) => {
      const sec = row.section as SectionKey;
      if (!sectionsFromConstrained[sec]) return;
      sectionsFromConstrained[sec].push({
        questionId: row.id,
        section: sec,
        marks: row.marks,
        difficulty: inferDifficultyFromQuestionId(row.id, subjectQuestions),
        topicKey: row.topicKey,
      });
    });

    const topicMarks: Record<string, number> = {};
    Object.keys(trendsBundle.topicWeights).forEach((t) => {
      topicMarks[t] = 0;
    });
    const finalDifficultyMarks: Record<DifficultyKey, number> = {
      Easy: 0,
      Medium: 0,
      Hard: 0,
    };

    (Object.keys(sectionsFromConstrained) as SectionKey[]).forEach((sectionKey) => {
      sectionsFromConstrained[sectionKey].forEach((slot) => {
        if (!(slot.topicKey in topicMarks)) {
          topicMarks[slot.topicKey] = 0;
        }
        topicMarks[slot.topicKey] += slot.marks;
        finalDifficultyMarks[slot.difficulty] += slot.marks;
      });
    });

    const gatePassed = checkBacktestGate(subject);

    return {
      paperId,
      subject,
      totalMarks,
      sections: sectionsFromConstrained,
      topicMarks,
      difficultyMarks: finalDifficultyMarks,
      backtestGatePassed: gatePassed,
    };
  }

  for (const sectionTarget of sectionTargets) {
    fillSectionGreedy({
      sectionTarget,
      poolsBySection,
      sections,
      usedQuestionIds,
      scoreContext,
    });
  }

  // 7. Compute final coverage for reporting
  const topicMarks: Record<string, number> = {};
  for (const topicKey of Object.keys(trendsBundle.topicWeights)) {
    topicMarks[topicKey] = 0;
  }

  const finalDifficultyMarks: Record<DifficultyKey, number> = {
    Easy: 0,
    Medium: 0,
    Hard: 0,
  };

  (Object.keys(sections) as SectionKey[]).forEach((sectionKey) => {
    sections[sectionKey].forEach((slot) => {
      if (!(slot.topicKey in topicMarks)) {
        topicMarks[slot.topicKey] = 0;
      }
      topicMarks[slot.topicKey] += slot.marks;
      finalDifficultyMarks[slot.difficulty] += slot.marks;
    });
  });

  return {
    paperId,
    subject,
    totalMarks,
    sections,
    topicMarks,
    difficultyMarks: finalDifficultyMarks,
  };
}

function inferDifficultyFromQuestionId(
  questionId: string,
  subjectQuestions: PredictedQuestion[]
): DifficultyKey {
  const found = subjectQuestions.find((q) => q.id === questionId);
  const d = String((found as any)?.difficulty ?? "Medium");
  if (d === "Easy" || d === "Medium" || d === "Hard") return d;
  return "Medium";
}

/**
 * Convenience: generate a paper + its debug summary in one shot.
 */
export function generatePaperWithSummary(paperId: string): {
  paper: GeneratedPaper;
  summary: PaperDebugSummary;
} {
  const paper = generatePaper(paperId);
  const summary = summarizePaperFit(paper);
  return { paper, summary };
}

/**
 * Build a debug summary for how well a generated paper matches:
 * - topic weightage from trends
 * - difficulty distribution from trends
 */
export function summarizePaperFit(paper: GeneratedPaper): PaperDebugSummary {
  const trendsBundle =
    paper.subject === "Maths"
      ? buildMathsTrendsBundle(class10MathTopicTrends)
      : buildScienceTrendsBundle(class10ScienceTopicTrends);

  const { totalMarks } = paper;

  const topicWeights = trendsBundle.topicWeights;
  const sumTopicWeights = Object.values(topicWeights).reduce(
    (sum, w) => sum + w,
    0
  );

  const topicCoverage: TopicCoverageSummary[] = Object.entries(
    topicWeights
  ).map(([topicKey, weight]) => {
    const expectedPercent =
      sumTopicWeights > 0 ? (weight / sumTopicWeights) * 100 : 0;
    const marks = paper.topicMarks[topicKey] ?? 0;
    const actualPercent = totalMarks > 0 ? (marks / totalMarks) * 100 : 0;
    const deviationPercentPoints = actualPercent - expectedPercent;

    return {
      topicKey,
      expectedPercent,
      actualPercent,
      deviationPercentPoints,
      marks,
    };
  });

  // Sort topics by absolute deviation (most misaligned first)
  topicCoverage.sort(
    (a, b) =>
      Math.abs(b.deviationPercentPoints) - Math.abs(a.deviationPercentPoints)
  );

  const difficultyCoverage: DifficultyCoverageSummary[] = ([
    "Easy",
    "Medium",
    "Hard",
  ] as DifficultyKey[]).map((difficulty) => {
    const expectedPercent =
      trendsBundle.difficultyDistribution[difficulty] ?? 0;
    const marks = paper.difficultyMarks[difficulty] ?? 0;
    const actualPercent = totalMarks > 0 ? (marks / totalMarks) * 100 : 0;
    const deviationPercentPoints = actualPercent - expectedPercent;

    return {
      difficulty,
      expectedPercent,
      actualPercent,
      deviationPercentPoints,
      marks,
    };
  });

  return {
    paperId: paper.paperId,
    subject: paper.subject,
    totalMarks: paper.totalMarks,
    topicCoverage,
    difficultyCoverage,
  };
}

// ----------------- Trends bundle builders -----------------

function buildMathsTrendsBundle(
  trendsRoot: Class10MathTopicTrendsData
): TrendsBundle {
  const topicWeights: Record<string, number> = {};

  Object.entries(trendsRoot.topics).forEach(([topicKey, value]) => {
    topicWeights[topicKey] = (value as any).weightagePercent ?? 0;
  });

  // Maths trends already define a difficultyDistributionPercent with Easy/Medium/Hard
  const difficultyDistribution =
    trendsRoot.difficultyDistributionPercent as Record<DifficultyKey, number>;

  return {
    topicWeights,
    difficultyDistribution,
  };
}

function buildScienceTrendsBundle(
  trendsRoot: Class10ScienceTrendsRoot
): TrendsBundle {
  const topicWeights: Record<string, number> = {};

  Object.entries(trendsRoot.topics).forEach(([topicKey, topic]) => {
    topicWeights[topicKey] = (topic as any).weightagePercent ?? 0;
  });

  const difficultyDistribution =
    trendsRoot.difficultyDistributionPercent as Record<DifficultyKey, number>;

  return {
    topicWeights,
    difficultyDistribution,
  };
}

// ----------------- Subject & paper-specific selection logic -----------------

/**
 * Filter predictedQuestions by subject:
 * - Maths: questions with subject === "Maths" OR subject missing (treated as Maths)
 * - Science: questions with subject === "Science"
 *
 * This lets your current Maths-only bank keep working WITHOUT edits,
 * and later you can add Science questions with subject: "Science".
 */
function filterQuestionsBySubject(subject: SubjectKey): PredictedQuestion[] {
  if (subject === "Maths") {
    return predictedQuestions.filter(
      (q) => (q as any).subject === "Maths" || (q as any).subject == null
    );
  }

  // Science: use the dedicated science predictive bank.
  return predictedQuestionsScience as unknown as PredictedQuestion[];
}

/**
 * Topic multipliers to bias particular papers:
 * - For Maths:
 *   - P1: balanced
 *   - P2: algebra-heavy
 *   - P3: geometry-heavy
 * - For Science:
 *   - Currently all balanced (you can tweak later, e.g., Physics-heavy paper)
 */
function buildTopicMultipliersForPaper(
  subject: SubjectKey,
  paperMeta: PredictivePaper,
  allTopicKeys: string[]
): Record<string, number> {
  const base: Record<string, number> = {};
  allTopicKeys.forEach((k) => {
    base[k] = 1;
  });

  if (subject === "Maths") {
    // Maths specific biases
    const algebraTopics: string[] = [
      "Real Numbers",
      "Polynomials",
      "Pair of Linear Equations",
      "Quadratic Equations",
      "Arithmetic Progression",
      "Trigonometry",
      "Statistics",
      "Probability",
    ];

    const geometryTopics: string[] = [
      "Triangles",
      "Coordinate Geometry",
      "Circles",
      "Areas Related to Circles",
      "Surface Areas and Volumes",
    ];

    // Use id + slug/vibe for flexibility
    const id = paperMeta.id;
    const slug = paperMeta.slug.toLowerCase();

    const isAlgebraHeavy =
      id === "P2" || slug.includes("algebra-heavy") || slug.includes("algebra");

    const isGeometryFocus =
      id === "P3" ||
      slug.includes("geometry-focus") ||
      slug.includes("geometry");

    if (isAlgebraHeavy) {
      algebraTopics.forEach((t) => {
        if (base[t] != null) base[t] = 1.6;
      });
      geometryTopics.forEach((t) => {
        if (base[t] != null) base[t] = 0.8;
      });
    } else if (isGeometryFocus) {
      geometryTopics.forEach((t) => {
        if (base[t] != null) base[t] = 1.6;
      });
      algebraTopics.forEach((t) => {
        if (base[t] != null) base[t] = 0.9;
      });
    }
  } else {
    // Science: all balanced for now (you can later do Physics-heavy, Bio-heavy, etc.)
    // Example future tweak:
    // if (paperMeta.id === "SciP2") { boost Physics topics; reduce others }
  }

  return base;
}

// ----------------- Section-filling logic -----------------

interface FillSectionArgs {
  sectionTarget: SectionTarget;
  poolsBySection: Record<SectionKey, PredictedQuestion[]>;
  sections: Record<SectionKey, GeneratedQuestionSlot[]>;
  usedQuestionIds: Set<string>;
  scoreContext: CandidateScoreContext;
}

/**
 * Greedy fill of a section:
 * - Picks the "best" next question by scoring against:
 *   - topic weight × per-paper multiplier
 *   - difficulty under/over usage vs target marks
 *   - HPQ bias + presence of board-history meta
 * - Stops when marksTarget is roughly reached or no fitting questions remain.
 */
function fillSectionGreedy({
  sectionTarget,
  poolsBySection,
  sections,
  usedQuestionIds,
  scoreContext,
}: FillSectionArgs) {
  const { section, marksTarget } = sectionTarget;
  const pool = poolsBySection[section];

  let remainingMarks = marksTarget;
  let safetyCounter = 0;

  while (remainingMarks > 0 && safetyCounter < 500) {
    safetyCounter++;

    // Which difficulty is most underfilled across the whole paper?
    const desiredDifficulty = pickMostUnderfilledDifficulty(
      scoreContext.difficultyTargetMarks,
      scoreContext.difficultyUsedMarks
    );

    // Candidates that fit remaining marks and are not yet used
    const candidates = pool.filter(
      (q) =>
        !usedQuestionIds.has(q.id) &&
        q.marks <= remainingMarks
    );

    if (candidates.length === 0) {
      // No more questions that fit the remaining marks in this section
      break;
    }

    let bestScore = -Infinity;
    let bestQuestion: PredictedQuestion | null = null;

    for (const q of candidates) {
      const score = scoreQuestion(q, desiredDifficulty, scoreContext);
      if (score > bestScore) {
        bestScore = score;
        bestQuestion = q;
      }
    }

    if (!bestQuestion) break;

    // Place selected question
    usedQuestionIds.add(bestQuestion.id);
    remainingMarks -= bestQuestion.marks;

    const difficulty = (bestQuestion as any)
      .difficulty as DifficultyKey; // typed in predictedQuestions.ts
    scoreContext.difficultyUsedMarks[difficulty] += bestQuestion.marks;

    sections[section].push({
      questionId: bestQuestion.id,
      section,
      marks: bestQuestion.marks,
      difficulty,
      topicKey: String((bestQuestion as any).topicKey),
    });
  }
}

/**
 * Which difficulty is most underfilled so far vs its target marks?
 */
function pickMostUnderfilledDifficulty(
  targetMarks: Record<DifficultyKey, number>,
  usedMarks: Record<DifficultyKey, number>
): DifficultyKey {
  const keys: DifficultyKey[] = ["Easy", "Medium", "Hard"];

  let bestKey: DifficultyKey = "Easy";
  let bestRatio = Infinity;

  for (const k of keys) {
    const t = targetMarks[k];
    if (t <= 0) continue;
    const ratio = usedMarks[k] / t; // lower ratio = more underfilled
    if (ratio < bestRatio) {
      bestRatio = ratio;
      bestKey = k;
    }
  }

  return bestKey;
}

/**
 * Score a question for selection using the 5-signal prediction engine as
 * primary signal, with difficulty balance and topic diversity adjustments.
 */
function scoreQuestion(
  q: PredictedQuestion,
  desiredDifficulty: DifficultyKey,
  ctx: CandidateScoreContext
): number {
  const {
    topicWeights,
    topicMultipliers,
    difficultyTargetMarks,
    difficultyUsedMarks,
  } = ctx;

  const topicWeight = topicWeights[q.topicKey] ?? 0;
  const topicMult = topicMultipliers[q.topicKey] ?? 1;

  const fiveSignalScore = computePredictionScore({
    subject: ctx.subject,
    topicKey: q.topicKey,
    subtopic: q.subtopic || "",
    marks: q.marks,
    format: q.kind || "Short",
    bloomSkill: q.bloomSkill || "Applying",
    difficulty: q.difficulty || "Medium",
    policyTag: q.policyTag || "",
  });

  const predictionSignal = fiveSignalScore / 5.0;

  const topicDiversityBoost = topicWeight * topicMult;
  const normalizedTopicBoost = Math.min(1, topicDiversityBoost);

  let difficultyScore = 1;

  if (q.difficulty === desiredDifficulty) {
    difficultyScore += 0.5;
  }

  const target = difficultyTargetMarks[q.difficulty] || 1;
  const used = difficultyUsedMarks[q.difficulty] || 0;
  const ratio = used / target;
  if (ratio > 1.1) {
    difficultyScore *= 0.5;
  }

  return (predictionSignal * 0.6 + normalizedTopicBoost * 0.25 + difficultyScore * 0.15);
}
