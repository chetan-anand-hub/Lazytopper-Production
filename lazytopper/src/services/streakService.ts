// src/services/streakService.ts
//
// Implements global streak and badge logic for LazyTopper. Streaks
// encourage students to maintain a daily study habit (No Zero Days).
// Badges are awarded when streak lengths hit certain milestones.
// The logic here follows the specification in the P5 document.

import type { StudySessionLog } from './sessionLogger';

// Definition of a streak badge tier. Each tier unlocks when the
// global streak reaches the specified length. Once unlocked, a badge
// remains in the user’s trophy cabinet even if the streak resets.
interface StreakBadge {
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
  name: string;
  requiredDays: number;
  description: string;
}

// Core streak badges based on consecutive days of study. These map
// directly to the table in the P5 document.
export const STREAK_BADGES: StreakBadge[] = [
  {
    tier: 'Bronze',
    name: '3-Day Spark',
    requiredDays: 3,
    description: '🔥 3-day streak! Tiny sessions, big flex. You just broke the zero-days pattern.',
  },
  {
    tier: 'Silver',
    name: 'No Zero Week',
    requiredDays: 7,
    description: '⚡ 7 days non-stop. One full week of No Zero Days – this is how toppers start.',
  },
  {
    tier: 'Gold',
    name: 'Streak Beast',
    requiredDays: 14,
    description: '💪 14-day streak! You’re more consistent than most students. Your brain has noticed the upgrade.',
  },
  {
    tier: 'Platinum',
    name: 'Board Warrior',
    requiredDays: 30,
    description: '🏆 30 days in a row. This is topper territory. Exams won’t know what hit you.',
  },
  {
    tier: 'Diamond',
    name: 'Consistency Legend',
    requiredDays: 60,
    description: '💎 60 No Zero Days back-to-back. You’re training harder than the paper. Respect.',
  },
];

/**
 * Compute the number of consecutive days with at least one qualifying
 * study session. A qualifying session is any StudySessionLog with
 * duration ≥ 5 minutes or containing at least one activity. This
 * implementation treats any recorded session as qualifying. If you
 * wish to apply stricter criteria (e.g. minimum question count), do so
 * when logging sessions.
 */
export function computeGlobalStreak(logs: StudySessionLog[], referenceDate: Date = new Date()): number {
  // Collect all days that have at least one session.
  const qualifyingDays = new Set<number>();
  for (const log of logs) {
    const start = new Date(log.startTime);
    // Convert to midnight timestamp.
    start.setHours(0, 0, 0, 0);
    qualifyingDays.add(start.getTime());
  }
  // Build a sorted array of unique days.
  const days = Array.from(qualifyingDays).sort((a, b) => a - b);
  // Determine current streak counting backwards from referenceDate.
  let streak = 0;
  let prevDay: number | null = null;
  // Get midnight of referenceDate.
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  // Iterate backwards through sorted days.
  for (let i = days.length - 1; i >= 0; i--) {
    const day = days[i];
    if (prevDay === null) {
      // Starting from the most recent day.
      if (ref.getTime() - day <= 0) {
        streak = 1;
      } else {
        // Most recent session was before today; streak is zero.
        break;
      }
    } else {
      if (prevDay - day === 86400000) {
        streak++;
      } else {
        break;
      }
    }
    prevDay = day;
  }
  return streak;
}

/**
 * Determine which streak badge has been unlocked based on the streak
 * length. Returns the highest badge whose requiredDays ≤ streak.
 */
export function getUnlockedBadge(streakDays: number): StreakBadge | undefined {
  // Iterate in descending order of requiredDays to find the highest tier.
  let unlocked: StreakBadge | undefined;
  for (const badge of STREAK_BADGES) {
    if (streakDays >= badge.requiredDays) {
      unlocked = badge;
    }
  }
  return unlocked;
}

/**
 * Determine the next badge to unlock based on the current streak. If
 * all badges are unlocked (streakDays >= highest threshold) returns
 * undefined.
 */
export function getNextBadge(streakDays: number): StreakBadge | undefined {
  for (const badge of STREAK_BADGES) {
    if (streakDays < badge.requiredDays) {
      return badge;
    }
  }
  return undefined;
}
