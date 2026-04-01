// src/utils/mockPaperEngineScience.ts

import type {
  PredictedScienceQuestion,
  SciSectionKey,
  SciDifficultyKey,
} from "../data/predictedQuestionsScience";
import { class10ScienceTopicTrends } from "../data/class10ScienceTopicTrends";
import {
  buildConstrainedPaper,
  type ConstrainedPaperCandidate,
} from "../prediction/constrainedPaperConstructor";
import { getCanonicalHistoricalDataset } from "../prediction/historicalDataset";
import { scoreArchetypeWithBayesianSmoothing } from "../prediction/probabilisticScoring";

// --- Types for the built Science mock paper -------------------------

export interface ScienceMockPaperSection {
  key: SciSectionKey;              // "A" | "B" | "C" | "D" | "E"
  title: string;                   // e.g. "Section A"
  targetMarks: number;             // blueprint target
  actualMarks: number;             // sum of chosen questions
  questions: PredictedScienceQuestion[];
}

export interface ScienceMockPaper {
  paperId: string;
  paperTitle: string;
  subject: "Science";
  totalTargetMarks: number;
  totalActualMarks: number;
  sections: ScienceMockPaperSection[];
}

// This is the shape we EXPECT from predictivePapers for Science.
// Extra fields are fine – we only read the ones below.
export interface SciencePaperBlueprint {
  id: string;
  title: string;
  slug: string;
  subject?: string; // can be "Science" in your predictivePapers.ts
  targetMarksBySection: Partial<Record<SciSectionKey, number>>;
  focusTopics?: string[]; // topicKey strings from predictedQuestionsScience
  difficultyMix?: Partial<Record<SciDifficultyKey, number>>; // optional % weights
}

// Options for building the paper
export interface ScienceEngineOptions {
  shuffle?: boolean;          // randomise questions within each section
  allowOverflowMarks?: boolean; // allow slightly exceeding target marks
}

// --------------------------------------------------------------
// Utility helpers
// --------------------------------------------------------------

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function titleForSection(sec: SciSectionKey): string {
  return `Section ${sec}`;
}

function scienceTopicDisplay(topicKey: string): string {
  const typedKey = topicKey as keyof typeof class10ScienceTopicTrends.topics;
  return class10ScienceTopicTrends.topics[typedKey]?.topicName ?? topicKey;
}

function topicTrendWeight(topicKey: string): number {
  const typedKey = topicKey as keyof typeof class10ScienceTopicTrends.topics;
  const pct = class10ScienceTopicTrends.topics[typedKey]?.weightagePercent ?? 0;
  if (pct <= 0) return 1;
  return Math.max(0.85, Math.min(1.35, pct / 8));
}

function policyRegimeForYear(year: number) {
  if (year >= 2023) return "nep_competency_2023_plus" as const;
  if (year >= 2020) return "nep_transition_2020_2022" as const;
  return "nep_pre_2020" as const;
}

// Simple greedy selector that tries to hit target marks using
// available questions in that section, giving soft preference
// to a difficulty mix if provided.
function pickQuestionsForSection(
  sectionKey: SciSectionKey,
  targetMarks: number,
  bank: PredictedScienceQuestion[],
  focusTopics?: string[],
  difficultyMix?: Partial<Record<SciDifficultyKey, number>>,
  shuffle: boolean = true,
  allowOverflowMarks: boolean = true
): { questions: PredictedScienceQuestion[]; marks: number } {
  if (targetMarks <= 0) {
    return { questions: [], marks: 0 };
  }

  // Filter by section + optional focus topic list
  let candidates = bank.filter((q) => q.section === sectionKey);

  if (focusTopics && focusTopics.length > 0) {
    const topicSet = new Set(focusTopics);
    const focused = candidates.filter((q) => topicSet.has(q.topicKey));
    if (focused.length > 0) {
      candidates = focused;
    }
  }

  if (candidates.length === 0) {
    return { questions: [], marks: 0 };
  }

  // If a difficulty mix is provided, we lightly sort by how
  // close each question's difficulty is to the requested mix.
  if (difficultyMix && Object.keys(difficultyMix).length > 0) {
    const totalWeight = (Object.values(difficultyMix) as number[]).reduce(
      (sum, w) => sum + (w || 0),
      0
    );

    const desiredShare: Partial<Record<SciDifficultyKey, number>> = {};
    (Object.keys(difficultyMix) as SciDifficultyKey[]).forEach((diff) => {
      const w = difficultyMix[diff] ?? 0;
      desiredShare[diff] = totalWeight > 0 ? w / totalWeight : 0;
    });

    // Score each candidate: prefer difficulties with higher weight
    candidates = [...candidates].sort((a, b) => {
      const sa = desiredShare[a.difficulty] ?? 0;
      const sb = desiredShare[b.difficulty] ?? 0;
      return sb - sa;
    });
  }

  if (shuffle) {
    candidates = shuffleArray(candidates);
  }

  const chosen: PredictedScienceQuestion[] = [];
  let currentMarks = 0;

  for (const q of candidates) {
    const nextMarks = currentMarks + q.marks;

    // If we are not allowed to overflow and adding this overshoots
    // the target by a lot, skip it.
    if (!allowOverflowMarks && nextMarks > targetMarks) {
      continue;
    }

    chosen.push(q);
    currentMarks = nextMarks;

    // Stop if we've reached or just crossed the target
    if (currentMarks >= targetMarks) {
      break;
    }
  }

  return { questions: chosen, marks: currentMarks };
}

// --------------------------------------------------------------
// Public API
// --------------------------------------------------------------

// Main engine function: use this in your Science MockPaper page.
// Example call:
//   const mockPaper = buildScienceMockPaperFromBank(paperMeta, predictedQuestionsScience);
export function buildScienceMockPaperFromBank(
  paperMeta: SciencePaperBlueprint,
  bank: PredictedScienceQuestion[],
  options?: ScienceEngineOptions
): ScienceMockPaper {
  const { shuffle = true, allowOverflowMarks = true } = options || {};

  const sectionOrder: SciSectionKey[] = ["A", "B", "C", "D", "E"];
  const sectionMarks: Record<SciSectionKey, number> = {
    A: paperMeta.targetMarksBySection.A ?? 0,
    B: paperMeta.targetMarksBySection.B ?? 0,
    C: paperMeta.targetMarksBySection.C ?? 0,
    D: paperMeta.targetMarksBySection.D ?? 0,
    E: paperMeta.targetMarksBySection.E ?? 0,
  };

  const targetYear = new Date().getFullYear();
  const historicalItems = getCanonicalHistoricalDataset().items;
  const topicFilter = paperMeta.focusTopics?.length
    ? new Set(paperMeta.focusTopics)
    : null;
  const candidateBank = topicFilter
    ? bank.filter((question) => topicFilter.has(question.topicKey))
    : bank;

  const byId = new Map(candidateBank.map((question) => [question.id, question]));
  const constrainedCandidates: ConstrainedPaperCandidate[] = candidateBank.map(
    (question) => {
      const scored = scoreArchetypeWithBayesianSmoothing({
        input: {
          subject: "Science",
          topic: scienceTopicDisplay(question.topicKey),
          subtopic: question.subtopic,
          marks: question.marks,
          format: question.kind,
          bloom: question.bloomSkill,
          policyTag: question.policyTag,
          sourceYearHint: Number(question.pastBoardYear || "") || targetYear - 1,
        },
        context: {
          targetYear,
          policyRegime: policyRegimeForYear(targetYear),
          topicTrendWeight: topicTrendWeight(question.topicKey),
        },
        historicalItems,
      });

      const isCaseOrAssertion =
        question.kind === "Case-Based" || question.kind === "Assertion-Reasoning";
      const competencyType = isCaseOrAssertion
        ? question.kind.toLowerCase()
        : question.bloomSkill.toLowerCase();

      return {
        id: question.id,
        subject: "Science",
        topicKey: question.topicKey,
        subtopic: question.subtopic,
        section: question.section,
        marks: question.marks,
        format: question.kind,
        competencyType,
        score: scored.posterior * 10 + scored.confidence * 4,
      };
    }
  );

  const constrained = buildConstrainedPaper({
    candidates: constrainedCandidates,
    blueprint: {
      sectionMarks,
      competencyFocusedMinShare: 0.5,
      caseBasedMinCount: 3,
    },
  });

  const sections: ScienceMockPaperSection[] = [];
  let totalTarget = 0;
  let totalActual = 0;

  const constrainedTargetMarks = sectionOrder.reduce(
    (sum, sec) => sum + sectionMarks[sec],
    0
  );

  if (
    constrained.selected.length > 0 &&
    constrained.totalMarks >= constrainedTargetMarks &&
    constrained.diagnostics.constraintsSatisfied
  ) {
    for (const sec of sectionOrder) {
      const targetMarks = sectionMarks[sec];
      totalTarget += targetMarks;
      const questions = constrained.bySection[sec]
        .map((row) => byId.get(row.id))
        .filter((question): question is PredictedScienceQuestion => Boolean(question));
      const marks = questions.reduce((sum, question) => sum + question.marks, 0);
      totalActual += marks;
      sections.push({
        key: sec,
        title: titleForSection(sec),
        targetMarks,
        actualMarks: marks,
        questions,
      });
    }

    return {
      paperId: paperMeta.id,
      paperTitle: paperMeta.title,
      subject: "Science",
      totalTargetMarks: totalTarget,
      totalActualMarks: totalActual,
      sections,
    };
  }

  for (const sec of sectionOrder) {
    const targetMarks = paperMeta.targetMarksBySection[sec] ?? 0;
    totalTarget += targetMarks;

    const { questions, marks } = pickQuestionsForSection(
      sec,
      targetMarks,
      bank,
      paperMeta.focusTopics,
      paperMeta.difficultyMix,
      shuffle,
      allowOverflowMarks
    );

    totalActual += marks;

    sections.push({
      key: sec,
      title: titleForSection(sec),
      targetMarks,
      actualMarks: marks,
      questions,
    });
  }

  return {
    paperId: paperMeta.id,
    paperTitle: paperMeta.title,
    subject: "Science",
    totalTargetMarks: totalTarget,
    totalActualMarks: totalActual,
    sections,
  };
}
