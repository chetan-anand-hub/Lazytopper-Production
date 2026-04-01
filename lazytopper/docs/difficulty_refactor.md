# Difficulty & Prediction Scoring Refactor

This document outlines a plan to harmonise difficulty policies and prediction scores across the LazyTopper practice engine.  Currently, difficulty and scoring are handled in multiple places (e.g., `practiceSetGenerator.ts`, `difficultyAutoSuggest.ts`, `predictionCore.ts`).  Consolidation will make it easier to tune question selection and provide consistent feedback to students.

## 1. Centralise Difficulty Levels

* **Define canonical difficulty levels** in `predictionTypes.ts` (already done).  All modules should refer to `DifficultyLevel` rather than bespoke strings.
* **Update question sources** to map any existing fields (`difficulty`, `canonicalDifficulty`, `policyDifficulty`) to `DifficultyLevel`.  This can be done in the data layer (e.g., when constructing `CanonicalQuestion` entries).
* **Remove duplicate auto‑suggest functions** by creating a unified `suggestDifficulty(q: CanonicalQuestion): DifficultyLevel` in a new file (e.g., `src/prediction/difficultyPolicy.ts`).  This function can consider marks, question type and past appearance in exams.

## 2. Unify Prediction Score Calculation

* **Current state:** `PredictionCore` sorts questions by `predictionScore`, but how that score is computed is scattered across older engines (e.g., frequency × recency × rotation × policy boost).
* **Proposal:** Implement a single `computePredictionScore(q: CanonicalQuestion): number` that incorporates:
  - **Historical frequency** of the question or its concept in past exams.
  - **Recency weighting** for how recently the concept appeared.
  - **Rotation/coverage factor** to avoid repeating the same questions too often.
  - **Policy boosts** for must‑crack topics identified by subject experts.
* **Normalise scores** to a 0–1 range so they can be easily combined with other metrics (e.g., match percentage).
* **Attach the score** to each `CanonicalQuestion` when building `canonicalQuestionBank`.

## 3. Integrate Difficulty Mixes

* **Move difficultyMix defaults** into a shared config file (e.g., `difficultyPolicy.ts`).  For example:

  ```ts
  export const DEFAULT_DIFFICULTY_MIX: Record<DifficultyLevel, number> = {
    Easy: 0.4,
    Medium: 0.4,
    Hard: 0.2
  };
  export const EXAM_MIX: Record<DifficultyLevel, number> = {
    Easy: 0.3,
    Medium: 0.5,
    Hard: 0.2
  };
  ```
* **Have the practice generator and practice engine import these mixes** rather than hard‑coding values.  This makes it trivial to adjust policies globally.
* **Allow per‑topic overrides** (e.g., some topics might not have Hard questions available).  These can be specified in a metadata file loaded at startup.

## 4. Logging & Analytics

To refine difficulty policies over time, collect anonymised data on how students perform on questions of each difficulty:

* **Attempt counts:** How many students attempted a given question?
* **Correctness rates:** Percentage of correct answers per difficulty.
* **Time spent:** Average time taken to answer by difficulty level.

Analyse this data periodically to adjust difficulty mixes and refine `suggestDifficulty()` heuristics.

## 5. Phased Rollout

1. **Create the unified difficulty and scoring modules** and refactor the existing code to consume them.
2. **Test with a small subset of questions** to verify that selection feels balanced and prediction scores behave sensibly.
3. **Gradually expand** to the full question bank, monitoring user engagement and performance metrics.
