/*
 * Practice Insights Service
 *
 * Records and retrieves practice attempts for analytics features like
 * Daily Mix and Weekly Wrapped.
 */

import {
  buildProgressScopeKey,
  getActiveProgressUser,
  saveLearnerProgressSegment,
} from "./studentProgressStore";

export type LTSubject = "maths" | "science";
export type DifficultyLevel = "Easy" | "Medium" | "Hard";

export interface PracticeAttempt {
  id: string;
  questionId: string;
  topicKey: string;
  topicName?: string;
  subject: LTSubject;
  difficulty: DifficultyLevel;
  bloomSkill?: string;
  correct: boolean;
  timestamp: number;
}

export interface PracticeInsights {
  attempts: PracticeAttempt[];
}

export interface PracticeWeakConcept {
  concept: string;
  count: number;
}

export interface PracticeCommonMistake {
  mistake: string;
  count: number;
}

export interface PracticeInsightSnapshot {
  weakConcepts: PracticeWeakConcept[];
  commonMistakes: PracticeCommonMistake[];
}

const LEGACY_STORAGE_KEY = "lazyTopper_practice_insights";

function getStorageKey(): string {
  return buildProgressScopeKey("practiceInsights", getActiveProgressUser());
}

/**
 * Load all recorded practice attempts from localStorage.
 */
export function loadInsights(): PracticeInsights {
  if (typeof window === "undefined") {
    return { attempts: [] };
  }
  try {
    const scopedKey = getStorageKey();
    const raw =
      window.localStorage.getItem(scopedKey) ||
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return { attempts: [] };
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.attempts)) {
      if (!window.localStorage.getItem(scopedKey)) {
        window.localStorage.setItem(scopedKey, raw);
      }
      return { attempts: parsed.attempts as PracticeAttempt[] };
    }
  } catch (err) {
    console.warn("Failed to parse practice insights from localStorage:", err);
  }
  try {
    window.localStorage.removeItem(getStorageKey());
  } catch {
    // ignore
  }
  return { attempts: [] };
}

/**
 * Persist the given practice insights to localStorage.
 */
export function saveInsights(data: PracticeInsights): void {
  if (typeof window === "undefined") return;
  try {
    const scopedKey = getStorageKey();
    window.localStorage.setItem(scopedKey, JSON.stringify(data));
    const uid = getActiveProgressUser();
    if (uid) {
      void saveLearnerProgressSegment(uid, "attempts", data.attempts);
    }
  } catch (err) {
    console.warn("Failed to save practice insights:", err);
  }
}

/**
 * Record a single practice attempt.
 */
export function recordAttempt(attempt: Omit<PracticeAttempt, "id"> & { id?: string }): void {
  const data = loadInsights();
  const id =
    attempt.id ?? `${attempt.questionId}-${attempt.topicKey}-${Date.now().toString(36)}`;
  data.attempts.push({ ...attempt, id });
  saveInsights(data);
}

/**
 * Retrieve attempts within a given time range.
 */
export function getAttempts(options: {
  start?: number;
  end?: number;
} = {}): PracticeAttempt[] {
  const { start, end } = options;
  const data = loadInsights();
  return data.attempts.filter((attempt) => {
    const ts = attempt.timestamp;
    if (start !== undefined && ts < start) return false;
    if (end !== undefined && ts > end) return false;
    return true;
  });
}

/**
 * Clear all recorded practice insights.
 */
export function clearInsights(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getStorageKey());
    const uid = getActiveProgressUser();
    if (!uid) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch (err) {
    console.warn("Failed to clear practice insights:", err);
  }
}

/**
 * Compute a lightweight snapshot of weak concepts and common mistakes.
 */
export function computePracticeInsights(options: {
  grade: number;
  subject: string;
  topic: string;
}): PracticeInsightSnapshot {
  const attempts = getAttempts();
  const weakCounts: Record<string, number> = {};
  for (const a of attempts) {
    if (options.subject && a.subject !== options.subject.toLowerCase()) continue;
    if (options.topic && a.topicKey !== options.topic) continue;
    if (!a.correct) {
      const key = a.topicKey;
      weakCounts[key] = (weakCounts[key] ?? 0) + 1;
    }
  }
  const weakConcepts: PracticeWeakConcept[] = Object.entries(weakCounts)
    .map(([concept, count]) => ({ concept, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const commonMistakes: PracticeCommonMistake[] = [];
  return { weakConcepts, commonMistakes };
}
