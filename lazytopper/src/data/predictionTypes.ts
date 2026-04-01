// src/data/predictionTypes.ts
// Canonical prediction + question types for LazyTopper.
//
// This file defines the core enums and interfaces used across the
// prediction engine, practice generator and TopicHub integration.  It is
// extracted from the full LazyTopper code base and can be extended as
// needed.  By centralising these types here, we avoid circular imports
// and make it easy to import a consistent `CanonicalQuestion` shape.

// Subjects covered in LazyTopper v1
export type LTSubjectKey = "Maths" | "Science";

// Difficulty buckets (aligned with existing DifficultyKey)
export type DifficultyLevel = "Easy" | "Medium" | "Hard";

// Bloom taxonomy skill level
export type BloomLevel =
  | "Remembering"
  | "Understanding"
  | "Applying"
  | "Analysing"
  | "Evaluating"
  | "Creating";

// Question format / style
export type QuestionFormat =
  | "MCQ"
  | "Short"
  | "Assertion-Reasoning"
  | "Case-Based"
  | "Long"
  | "VSA";

// Canonical question model
//
// CanonicalQuestion represents a unified view of Maths and Science
// practice questions.  In the full code base each question also maps to
// blueprint slots, prediction scores and variant cluster IDs.  For this
// phase we include only the core fields required by PracticePage and the
// practice engine.  Additional metadata can be added later as needed.
export interface CanonicalQuestion {
  id: string;
  subject: LTSubjectKey;
  topicKey: string;
  subtopic: string;
  section: string;
  marks: number;
  format: QuestionFormat;
  difficulty: DifficultyLevel;
  bloomSkill: BloomLevel;
  questionText: string;
  options?: string[];
  answer?: string;
  explanation?: string;
  solutionSteps?: string[];
  finalAnswer?: string;
  strategyHint?: string;
  // Future predictive metadata (optional)
  predictionScore?: number;
  predictionStrength?: string;

  /**
   * Blueprint slot identifier mapping this question to a specific slot in
   * the exam blueprint.  Optional because Phase 0 does not tag all
   * questions.
   */
  blueprintSlotId?: string;
  /**
   * CBSE/board year tag used for recency scoring (e.g. "2023", "2022").
   */
  pastBoardYear?: string;
  /**
   * Policy tag indicating the priority of this question (e.g. must‑crack,
   * high‑roi).  Used by the prediction engine to boost scores.
   */
  policyTag?: string;
}

// -----------------------------------------------------------------------------
// Additional blueprint and difficulty aliases
//
// A SectionKey groups questions into exam sections A–E.  DifficultyKey is
// exported for compatibility with legacy prediction types.  BlueprintSection
// enumerates the major sections used in the blueprint configuration, and
// BlueprintSlot describes a single slot in the exam blueprint.  These
// definitions live here so that consumers across the prediction and
// blueprint modules can import from a single location.

/** Exam paper section identifiers (A through E). */
export type SectionKey = "A" | "B" | "C" | "D" | "E";

/** Alias for DifficultyLevel used in older prediction modules. */
export type DifficultyKey = DifficultyLevel;

/** High-level section definitions used in blueprint configuration. */
export type BlueprintSection = SectionKey;

/**
 * A slot in the exam blueprint representing a specific question slot.  Slots
   * may be associated with topics/concepts in later phases but are empty in
   * Phase 0.
 */
export interface BlueprintSlot {
  id: string;
  /** Associated section (A–E) of the paper. */
  section: BlueprintSection;
  /** Marks assigned to this slot. */
  marks: number;
  /** Optional Bloom level for this slot. */
  bloomLevel?: BloomLevel;
  /** Optional difficulty expectation for this slot. */
  difficulty?: DifficultyLevel;
}
