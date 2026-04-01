import type { PracticeAttempt, DifficultyLevel, LTSubject } from "./practiceInsights";

export interface TopicPerformance {
  topicKey: string;
  topicName?: string;
  subject: LTSubject;
  correct: number;
  total: number;
  accuracy: number;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface TopicImprovement {
  topicKey: string;
  topicName?: string;
  firstHalfAccuracy: number;
  secondHalfAccuracy: number;
  delta: number;
}

export interface WeeklyWrappedSummary {
  startDate: string;
  endDate: string;
  totalAttempts: number;
  totalCorrect: number;
  accuracy: number;
  difficultyCounts: Record<DifficultyLevel, number>;
  bloomCounts: Record<string, number>;
  topics: TopicPerformance[];
  strongTopics: string[];
  weakTopics: string[];
  activeDays: number;
  estimatedStudyMinutes: number;
  powerHourLabel: string;
  consistencyPercentile: number;
  topicsConquered: number;
  dailyCounts: DailyCount[];
  topicImprovements: TopicImprovement[];
  biggestWinTopic: TopicImprovement | null;
}

function estimateAttemptMinutes(level: DifficultyLevel): number {
  if (level === "Hard") return 6;
  if (level === "Medium") return 4;
  return 2;
}

function toDateKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function formatPowerHour(hour: number): string {
  const start = ((hour % 24) + 24) % 24;
  const end = (start + 1) % 24;
  const fmt = (value: number) => {
    const suffix = value >= 12 ? "PM" : "AM";
    const hr = value % 12 === 0 ? 12 : value % 12;
    return `${hr} ${suffix}`;
  };
  return `${fmt(start)} - ${fmt(end)}`;
}

function estimateConsistencyPercentile(activeDays: number, attempts: number): number {
  const dayScore = Math.min(1, activeDays / 7);
  const volumeScore = Math.min(1, attempts / 40);
  const composite = 0.7 * dayScore + 0.3 * volumeScore;
  return Math.max(1, Math.min(99, Math.round(composite * 100)));
}

export function generateWeeklyWrapped(
  attempts: PracticeAttempt[],
  interval: {
    start: number;
    end: number;
  }
): WeeklyWrappedSummary {
  const { start, end } = interval;
  const startDate = new Date(start).toISOString();
  const endDate = new Date(end).toISOString();

  const difficultyCounts: Record<DifficultyLevel, number> = {
    Easy: 0,
    Medium: 0,
    Hard: 0,
  };
  const bloomCounts: Record<string, number> = {};
  const topicStats: Record<string, TopicPerformance> = {};
  const hourCounts: Record<number, number> = {};
  const activeDateSet = new Set<string>();

  let totalCorrect = 0;
  let estimatedStudyMinutes = 0;
  let totalAttempts = 0;

  for (const attempt of attempts) {
    if (attempt.timestamp < start || attempt.timestamp >= end) continue;
    totalAttempts += 1;

    difficultyCounts[attempt.difficulty] =
      (difficultyCounts[attempt.difficulty] || 0) + 1;
    estimatedStudyMinutes += estimateAttemptMinutes(attempt.difficulty);

    const hour = new Date(attempt.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    activeDateSet.add(toDateKey(attempt.timestamp));

    if (attempt.bloomSkill) {
      const key = attempt.bloomSkill.trim().toLowerCase();
      bloomCounts[key] = (bloomCounts[key] || 0) + 1;
    }

    const tKey = attempt.topicKey;
    if (!topicStats[tKey]) {
      topicStats[tKey] = {
        topicKey: tKey,
        topicName: attempt.topicName,
        subject: attempt.subject,
        correct: 0,
        total: 0,
        accuracy: 0,
      };
    }
    const stats = topicStats[tKey];
    stats.total += 1;
    if (attempt.correct) {
      stats.correct += 1;
      totalCorrect += 1;
    }
  }

  const topics: TopicPerformance[] = Object.values(topicStats).map((tp) => {
    const accuracy = tp.total > 0 ? tp.correct / tp.total : 0;
    return { ...tp, accuracy };
  });
  topics.sort((a, b) => b.total - a.total);

  const strongTopics = topics
    .filter((t) => t.total >= 3 && t.accuracy >= 0.8)
    .map((t) => t.topicKey);
  const weakTopics = topics
    .filter((t) => t.total >= 3 && t.accuracy <= 0.5)
    .map((t) => t.topicKey);

  const activeDays = activeDateSet.size;
  const accuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;
  const topicsConquered = topics.filter((t) => t.total >= 3 && t.accuracy >= 0.75).length;
  const consistencyPercentile = estimateConsistencyPercentile(activeDays, totalAttempts);

  const powerHour = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: Number(hour), count }))
    .sort((a, b) => b.count - a.count)[0];
  const powerHourLabel = powerHour ? formatPowerHour(powerHour.hour) : "No peak hour yet";

  const dailyCountMap: Record<string, number> = {};
  for (let d = start; d < end; d += 86400000) {
    dailyCountMap[toDateKey(d)] = 0;
  }
  for (const attempt of attempts) {
    if (attempt.timestamp >= start && attempt.timestamp < end) {
      const dk = toDateKey(attempt.timestamp);
      dailyCountMap[dk] = (dailyCountMap[dk] || 0) + 1;
    }
  }
  const dailyCounts: DailyCount[] = Object.entries(dailyCountMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const midpoint = start + (end - start) / 2;
  const topicFirstHalf: Record<string, { correct: number; total: number }> = {};
  const topicSecondHalf: Record<string, { correct: number; total: number }> = {};
  for (const attempt of attempts) {
    if (attempt.timestamp < start || attempt.timestamp >= end) continue;
    const bucket = attempt.timestamp < midpoint ? topicFirstHalf : topicSecondHalf;
    if (!bucket[attempt.topicKey]) bucket[attempt.topicKey] = { correct: 0, total: 0 };
    bucket[attempt.topicKey].total += 1;
    if (attempt.correct) bucket[attempt.topicKey].correct += 1;
  }
  const topicImprovements: TopicImprovement[] = [];
  for (const tp of topics) {
    const first = topicFirstHalf[tp.topicKey];
    const second = topicSecondHalf[tp.topicKey];
    if (!first || !second || first.total === 0 || second.total === 0) continue;
    const firstAcc = first.correct / first.total;
    const secondAcc = second.correct / second.total;
    topicImprovements.push({
      topicKey: tp.topicKey,
      topicName: tp.topicName,
      firstHalfAccuracy: firstAcc,
      secondHalfAccuracy: secondAcc,
      delta: secondAcc - firstAcc,
    });
  }
  topicImprovements.sort((a, b) => b.delta - a.delta);
  const biggestWinTopic = topicImprovements.length > 0 && topicImprovements[0].delta > 0
    ? topicImprovements[0]
    : null;

  return {
    startDate,
    endDate,
    totalAttempts,
    totalCorrect,
    accuracy,
    difficultyCounts,
    bloomCounts,
    topics,
    strongTopics,
    weakTopics,
    activeDays,
    estimatedStudyMinutes,
    powerHourLabel,
    consistencyPercentile,
    topicsConquered,
    dailyCounts,
    topicImprovements,
    biggestWinTopic,
  };
}
