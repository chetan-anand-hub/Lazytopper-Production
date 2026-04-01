// src/utils/mockBuilder.ts

import {
  class10TopicTrendList,
  type TopicTier,
} from "../data/class10MathTopicTrends";
import {
  class10ScienceTopicTrendList,
} from "../data/class10ScienceTopicTrends";

import {
  predictedQuestions,
  type PredictedQuestion,
} from "../data/predictedQuestions";

import {
  predictedQuestionsScience,
  type PredictedScienceQuestion,
} from "../data/predictedQuestionsScience";

export interface TierMarksSummary {
  tier: TopicTier;
  marks: number;
  questionCount: number;
}

// Make this generic so we can reuse it for Science too.
// Default type keeps existing imports working.
export interface BuiltMockPaper<TQuestion = PredictedQuestion> {
  questions: TQuestion[];
  totalMarks: number;
  targetMarks: number;
  tierSummary: TierMarksSummary[];
}

// simple helper
function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Build topic → tier map from any trend list that has topicKey + tier
function buildTopicTierMapFromList(
  list: Array<{ topicKey: string; tier?: TopicTier | string }>
): Record<string, TopicTier> {
  const map: Record<string, TopicTier> = {};
  list.forEach((entry) => {
    const raw = entry.tier as TopicTier | undefined;
    const tier: TopicTier = raw ?? ("good-to-do" as TopicTier);
    map[entry.topicKey] = tier;
  });
  return map;
}

/**
 * Core greedy builder used for both Maths and Science.
 * 1. Fill Must-Crack
 * 2. Then High-ROI
 * 3. Then Good-to-Do
 * allowing mild overshoot of up to +2 marks.
 */
function buildMockPaperFromBank<
  T extends { topicKey: string; marks: number }
>(
  questionBank: T[],
  topicTierMap: Record<string, TopicTier>,
  targetMarks: number
): BuiltMockPaper<T> {
  const tierOrder: TopicTier[] = ["must-crack", "high-roi", "good-to-do"];
  const questionsByTier: Record<TopicTier, T[]> = {
    "must-crack": [],
    "high-roi": [],
    "good-to-do": [],
  };

  questionBank.forEach((q) => {
    const tier = topicTierMap[q.topicKey] ?? ("good-to-do" as TopicTier);
    questionsByTier[tier].push(q);
  });

  let totalMarks = 0;
  const picked: T[] = [];
  const tierMarks: Record<TopicTier, TierMarksSummary> = {
    "must-crack": { tier: "must-crack", marks: 0, questionCount: 0 },
    "high-roi": { tier: "high-roi", marks: 0, questionCount: 0 },
    "good-to-do": { tier: "good-to-do", marks: 0, questionCount: 0 },
  };

  tierOrder.forEach((tier) => {
    if (totalMarks >= targetMarks) return;

    const shuffled = shuffle(questionsByTier[tier]);

    for (const q of shuffled) {
      const m = q.marks ?? 0;
      const willOvershoot = totalMarks + m > targetMarks;
      const overshoot = totalMarks + m - targetMarks;

      // Allow small overshoot (+2) so paper feels realistic
      if (willOvershoot && overshoot > 2) continue;

      picked.push(q);
      totalMarks += m;
      tierMarks[tier].marks += m;
      tierMarks[tier].questionCount += 1;

      if (totalMarks >= targetMarks) break;
    }
  });

  return {
    questions: picked,
    totalMarks,
    targetMarks,
    tierSummary: tierOrder.map((t) => tierMarks[t]),
  };
}

/**
 * ✅ Maths mock builder (existing behaviour)
 * Uses Maths trends + Maths prediction bank.
 */
export function buildMockPaperMaths(
  targetMarks: number = 80
): BuiltMockPaper<PredictedQuestion> {
  const topicTierMap = buildTopicTierMapFromList(class10TopicTrendList);
  return buildMockPaperFromBank<PredictedQuestion>(
    predictedQuestions,
    topicTierMap,
    targetMarks
  );
}

/**
 * ✅ Science mock builder
 * Uses Science trends + Science prediction bank.
 * (Trend list should have topicKey + tier similar to Maths.)
 */
export function buildMockPaperScience(
  targetMarks: number = 80
): BuiltMockPaper<PredictedScienceQuestion> {
  const topicTierMap = buildTopicTierMapFromList(
    class10ScienceTopicTrendList ?? []
  );
  return buildMockPaperFromBank<PredictedScienceQuestion>(
    predictedQuestionsScience,
    topicTierMap,
    targetMarks
  );
}

/**
 * Backwards-compatible export:
 * buildMockPaper() without subject still means "Maths".
 */
export function buildMockPaper(
  targetMarks: number = 80
): BuiltMockPaper<PredictedQuestion> {
  return buildMockPaperMaths(targetMarks);
}
