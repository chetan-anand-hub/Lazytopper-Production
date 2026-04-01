// src/utils/topicMix.ts
import { class10MathTopicWeights } from "../data/class10MathTopicWeights";

export interface TopicQuestionQuota {
  name: string;
  count: number;
  weightagePercent: number;
}

/**
 * Given total questions you want in a quiz,
 * returns how many questions to pull from each topic
 * in proportion to exam weightage.
 */
export function getClass10MathQuestionMix(
  totalQuestions: number
): TopicQuestionQuota[] {
  const mix: TopicQuestionQuota[] = [];

  let allocated = 0;

  class10MathTopicWeights.forEach((topic, index) => {
    // proportional allocation
    const rawCount = (topic.weightagePercent / 100) * totalQuestions;

    // for all except last topic, round normally
    let count =
      index === class10MathTopicWeights.length - 1
        ? totalQuestions - allocated
        : Math.round(rawCount);

    if (count < 0) count = 0;

    mix.push({
      name: topic.name,
      count,
      weightagePercent: topic.weightagePercent,
    });

    allocated += count;
  });

  return mix.filter((q) => q.count > 0);
}
