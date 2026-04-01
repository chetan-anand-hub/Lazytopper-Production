// src/data/predictedScienceQuestions.ts

import {
  class10SciencePredictiveEngine,
  type ScienceSubtopicQuestion,
} from "./class10SciencePredictiveEngine";
import { scienceQuestionAdditions } from "./scienceQuestionAdditions";

// Alias type for convenience (similar spirit to PredictedQuestion in Maths)
export type PredictedScienceQuestion = ScienceSubtopicQuestion;

/**
 * Flat bank of all predicted Science questions
 * (topic → subtopic → questions flattened).
 * You can plug this into MockPaper / diagnostics just like Maths.
 */
export const predictedScienceQuestions: PredictedScienceQuestion[] =
  (() => {
    const seen = new Set<string>();
    const out: PredictedScienceQuestion[] = [];

    // 1) Engine-first: take all existing engine questions, then append additions
    for (const topic of class10SciencePredictiveEngine.topics) {
      const topicAdd = (scienceQuestionAdditions as any)[topic.code] as
        | Record<string, ScienceSubtopicQuestion[]>
        | undefined;

      for (const sub of topic.subtopics) {
        const merged = [...sub.questions, ...((topicAdd?.[sub.subtopic] ?? []) as any)];
        for (const q of merged) {
          if (seen.has(q.id)) continue;
          seen.add(q.id);
          out.push(q);
        }
      }

      // 2) Additions for any subtopics not present in engine spec
      if (topicAdd) {
        for (const [subName, qs] of Object.entries(topicAdd)) {
          const exists = topic.subtopics.some((s) => s.subtopic === subName);
          if (exists) continue;
          for (const q of qs) {
            if (seen.has(q.id)) continue;
            seen.add(q.id);
            out.push(q);
          }
        }
      }
    }

    return out;
  })();
