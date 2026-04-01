// src/types/prediction.ts
// Centralised cross-subject prediction types for LazyTopper Class 10.
// This file does NOT change your existing data files; it provides a unified
// type layer (Maths + Science) that Session A (Prediction + HPQ data model)
// and later Planner / Mentor code can use safely.

import type { Class10TopicKey } from "../data/class10MathTopicTrends";
import type {
  Class10ScienceTopicKey,
} from "../data/class10ScienceTopicTrends";

import type {
  PredictedQuestion as MathsPredictedQuestion,
  DifficultyKey as MathsDifficultyKey,
  QuestionKind as MathsQuestionKind,
  SectionKey as MathsSectionKey,
  BloomSkill as MathsBloomSkill,
} from "../data/predictedQuestions";

import type {
  SciencePredictedQuestion,
  DifficultyKey as ScienceDifficultyKey,
  QuestionKind as ScienceQuestionKind,
  SectionKey as ScienceSectionKey,
  BloomSkill as ScienceBloomSkill,
} from "../data/predictedQuestionsScience";

// ---------------------------------------------------------------------------
// Shared subject + enums
// ---------------------------------------------------------------------------

export type LTSubject = "Maths" | "Science";

// These unions are identical string unions in both banks; we keep the aliases
// separate for now in case we ever diverge by subject.
export type UnifiedDifficultyKey =
  | MathsDifficultyKey
  | ScienceDifficultyKey;

export type UnifiedQuestionKind =
  | MathsQuestionKind
  | ScienceQuestionKind;

export type UnifiedSectionKey =
  | MathsSectionKey
  | ScienceSectionKey;

export type UnifiedBloomSkill =
  | MathsBloomSkill
  | ScienceBloomSkill;

// ---------------------------------------------------------------------------
// Base cross-subject prediction record
// ---------------------------------------------------------------------------

/**
 * BasePredictedQuestion describes the *full* envelope that the LazyTopper
 * prediction engine works with, across Maths + Science.
 *
 * Existing files like `predictedQuestions.ts` (Maths) and
 * `predictedQuestionsScience.ts` (Science) stay as they are; we create
 * intersection types below so common services can treat both as one union.
 */
export interface BasePredictedQuestion {
  id: string;
  subject: LTSubject;

  // Narrowed by subject through the Standard* types below
  topicKey: Class10TopicKey | Class10ScienceTopicKey;
  subtopic: string;

  kind: UnifiedQuestionKind;
  section: UnifiedSectionKey;
  marks: number;
  difficulty: UnifiedDifficultyKey;
  bloomSkill: UnifiedBloomSkill;

  questionText: string;
  options?: string[]; // MCQ / AR stems

  // Core solution info (required in current banks)
  answer: string;
  explanation: string;

  // Optional Socratic / step-wise solution data
  solutionSteps?: string[];
  finalAnswer?: string;
  strategyHint?: string;

  // Predictive-engine metadata
  pastBoardYear?: string;
  policyTag?: string;
}

// ---------------------------------------------------------------------------
// Subject-specific standard shapes
// ---------------------------------------------------------------------------

/**
 * StandardMathsPredictedQuestion:
 *  - Composes the existing `PredictedQuestion` (Maths) with:
 *    - a `subject: "Maths"` tag
 *    - a `topicKey` narrowed to Class10TopicKey
 *
 *  At runtime, your existing `predictedQuestions` array still uses the
 *  original `PredictedQuestion` type; services that need the unified view
 *  can cast or map to this intersection when they also tag the subject.
 */
export type StandardMathsPredictedQuestion = MathsPredictedQuestion &
  BasePredictedQuestion & {
    subject: "Maths";
    topicKey: Class10TopicKey;
  };

/**
 * StandardSciencePredictedQuestion:
 *  - Composes the existing `SciencePredictedQuestion` with:
 *    - a `subject: "Science"` tag
 *    - a `topicKey` narrowed to Class10ScienceTopicKey
 */
export type StandardSciencePredictedQuestion = SciencePredictedQuestion &
  BasePredictedQuestion & {
    subject: "Science";
    topicKey: Class10ScienceTopicKey;
  };

// Union that any cross-subject service (HPQ views, Mock builder,
// Planner engine, AI Mentor context helpers) can depend on.
export type AnyPredictedQuestion =
  | StandardMathsPredictedQuestion
  | StandardSciencePredictedQuestion;

/**
 * Convenience type: cross-subject ID.
 * For now this is just a string; if you later create branded ID types,
 * you can swap this alias without touching callers.
 */
export type AnyPredictedQuestionId = string;
