// src/engine/studyPlanner.ts

import type { ChapterMeta, HPQRecord } from "./smartLearningTypes.ts";

/**
 * Slightly enriched HPQ record for planning.
 * We can extend this later with more predictive fields if needed.
 */
export type PredictedQuestion = HPQRecord & {
  /**
   * Optional likelihood 0–1 (e.g. 0.8 for 80%).
   * If your predictedQuestions.ts already has a different field name,
   * you can map it into this when calling the planner.
   */
  likelihood?: number;
};

/**
 * One block inside a day's plan: e.g. Concept revision for Trigonometry,
 * HPQ practice for Polynomials, or a mini-mock.
 */
export type StudyBlockType = "Concept" | "HPQPractice" | "Mock";

export interface StudyBlock {
  chapterId: string;
  chapterName: string;
  type: StudyBlockType;
  durationMinutes: number;
  /**
   * For HPQ / Mock-style blocks, the planner can suggest a subset of questions.
   */
  questionIds?: string[];
}

/**
 * A single day in the planner output.
 */
export interface StudyDay {
  dayIndex: number;      // 0 = today
  label: string;         // e.g. "Day 1"
  totalMinutes: number;
  blocks: StudyBlock[];
}

/**
 * Input params for generating a study plan.
 */
export interface PlannerParams {
  totalDays: number;
  dailyMinutes: number;
  chapters: ChapterMeta[];
  predictedQuestions: PredictedQuestion[];
}

/* ------------------------------------------------------------------ */
/* Internal helpers                                                    */
/* ------------------------------------------------------------------ */

/**
 * Compute a score for each chapter based on:
 * - board weightage (boardWeightage on ChapterMeta)
 * - basic HPQ intensity (count * likelihood)
 *
 * (We can later fold in UserChapterStats / mastery from SmartLearningStore.)
 */
function computeChapterScores(
  chapters: ChapterMeta[],
  predictedQuestions: PredictedQuestion[]
): Record<string, number> {
  const scores: Record<string, number> = {};

  // Group questions by chapter
  const questionsByChapter: Record<string, PredictedQuestion[]> = {};
  for (const q of predictedQuestions) {
    if (!questionsByChapter[q.chapterId]) {
      questionsByChapter[q.chapterId] = [];
    }
    questionsByChapter[q.chapterId].push(q);
  }

  // Find max board weightage for normalisation
  const maxBoardWeightage =
    chapters.reduce(
      (max, ch) => Math.max(max, ch.boardWeightage ?? 0),
      0
    ) || 1;

  for (const chapter of chapters) {
    const { id, boardWeightage } = chapter;
    const chapterQuestions = questionsByChapter[id] || [];

    const avgLikelihood =
      chapterQuestions.length > 0
        ? chapterQuestions.reduce(
            (sum, q) => sum + (q.likelihood ?? 0.5),
            0
          ) / chapterQuestions.length
        : 0.5; // neutral if no data

    const hpqCount = chapterQuestions.length;

    // Normalised 0–1 based on boardWeightage
    const blueprintFactor =
      (boardWeightage ?? 0) / maxBoardWeightage;

    // HPQ intensity: more questions * higher likelihood
    const hpqIntensity = hpqCount * avgLikelihood;

    // Simple weighted combination (tweak later as needed)
    const score =
      0.7 * blueprintFactor +
      0.3 * Math.min(hpqIntensity / 10, 1); // compress intensity

    scores[id] = Math.max(score, 0.0001); // avoid zero
  }

  return scores;
}

/**
 * Distribute dailyMinutes between chapters according to their scores.
 */
function distributeMinutesPerChapter(
  totalMinutes: number,
  chapterScores: Record<string, number>
): Record<string, number> {
  const chapterIds = Object.keys(chapterScores);
  const totalScore = chapterIds.reduce(
    (sum, id) => sum + chapterScores[id],
    0
  );

  const minutes: Record<string, number> = {};
  if (totalScore === 0 || chapterIds.length === 0) {
    return minutes;
  }

  for (const id of chapterIds) {
    minutes[id] =
      (chapterScores[id] / totalScore) * totalMinutes;
  }

  return minutes;
}

/**
 * Turn "X minutes for this chapter" into 1–3 concrete blocks:
 * - Concept revision
 * - HPQ practice
 * - Optional mini-mock if enough time
 */
function chunkMinutesIntoBlocks(
  chapterId: string,
  chapterName: string,
  minutes: number,
  chapterQuestions: PredictedQuestion[]
): StudyBlock[] {
  const blocks: StudyBlock[] = [];
  if (minutes <= 0) return blocks;

  // Heuristic: at least 20 minutes if we're going to include a chapter
  if (minutes < 20) {
    blocks.push({
      chapterId,
      chapterName,
      type: "Concept",
      durationMinutes: Math.round(minutes),
    });
    return blocks;
  }

  const conceptMinutes = Math.max(
    15,
    Math.round(minutes * 0.4)
  );
  const hpqMinutes = Math.max(
    15,
    Math.round(minutes * 0.4)
  );
  const mockMinutes = Math.max(
    0,
    minutes - conceptMinutes - hpqMinutes
  );

  blocks.push({
    chapterId,
    chapterName,
    type: "Concept",
    durationMinutes: conceptMinutes,
  });

  // Sort HPQs by likelihood (highest first)
  const sortedQuestions = [...chapterQuestions].sort(
    (a, b) => (b.likelihood ?? 0.5) - (a.likelihood ?? 0.5)
  );
  const hpqIds = sortedQuestions
    .slice(0, 6) // top few
    .map((q) => q.id);

  if (hpqMinutes > 0 && hpqIds.length > 0) {
    blocks.push({
      chapterId,
      chapterName,
      type: "HPQPractice",
      durationMinutes: hpqMinutes,
      questionIds: hpqIds,
    });
  }

  if (mockMinutes >= 30 && hpqIds.length > 0) {
    blocks.push({
      chapterId,
      chapterName,
      type: "Mock",
      durationMinutes: mockMinutes,
      questionIds: hpqIds,
    });
  }

  return blocks;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Generate a simple day-by-day plan using chapter metadata and HPQ data.
 * This is static for now; later we can read mastery / stats from SmartLearningStore
 * to personalise which chapters get more load.
 */
export function generateStudyPlan(
  params: PlannerParams
): StudyDay[] {
  const {
    totalDays,
    dailyMinutes,
    chapters,
    predictedQuestions,
  } = params;

  if (
    totalDays <= 0 ||
    dailyMinutes <= 0 ||
    chapters.length === 0
  ) {
    return [];
  }

  const chapterScores = computeChapterScores(
    chapters,
    predictedQuestions
  );
  const perDayChapterMinutes = distributeMinutesPerChapter(
    dailyMinutes,
    chapterScores
  );

  // Group questions by chapter once
  const questionsByChapter: Record<string, PredictedQuestion[]> =
    {};
  for (const q of predictedQuestions) {
    if (!questionsByChapter[q.chapterId]) {
      questionsByChapter[q.chapterId] = [];
    }
    questionsByChapter[q.chapterId].push(q);
  }

  const days: StudyDay[] = [];

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
    const blocks: StudyBlock[] = [];

    for (const chapter of chapters) {
      const minutesForChapter =
        perDayChapterMinutes[chapter.id] ?? 0;

      if (minutesForChapter <= 0) continue;

      const chapterQs =
        questionsByChapter[chapter.id] ?? [];

      const chapterBlocks = chunkMinutesIntoBlocks(
        chapter.id,
        chapter.name,
        minutesForChapter,
        chapterQs
      );

      blocks.push(...chapterBlocks);
    }

    const totalPlannedMinutes = blocks.reduce(
      (sum, b) => sum + b.durationMinutes,
      0
    );

    days.push({
      dayIndex,
      label: `Day ${dayIndex + 1}`,
      totalMinutes: totalPlannedMinutes,
      blocks,
    });
  }

  return days;
}
