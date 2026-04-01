// src/utils/mockBlueprint.ts
import {
  class10MathTopicTrends,
  type DifficultyKey,
} from "../data/class10MathTopicTrends";

export interface QuestionSpec {
  questionNumber: number;
  topic: string;
  subtopic: string;
  difficulty: DifficultyKey;
}

/**
 * Helper: allocate integer counts from percentages
 * in a way that sums exactly to `total`.
 */
function allocateByPercent<T extends string>(
  total: number,
  items: { key: T; percent: number }[]
): Record<T, number> {
  if (total <= 0 || items.length === 0) {
    return items.reduce((acc, { key }) => {
      acc[key] = 0;
      return acc;
    }, {} as Record<T, number>);
  }

  const raw = items.map((item) => (item.percent / 100) * total);
  const base = raw.map((v) => Math.floor(v));
  let used = base.reduce((a, b) => a + b, 0);
  let remainder = total - used;

  const fracs = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  let idx = 0;
  while (remainder > 0 && idx < fracs.length) {
    base[fracs[idx].i]++;
    remainder--;
    idx++;
  }

  const result: Record<T, number> = {} as Record<T, number>;
  items.forEach((item, i) => {
    result[item.key] = base[i];
  });

  return result;
}

// ---- Types to help TS understand the topic metadata ----
type TopicMeta = {
  weightagePercent: number;
  conceptWeightage: Record<string, number>;
};

/**
 * Build a mock blueprint for Class 10 Maths.
 *
 * - Distributes questions across chapters by `weightagePercent`.
 * - Inside each chapter, distributes across subtopics by `conceptWeightage`.
 * - Assigns difficulties according to the global difficulty mix.
 * - If `difficultyFilter` is provided, returns only questions of that level.
 */
export function buildClass10MathMockBlueprint(
  totalQuestions: number,
  difficultyFilter?: DifficultyKey
): QuestionSpec[] {
  // Cast so we can safely index with string keys
  const topicsData = class10MathTopicTrends
    .topics as Record<string, TopicMeta>;

  // 1) Allocate questions across topics
  const topicDefs = Object.entries(topicsData).map(([name, meta]) => ({
    key: name, // string
    percent: meta.weightagePercent,
  }));

  const topicCounts = allocateByPercent(totalQuestions, topicDefs);

  // 2) Build the raw list (topic + subtopic only)
  const questions: QuestionSpec[] = [];
  let qNo = 1;

  topicDefs.forEach(({ key }) => {
    const meta = topicsData[key];
    const countForTopic = topicCounts[key] ?? 0;
    if (!meta || countForTopic <= 0) return;

    // Explicitly tell TS these values are numbers
    const conceptEntries = Object.entries(
      meta.conceptWeightage
    ) as [string, number][];

    const conceptDefs: { key: string; percent: number }[] =
      conceptEntries.map(([cName, share]) => ({
        key: cName,
        percent: share,
      }));

    const conceptCounts = allocateByPercent(
      countForTopic,
      conceptDefs
    );

    conceptDefs.forEach(({ key: conceptName }) => {
      const countForConcept = conceptCounts[conceptName] ?? 0;
      for (let i = 0; i < countForConcept; i++) {
        questions.push({
          questionNumber: qNo++,
          topic: key,
          subtopic: conceptName,
          // filled properly in difficulty pass below
          difficulty: "Medium",
        });
      }
    });
  });

  if (questions.length === 0) {
    return [];
  }

  // 3) Assign difficulties according to global mix
  const diffInfo = class10MathTopicTrends.difficultyDistributionPercent;
  const diffDefs: { key: DifficultyKey; percent: number }[] = [
    { key: "Easy", percent: diffInfo.Easy },
    { key: "Medium", percent: diffInfo.Medium },
    { key: "Hard", percent: diffInfo.Hard },
  ];

  const diffCounts = allocateByPercent(questions.length, diffDefs);

  const difficultyList: DifficultyKey[] = [];
  diffDefs.forEach(({ key }) => {
    const count = diffCounts[key] ?? 0;
    for (let i = 0; i < count; i++) {
      difficultyList.push(key);
    }
  });

  // Ensure we have at least as many difficulty labels as questions
  while (difficultyList.length < questions.length) {
    difficultyList.push("Medium");
  }

  questions.forEach((q, index) => {
    q.difficulty = difficultyList[index];
  });

  // 4) Optional filter by difficulty
  if (difficultyFilter) {
    return questions.filter((q) => q.difficulty === difficultyFilter);
  }

  return questions;
}
