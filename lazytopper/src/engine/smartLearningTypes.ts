// src/engine/smartLearningTypes.ts

import type { Class10SubjectKey } from "../data/class10ContentConfig";
import type { HPQDifficulty } from "../data/highlyProbableQuestions";

/**
 * Generic subject key.
 * For now we alias to your existing Class10SubjectKey, but this can be widened later
 * for other classes/boards.
 */
export type SubjectKey = Class10SubjectKey;

/**
 * Canonical chapter ID.
 * Recommendation: `${grade}-${subject}-${topicKey}` (e.g. "10-Maths-Polynomials").
 */
export type ChapterId = string;

/**
 * Difficulty-level stats inside a chapter.
 * Lets you later adapt question difficulty based on how the student is doing.
 */
export interface DifficultyStats {
  difficulty: HPQDifficulty;
  attempted: number;
  correct: number;
  totalTimeSeconds: number;
}

/**
 * Static metadata for a chapter, independent of user.
 * This roughly corresponds to the “Subject / Chapter” model in the wayahead doc.
 */
export interface ChapterMeta {
  id: ChapterId;
  grade: string; // e.g. "10"
  subject: SubjectKey; // "Maths" | "Science"
  topicKey: string; // matches your TopicHub / contentConfig key
  name: string; // human-readable, e.g. "Polynomials"
  boardWeightage: number; // e.g. 8 for "8 marks", 12 for "12 marks"
  tier: "must-crack" | "high-roi" | "good-to-do";
  difficultyMix?: {
    Easy?: number; // 0–1 fraction, optional
    Medium?: number;
    Hard?: number;
  };
  relatedChapterIds?: ChapterId[];
}

/**
 * Backend-oriented HPQ record.
 * You already have HPQQuestion on the front-end; this is the “server truth”.
 */
export interface HPQRecord {
  id: string;
  chapterId: ChapterId;
  grade: string;
  subject: SubjectKey;
  questionText: string;
  solution?: string;
  marks: number;
  difficulty: HPQDifficulty;
  tags?: string[]; // e.g. ["MCQ", "Case-based", "Trigonometry"]
  pastBoardYear?: string; // e.g. "CBSE 2023 Set 1"
}

/**
 * Per-user, per-chapter stats: the heart of the Smart Learning Engine.
 * This powers: mastery, weakness, recency, streaks, Mark Yield, Daily Mix, etc.
 */
export interface UserChapterStats {
  userId: string;
  chapterId: ChapterId;
  grade: string;
  subject: SubjectKey;

  // Core performance counters
  totalQuestionsAttempted: number;
  totalQuestionsCorrect: number;
  totalTimeSeconds: number; // sum of all HPQ / practice time for this chapter

  // Difficulty breakdown (optional but very useful later)
  difficultyStats?: {
    Easy?: DifficultyStats;
    Medium?: DifficultyStats;
    Hard?: DifficultyStats;
  };

  // Habit / recency info
  firstPracticedAt?: string; // ISO timestamp
  lastPracticedAt?: string;  // ISO timestamp
  daysPracticedCount?: number; // unique calendar days where user interacted
  currentStreakDays?: number; // consecutive days including today
  longestStreakDays?: number;

  // Pre-computed mastery snapshot (0–1).
  // This can be recomputed, but storing lastComputedMastery avoids recalculating
  // everywhere. Treat as a cache.
  lastComputedMastery?: number;

  // Last computed mark yield / match score (0–100).
  lastComputedMatchScore?: number;

  // Metadata for future analytics
  lastUpdatedAt?: string; // ISO timestamp
}

/**
 * Types of tasks in a study session.
 * This will be used by the planner + Daily Mix.
 */
export type StudyTaskType =
  | "hpq"        // practice Highly Probable Questions
  | "concept"    // read/revise a concept card / notes
  | "mock"       // full or partial mock test
  | "revision"   // light revision of an already-done chapter
  | "daily-mix"; // generated Daily Mix bundle

export interface StudyTask {
  id: string;
  taskType: StudyTaskType;
  chapterId: ChapterId;
  grade: string;
  subject: SubjectKey;

  // For HPQ / mock tasks
  plannedQuestionCount?: number;
  completedQuestionCount?: number;
  hpqQuestionIds?: string[];

  // Time info
  plannedMinutes?: number;
  actualMinutes?: number;

  // Status
  status?: "pending" | "in-progress" | "completed" | "skipped";
}

/**
 * A single continuous study session (planner block, Daily Mix, or ad-hoc).
 */
export interface StudySession {
  id: string;
  userId: string;
  grade: string;
  subject?: SubjectKey;

  tasks: StudyTask[];

  source: "planner" | "daily-mix" | "ad-hoc";

  startedAt: string;   // ISO timestamp
  completedAt?: string;
  cancelledAt?: string;

  // Vibe Check integration
  energyLevel?: "low" | "medium" | "high";
}

/* ------------------------------------------------------------------ */
/* Utility functions – mastery, recency penalty, and match score      */
/* ------------------------------------------------------------------ */

/**
 * Compute a mastery score (0–1) for a chapter given UserChapterStats.
 */
export function computeMastery(stats: UserChapterStats | undefined): number {
  if (!stats || stats.totalQuestionsAttempted <= 0) {
    // Not touched yet → mastery is 0
    return 0;
  }

  const accuracy =
    stats.totalQuestionsCorrect / stats.totalQuestionsAttempted;

  // Volume bonus – asymptotically approaches 1 as attempts increase
  const attemptCap = 30;
  const volumeFactor = Math.min(
    1,
    stats.totalQuestionsAttempted / attemptCap
  );

  // 70% from accuracy, 30% from how much practice volume they have
  const mastery = 0.7 * accuracy + 0.3 * volumeFactor;

  // Safety clamp
  if (mastery < 0) return 0;
  if (mastery > 1) return 1;
  return mastery;
}

/**
 * Compute a recency penalty (0–1).
 */
export function computeRecencyPenalty(
  lastPracticedAt?: string | null,
  now: Date = new Date()
): number {
  if (!lastPracticedAt) {
    return 1;
  }

  const last = new Date(lastPracticedAt);
  const diffMs = now.getTime() - last.getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  const days = diffMs / dayMs;

  if (days <= 2) return 0;
  if (days <= 7) return 0.2;
  if (days <= 21) return 0.5;
  return 0.8;
}

/**
 * Compute the Mark Yield / match score (0–100) for a chapter and user.
 */
export function computeMatchScoreForChapter(options: {
  chapter: ChapterMeta;
  stats?: UserChapterStats;
  maxBoardWeightage: number; // max weightage among all chapters for that subject
}): number {
  const { chapter, stats, maxBoardWeightage } = options;

  // Normalise board weightage to [0,1]
  const baseYield =
    maxBoardWeightage > 0
      ? chapter.boardWeightage / maxBoardWeightage
      : 0;

  const mastery = computeMastery(stats);
  const weakness = 1 - mastery;

  const raw =
    0.6 * baseYield +
    0.4 * weakness;

  let score = raw * 100;

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  return Math.round(score);
}

/* ------------------------------------------------------------------ */
/* Small helper to update UserChapterStats after an HPQ attempt       */
/* ------------------------------------------------------------------ */

export interface HpqAttemptPayload {
  userId: string;
  chapterId: ChapterId;
  grade: string;
  subject: SubjectKey;
  questionId?: string;
  marks?: number;
  section?: string;
  source?: "hpq-quick-mark" | "hpq-manual" | "mock-paper" | "other";
  /**
   * Difficulty can be undefined if the HPQQuestion did not specify it.
   * In that case we still update generic stats but skip difficulty breakdown.
   */
  difficulty?: HPQDifficulty;
  isCorrect: boolean;
  timeTakenSeconds: number;
  attemptedAt: string; // ISO timestamp
}

/**
 * Pure function: given existing stats (or undefined), returns updated stats
 * after recording one HPQ attempt.
 *
 * This can be used both on the server and client (optimistic updates).
 */
export function applyHpqAttemptToStats(
  prev: UserChapterStats | undefined,
  attempt: HpqAttemptPayload
): UserChapterStats {
  const base: UserChapterStats =
    prev ?? {
      userId: attempt.userId,
      chapterId: attempt.chapterId,
      grade: attempt.grade,
      subject: attempt.subject,
      totalQuestionsAttempted: 0,
      totalQuestionsCorrect: 0,
      totalTimeSeconds: 0,
      difficultyStats: {},
      firstPracticedAt: attempt.attemptedAt,
      lastPracticedAt: attempt.attemptedAt,
      daysPracticedCount: 0,
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastUpdatedAt: attempt.attemptedAt,
    };

  const next: UserChapterStats = {
    ...base,
  };

  // Update generic counters
  next.totalQuestionsAttempted =
    base.totalQuestionsAttempted + 1;
  if (attempt.isCorrect) {
    next.totalQuestionsCorrect =
      base.totalQuestionsCorrect + 1;
  }
  next.totalTimeSeconds =
    base.totalTimeSeconds + attempt.timeTakenSeconds;

  // Update difficulty slice only if difficulty is known
  if (attempt.difficulty) {
    if (!next.difficultyStats) {
      next.difficultyStats = {};
    }

    const diffKey = attempt.difficulty;
    const oldDiffStats = next.difficultyStats[diffKey] ?? {
      difficulty: diffKey,
      attempted: 0,
      correct: 0,
      totalTimeSeconds: 0,
    };

    const newDiffStats: DifficultyStats = {
      ...oldDiffStats,
      attempted: oldDiffStats.attempted + 1,
      correct: oldDiffStats.correct + (attempt.isCorrect ? 1 : 0),
      totalTimeSeconds:
        oldDiffStats.totalTimeSeconds + attempt.timeTakenSeconds,
    };

    next.difficultyStats[diffKey] = newDiffStats;
  }

  // Update recency / streaks
  const prevLast = base.lastPracticedAt
    ? new Date(base.lastPracticedAt)
    : null;
  const current = new Date(attempt.attemptedAt);

  next.lastPracticedAt = attempt.attemptedAt;
  next.lastUpdatedAt = attempt.attemptedAt;

  // First time: set basic streak info
  if (!prevLast) {
    next.daysPracticedCount = 1;
    next.currentStreakDays = 1;
    next.longestStreakDays = Math.max(
      next.longestStreakDays ?? 0,
      1
    );
  } else {
    const dayMs = 1000 * 60 * 60 * 24;
    const diffDays =
      Math.floor(
        (current.getTime() - prevLast.getTime()) / dayMs
      );

    const prevDaysPracticed = base.daysPracticedCount ?? 0;

    if (diffDays === 0) {
      // Same calendar day — do not change streak/dayCount
      next.daysPracticedCount = prevDaysPracticed;
      next.currentStreakDays = base.currentStreakDays ?? 1;
    } else if (diffDays === 1) {
      // Consecutive day → streak continues
      const newStreak = (base.currentStreakDays ?? 0) + 1;
      next.currentStreakDays = newStreak;
      next.daysPracticedCount = prevDaysPracticed + 1;
      next.longestStreakDays = Math.max(
        base.longestStreakDays ?? 0,
        newStreak
      );
    } else {
      // Gap → streak reset
      next.currentStreakDays = 1;
      next.daysPracticedCount = prevDaysPracticed + 1;
      next.longestStreakDays = Math.max(
        base.longestStreakDays ?? 0,
        1
      );
    }
  }

  // Optionally update cached mastery here
  next.lastComputedMastery = computeMastery(next);

  return next;
}
