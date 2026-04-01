// src/utils/buildStudyPlan.ts
import { class10MathTopicTrends } from "../data/class10MathTopicTrends";
import { class10ScienceTopicTrends } from "../data/class10ScienceTopicTrends";

export type TierKey = "must-crack" | "high-roi" | "good-to-do";
export type SubjectKey = "Maths" | "Science";

export interface SubjectPlanRow {
  topicKey: string;      // canonical id for URLs / queries
  topicName: string;     // nice display name
  tier: TierKey;
  weightagePercent: number;
  hours: number;         // recommended hours
}

// Extra weight for must-crack vs high-ROI vs good-to-do
const tierMultiplier: Record<TierKey, number> = {
  "must-crack": 1.3,
  "high-roi": 1.0,
  "good-to-do": 0.6,
};

const tierOrder: TierKey[] = ["must-crack", "high-roi", "good-to-do"];

function tierRank(tier: TierKey): number {
  return tierOrder.indexOf(tier);
}

export function buildSubjectPlan(
  subject: SubjectKey,
  hoursBudget: number
): SubjectPlanRow[] {
  if (hoursBudget <= 0 || !Number.isFinite(hoursBudget)) {
    return [];
  }

  if (subject === "Maths") {
    const topics = class10MathTopicTrends.topics as Record<
      string,
      { tier?: TierKey; weightagePercent?: number }
    >;

    const entries = Object.entries(topics).map(([name, meta]) => {
      const tier: TierKey = meta.tier ?? "good-to-do";
      const wt = meta.weightagePercent ?? 0;
      const effWeight = wt * tierMultiplier[tier];
      return {
        topicKey: name,        // keys are already nice chapter names
        topicName: name,
        tier,
        weightagePercent: wt,
        effWeight,
      };
    });

    const totalEff = entries.reduce((s, e) => s + e.effWeight, 0) || 1;

    return entries
      .map((e) => ({
        topicKey: e.topicKey,
        topicName: e.topicName,
        tier: e.tier,
        weightagePercent: e.weightagePercent,
        hours: Number(((e.effWeight / totalEff) * hoursBudget).toFixed(1)),
      }))
      .sort((a, b) => {
        const byTier = tierRank(a.tier) - tierRank(b.tier);
        if (byTier !== 0) return byTier;
        return b.weightagePercent - a.weightagePercent;
      });
  }

  // Science
  const sciTopics = class10ScienceTopicTrends.topics;

  const sciEntries = Object.values(sciTopics).map((topic) => {
    const tier = topic.tier as TierKey;
    const wt = topic.weightagePercent ?? 0;
    const effWeight = wt * tierMultiplier[tier];
    return {
      topicKey: topic.topicKey,   // e.g. "LifeProcesses"
      topicName: topic.topicName, // e.g. "Life Processes"
      tier,
      weightagePercent: wt,
      effWeight,
    };
  });

  const totalEffSci = sciEntries.reduce((s, e) => s + e.effWeight, 0) || 1;

  return sciEntries
    .map((e) => ({
      topicKey: e.topicKey,
      topicName: e.topicName,
      tier: e.tier,
      weightagePercent: e.weightagePercent,
      hours: Number(((e.effWeight / totalEffSci) * hoursBudget).toFixed(1)),
    }))
    .sort((a, b) => {
      const byTier = tierRank(a.tier) - tierRank(b.tier);
      if (byTier !== 0) return byTier;
      return b.weightagePercent - a.weightagePercent;
    });
}
