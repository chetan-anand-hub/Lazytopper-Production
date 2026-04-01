// src/services/weeklyWrapService.ts
//
// Aggregates study session logs into weekly summary statistics. This
// service can be used to generate data for the "Weekly Wrapped"
// feature on the LazyTopper dashboard. It computes total study time,
// number of sessions, distribution of activities, topics studied,
// streak information and more. The implementation relies on the
// session logger and thus should be updated in sync with any
// changes to the logging format.

import type { StudySessionLog, StudySessionActivity } from './sessionLogger';

/** Summary statistics for the weekly wrap. */
export interface WeeklyWrapStats {
  /** Total study time in minutes across all sessions. */
  totalMinutes: number;
  /** Number of distinct study sessions. */
  sessionsCount: number;
  /** Count of activities by type. */
  activityCounts: Record<string, number>;
  /** Map of topicKey to number of activities (practice or dailyMix) on that topic. */
  topicsStudied: Record<string, number>;
  /** Current streak in days (consecutive days with at least one session). */
  currentStreak: number;
  /** Longest streak observed in the last 7 days. */
  maxStreak: number;

  /**
   * (Optional) Raw list of activities from sessions in the week. This
   * can be used by higher‑level features (e.g. Pro Tips) to analyse
   * question accuracy, time spent per activity or content preferences.
   */
  rawActivities?: StudySessionActivity[];
}

/**
 * Compute the duration of a session in minutes using ISO date strings.
 * If endTime is missing, uses the current time.
 */
function computeSessionDuration(startTime: string, endTime?: string): number {
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : Date.now();
  return Math.max(0, Math.round((end - start) / 60000));
}

/**
 * Determine streak information from a list of session dates. Assumes
 * dates are ISO strings. Returns the current streak and the maximum
 * streak within the observed period.
 */
function computeStreaks(dates: string[]): { current: number; max: number } {
  // Convert to midnight timestamps for comparison.
  const days = dates.map((d) => {
    const dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    return dt.getTime();
  });
  // Deduplicate and sort ascending.
  const uniqueDays = Array.from(new Set(days)).sort((a, b) => a - b);
  let currentStreak = 0;
  let maxStreak = 0;
  let prevDay: number | null = null;
  for (const day of uniqueDays) {
    if (prevDay !== null && day - prevDay === 86400000) {
      currentStreak++;
    } else {
      currentStreak = 1;
    }
    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
    }
    prevDay = day;
  }
  // Determine the current streak by counting backwards from the most
  // recent day until gaps appear.
  let current = 0;
  let lastDay: number | null = null;
  for (let i = uniqueDays.length - 1; i >= 0; i--) {
    const day = uniqueDays[i];
    if (lastDay === null) {
      current = 1;
    } else if (lastDay - day === 86400000) {
      current++;
    } else {
      break;
    }
    lastDay = day;
  }
  return { current: current, max: maxStreak };
}

/**
 * Aggregate study logs into weekly wrap stats. Only sessions whose
 * startTime falls within the last 7 days (inclusive) are considered.
 *
 * @param logs All study session logs recorded.
 * @param referenceDate Optional date to treat as "today" for testing.
 */
export function generateWeeklyWrap(
  logs: StudySessionLog[],
  referenceDate: Date = new Date()
): WeeklyWrapStats {
  const endTimestamp = referenceDate.getTime();
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const weekStart = endTimestamp - oneWeekMs;
  let totalMinutes = 0;
  let sessionsCount = 0;
  const activityCounts: Record<string, number> = {};
  const topicsStudied: Record<string, number> = {};
  const sessionDays: string[] = [];
  const rawActivities: StudySessionActivity[] = [];
  for (const log of logs) {
    const sessionStart = new Date(log.startTime).getTime();
    if (sessionStart < weekStart) continue;
    sessionsCount++;
    totalMinutes += computeSessionDuration(log.startTime, log.endTime);
    sessionDays.push(log.startTime);
    for (const act of log.activities) {
      activityCounts[act.type] = (activityCounts[act.type] || 0) + 1;
      if (act.topicKey) {
        topicsStudied[act.topicKey] = (topicsStudied[act.topicKey] || 0) + 1;
      }
      rawActivities.push(act);
    }
  }
  const { current, max } = computeStreaks(sessionDays);
  return {
    totalMinutes,
    sessionsCount,
    activityCounts,
    topicsStudied,
    currentStreak: current,
    maxStreak: max,
    rawActivities: rawActivities,
  };
}