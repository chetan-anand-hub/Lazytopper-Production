// src/data/blueprintConfig.ts
// CBSE Class 10 blueprint configuration for Maths + Science.
// Phase 0 version: captures the main exam structure. You can tweak
// counts/marks later to exactly match CBSE notification for a given year.

import type {
  LTSubjectKey,
  BlueprintSection,
  QuestionFormat,
  BlueprintSlot,
} from "./predictionTypes.ts";

export interface BlueprintSectionConfig {
  section: BlueprintSection;
  totalQuestions: number;
  marksPerQuestion: number | null; // null if mixed
  allowedFormats: QuestionFormat[];
}

export interface SubjectBlueprintConfig {
  subject: LTSubjectKey;
  sections: BlueprintSectionConfig[];
  // Slots describe the ideal distribution across topics / concepts.
  slots: BlueprintSlot[];
}

// ---------------------------------------------------------------------------
// Maths blueprint aligned to current Class X board-style pattern (80 marks).
// ---------------------------------------------------------------------------

export const mathsBlueprintV1: SubjectBlueprintConfig = {
  subject: "Maths",
  sections: [
    {
      section: "A",
      totalQuestions: 20, // 1-mark MCQs / VSA
      marksPerQuestion: 1,
      allowedFormats: ["MCQ", "VSA"],
    },
    {
      section: "B",
      totalQuestions: 5, // 2-mark short answers
      marksPerQuestion: 2,
      allowedFormats: ["Short"],
    },
    {
      section: "C",
      totalQuestions: 6, // 3-mark questions
      marksPerQuestion: 3,
      allowedFormats: ["Short", "Long"],
    },
    {
      section: "D",
      totalQuestions: 4, // 5-mark questions
      marksPerQuestion: 5,
      allowedFormats: ["Long"],
    },
    {
      section: "E",
      totalQuestions: 3, // Case-based
      marksPerQuestion: 4,
      allowedFormats: ["Case-Based"],
    },
  ],
  slots: [
    // Phase 0: keep this empty. In Phase 1 we will auto-generate or hand-fill
    // slots based on your topic trends + high-impact topics.
  ],
};

// ---------------------------------------------------------------------------
// Science blueprint uses the same A-E board-style section marks in product.
// ---------------------------------------------------------------------------

export const scienceBlueprintV1: SubjectBlueprintConfig = {
  subject: "Science",
  sections: [
    {
      section: "A",
      totalQuestions: 20,
      marksPerQuestion: 1,
      allowedFormats: ["MCQ", "VSA"],
    },
    {
      section: "B",
      totalQuestions: 5,
      marksPerQuestion: 2,
      allowedFormats: ["Short"],
    },
    {
      section: "C",
      totalQuestions: 6,
      marksPerQuestion: 3,
      allowedFormats: ["Short", "Long"],
    },
    {
      section: "D",
      totalQuestions: 4,
      marksPerQuestion: 5,
      allowedFormats: ["Long"],
    },
    {
      section: "E",
      totalQuestions: 3,
      marksPerQuestion: 4,
      allowedFormats: ["Case-Based"],
    },
  ],
  slots: [
    // Phase 0: empty. Phase 1 will define topic-wise slots using
    // class10ScienceTopicTrends + content config.
  ],
};

// Registry if you ever need to look up by subject key
export const subjectBlueprints: Record<LTSubjectKey, SubjectBlueprintConfig> = {
  Maths: mathsBlueprintV1,
  Science: scienceBlueprintV1,
};

