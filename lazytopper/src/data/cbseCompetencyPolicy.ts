// This configuration file defines multipliers and target distributions for the
// LazyTopper CBSE Class 10 predictive engine. It encapsulates policy-driven
// weights drawn from NEP‑aligned guidelines and recent CBSE trends.  The
// multipliers emphasise case‑based and assertion‑reasoning questions over
// traditional rote calculations and maintain a balanced cognitive skill mix.  It
// also specifies difficulty biases for different energy modes (Zombie vs Beast)
// and the daily mix recipe for focus sessions.

export const QUESTION_TYPE_MULTIPLIER: Record<string, number> = {
  /**
   * Multiple‑choice questions remain the baseline.  A weight of 1.0 means
   * they neither boost nor suppress a question’s selection likelihood.
   */
  mcq: 1.0,
  /**
   * Assertion‑Reasoning items are prioritised under the NEP competency
   * framework.  They encourage higher‑order thinking and are boosted by 35 %.
   */
  assertionReasoning: 1.35,
  /**
   * Case‑based and source‑based questions carry the highest policy weight.
   * They require application and analysis of real‑world scenarios.  Both are
   * assigned a multiplier of 1.45 to reflect the strong push towards
   * competency‑based assessment.
   */
  caseBased: 1.45,
  sourceBased: 1.45,
  /**
   * Traditional calculation‑heavy or purely procedural questions see a slight
   * reduction in emphasis because CBSE expects fewer rote problems.  They are
   * down‑weighted to 0.85.
   */
  traditional: 0.85,
  /**
   * Proof or long‑answer questions remain important but stable.  They are
   * gently de‑emphasised compared to competency‑focused items.
   */
  proof: 0.90,
};

export const BLOOM_TARGET_DISTRIBUTION: Record<string, number> = {
  /**
   * Remembering (recall of facts) should occupy a small slice of the practice
   * mix.  Too much emphasis on rote recall is discouraged.  Five percent
   * reflects occasional factual questions.
   */
  Remembering: 0.08,
  /**
   * Understanding (comprehension) ensures students grasp concepts.  Fifteen
   * percent of questions should confirm they can explain ideas in their own
   * words.
   */
  Understanding: 0.17,
  /**
   * Applying is the dominant cognitive level under NEP; forty percent of the
   * practice bank should involve solving problems or using concepts in novel
   * situations.
   */
  Applying: 0.38,
  /**
   * Analysing questions (recognising patterns, comparing methods) account for
   * roughly a quarter of the mix to encourage critical thinking.
   */
  Analysing: 0.25,
  /**
   * Evaluating (judging, critiquing) requires higher‑order reasoning but is
   * slightly less frequent.  Ten percent balances challenge with feasibility.
   */
  Evaluating: 0.10,
  /**
   * Creating (devising proofs, designing experiments) forms the smallest part
   * of the blueprint.  Five percent encourages students to synthesise ideas
   * without overwhelming them.
   */
  Creating: 0.02,
};

export const VIBE_MODE_DIFFICULTY_BIAS: Record<string, { easy: number; medium: number; hard: number }> = {
  /**
   * Zombie mode (low energy) gently biases the practice session towards easier
   * questions.  Sixty percent of items will be easy, thirty percent medium
   * and only ten percent hard.  This respects the student’s mood while still
   * offering some challenge.
   */
  zombie: { easy: 0.55, medium: 0.35, hard: 0.10 },
  /**
   * Beast mode (high energy) pushes learners towards tougher problems.  Half
   * of the questions will be hard, forty percent medium and ten percent easy.
   * This mode is for deep practice sessions.
   */
  beast: { easy: 0.15, medium: 0.40, hard: 0.45 },
};

export const DAILY_MIX_RECIPE = {
  /**
   * Number of high‑weightage concept items (e.g., a concise video or concept
   * card) to include in each Daily Focus Mix.
   */
  conceptItems: 1,
  /**
   * Count of “must‑crack” questions drawn from HPQ or predicted banks.  Three
   * board‑style questions deliver focused practice without fatigue.
   */
  mustCrackQuestions: 3,
  /**
   * Number of revision cards (flashcards summarising key formulas or tips)
   * appended to consolidate learning.
   */
  revisionCards: 1,
};

// End of cbseCompetencyPolicy.ts configuration