// src/data/predictionDataService.ts
//
// Thin wrapper around the unified Maths + Science practice generator.  This
// service provides the main entry point consumed by PracticePage and other
// screens when they want to spin up a practice drill.  It uses
// PredictionCore to fetch candidate questions and applies basic shuffling.

import type { CanonicalQuestion, DifficultyLevel, LTSubjectKey } from "./predictionTypes";
import { PredictionCore } from "./predictionCore";

// Local re-export: what the PracticePage uses.  We alias CanonicalQuestion
// to PracticeQuestion to avoid leaking implementation details.
export type PracticeQuestion = CanonicalQuestion;

// Difficulty choice as seen in the UI.  "All" means no filter.
export type DifficultyChoice = "All" | DifficultyLevel;

// Request shape for generating a practice pool.  Only a subset of the
// original fields are supported here; additional filters can be added later.
export interface PracticeGenerationRequest {
  subject: LTSubjectKey;
  topicKey: string;
  count: number;
  difficulty?: DifficultyChoice;
  subtopicHint?: string;
  focusBankIds?: string[];
}

export function generatePracticeQuestions(
  req: PracticeGenerationRequest
): PracticeQuestion[] {
  const { subject, topicKey, count, difficulty, subtopicHint, focusBankIds } = req;

  // Fetch all canonical questions for the topic and keep subject-boundary strict.
  let pool = PredictionCore.getLikelyQuestionsForConcept(topicKey);
  pool = pool.filter((q: PracticeQuestion) => q.subject === subject);

  // Apply difficulty filter if provided (and not "All").
  const effectiveDifficulty: DifficultyLevel | undefined =
    difficulty && difficulty !== "All" ? (difficulty as DifficultyLevel) : undefined;
  if (effectiveDifficulty) {
    // Explicitly type q to avoid implicit any errors.
    pool = pool.filter((q: PracticeQuestion) => q.difficulty === effectiveDifficulty);
  }

  // Bias towards subtopic hints if provided by placing matching questions first.
  if (subtopicHint) {
    const lower = subtopicHint.toLowerCase();
    const primary = pool.filter((q: PracticeQuestion) => q.subtopic.toLowerCase().includes(lower));
    const others = pool.filter((q: PracticeQuestion) => !primary.includes(q));
    if (primary.length > 0) {
      pool = [...primary, ...others];
    }
  }

  // Prioritise questions whose IDs are in focusBankIds.
  if (focusBankIds && focusBankIds.length > 0) {
    const focusSet = new Set(focusBankIds);
    const primary = pool.filter((q: PracticeQuestion) => focusSet.has(q.id));
    const others = pool.filter((q: PracticeQuestion) => !focusSet.has(q.id));
    if (primary.length > 0) {
      pool = [...primary, ...others];
    }
  }

  // Ensure we have enough questions. If sparse, repeat the pool in a bounded
  // way so high-demand drills still return the requested count.
  const result: PracticeQuestion[] = [];
  let safety = 0;
  while (result.length < count && safety < 5) {
    result.push(...pool);
    safety += 1;
  }

  // Shuffle the pool to vary the order between sessions.
  const shuffled = shuffle(result);
  return shuffled.slice(0, count);
}

function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
