// LazyTopper – Difficulty-Aware Practice Helper (light-touch)
// Location: src/prediction/difficultyAwarePractice.ts
// Purpose: Provide small helpers to pick questions with a difficulty mix based on
//          the v1 difficulty policy, without changing existing practiceSetGenerator
//          wiring yet.

import { PredictionCore } from "../data/predictionCore";
import {
  suggestDifficulty,
  type CanonicalQuestionLike,
  type DifficultyLabel,
} from "./difficultyAutoSuggest";

export interface DifficultyMix {
  easy: number;
  medium: number;
  hard: number;
}

export interface GenerateDifficultyBalancedSetArgs {
  topicKey?: string;
  totalQuestions: number;
  mix: DifficultyMix; // target counts per difficulty band
}

export interface DifficultyTaggedQuestion {
  question: CanonicalQuestionLike;
  difficulty: DifficultyLabel;
}

export function tagAllQuestionsWithDifficulty(): DifficultyTaggedQuestion[] {
  const questions: CanonicalQuestionLike[] = (PredictionCore as any).getAllQuestions
    ? (PredictionCore as any).getAllQuestions()
    : [];

  return questions.map((q) => ({
    question: q,
    difficulty: suggestDifficulty(q),
  }));
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

export function generateDifficultyBalancedSet(
  args: GenerateDifficultyBalancedSetArgs
): DifficultyTaggedQuestion[] {
  const { topicKey, totalQuestions, mix } = args;

  const tagged = tagAllQuestionsWithDifficulty();

  const filtered = topicKey
    ? tagged.filter((t) => {
        const qTopicKey = String(t.question.topicKey ?? "").trim();
        return qTopicKey === topicKey;
      })
    : tagged;

  const byDifficulty: Record<DifficultyLabel, DifficultyTaggedQuestion[]> = {
    easy: [],
    medium: [],
    hard: [],
  };

  for (const t of filtered) {
    byDifficulty[t.difficulty].push(t);
  }

  // Shuffle each bucket so we don't always pick the same subset.
  shuffleInPlace(byDifficulty.easy);
  shuffleInPlace(byDifficulty.medium);
  shuffleInPlace(byDifficulty.hard);

  const result: DifficultyTaggedQuestion[] = [];

  const takeFromBucket = (label: DifficultyLabel, count: number) => {
    const bucket = byDifficulty[label];
    const n = Math.min(count, bucket.length);
    for (let i = 0; i < n; i += 1) {
      result.push(bucket[i]);
    }
  };

  // 1) Take according to requested mix.
  takeFromBucket("easy", mix.easy);
  takeFromBucket("medium", mix.medium);
  takeFromBucket("hard", mix.hard);

  // 2) If we still have room (due to shortage in some bucket), fill from remaining
  //    questions across all buckets.
  if (result.length < totalQuestions) {
    const remaining: DifficultyTaggedQuestion[] = [];
    for (const label of ["easy", "medium", "hard"] as DifficultyLabel[]) {
      const bucket = byDifficulty[label];
      for (const t of bucket) {
        if (!result.includes(t)) {
          remaining.push(t);
        }
      }
    }
    shuffleInPlace(remaining);
    const needed = totalQuestions - result.length;
    result.push(...remaining.slice(0, needed));
  }

  return result.slice(0, totalQuestions);
}