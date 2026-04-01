// src/data/practiceFilters.ts
// Shared type for passing extra practice preferences via navigation state
// from TopicTrends / HPQ / TopicHub into PracticePage.

import type { DifficultyChoice } from "./predictionDataService";

// Minimal, stable shape that PracticePage expects.
// You can safely extend this later if needed.
export interface PracticeFilters {
  // Optional hint about which sub-concept / type to bias towards.
  // Example: "independent events", "Euclid lemma", "lens numericals".
  subtopicHint?: string;

  // Optional list of question bank IDs (HPQs) to prioritise.
  // Typically derived from IDs used on the HPQ screen.
  focusBankIds?: string[];

  // Recommended number of questions for this drill.
  // PracticePage will use this as an initial default for the
  // "Questions" input, falling back to 10 if not provided.
  recommendedCount?: number;

  // Initial difficulty chip selection on PracticePage.
  // If omitted, the page starts at "All".
  difficultyPreset?: DifficultyChoice;
}
