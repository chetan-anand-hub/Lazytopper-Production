// src/services/planStorage.ts
//
// Thin wrapper around StrategyPlan localStorage + streak helpers.
// We keep this module name because existing pages import from it.

// Import the v2 StrategyPlan type from our strategy engine.  The latest
// engine exports `StrategyPlan` rather than the deprecated `StrategyPlanV1`.
// Keeping our wrapper thin means we simply re-export helpers for saving
// and loading the plan without imposing any additional shape on the data.
import type { StrategyPlan } from "./strategyEngine";
import {
  loadStrategyPlanV1 as _loadStrategyPlan,
  saveStrategyPlanV1 as _saveStrategyPlan,
} from "./strategyStorage";
import { getActiveProgressUser, saveLearnerProgressSegment } from "./studentProgressStore";

function streakDateKey(): string {
  return `lazytopper.streak.date:${getActiveProgressUser() || "anonymous"}`;
}

function streakCountKey(): string {
  return `lazytopper.streak.count:${getActiveProgressUser() || "anonymous"}`;
}

/** Save the structured strategy plan to localStorage. */
export function saveStrategyPlan(plan: StrategyPlan): void {
  // Delegate to the underlying storage helper.  We alias the V1 save
  // function here for backwards compatibility; the function signature
  // accepts our new StrategyPlan type which is structurally
  // compatible with the v1 interface (both expose a `dailyMix`).
  _saveStrategyPlan(plan);
}

/** Load the structured strategy plan from localStorage. */
export function getStrategyPlan(): StrategyPlan | null {
  return _loadStrategyPlan();
}

/** Derive a small “daily mix” list from the plan. */
export function computeDailyMix(plan: StrategyPlan): string[] {
  const mix = plan?.dailyMix;
  if (!mix) return [];
  const topic = mix.topicLabel || "Today’s focus";
  const mins = typeof mix.minutes === "number" ? mix.minutes : undefined;
  const line1 = mins ? `${topic} • ~${mins} min` : `${topic}`;
  // lightweight 3-step scaffold that works even without extra metadata
  return [
    line1,
    "Practice: 10–15 questions (HPQs or mixed practice)",
    "Revision: quick notes + 5 min recap",
  ];
}

/**
 * Updates and returns the user's streak count.
 * Streak increases when user visits on consecutive calendar days.
 */
export function updateAndGetStreak(): number {
  try {
    const dateKey = streakDateKey();
    const countKey = streakCountKey();
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const prevDateStr = localStorage.getItem(dateKey);
    const prevCountStr = localStorage.getItem(countKey);

    if (!prevDateStr || !prevCountStr) {
      localStorage.setItem(dateKey, todayStr);
      localStorage.setItem(countKey, "1");
      const uid = getActiveProgressUser();
      if (uid) void saveLearnerProgressSegment(uid, "streak", 1);
      return 1;
    }

    if (prevDateStr === todayStr) {
      return Number(prevCountStr) || 1;
    }

    const prevDate = new Date(prevDateStr + "T00:00:00");
    const diffDays = Math.round(
      (today.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let next = 1;
    if (diffDays === 1) next = (Number(prevCountStr) || 0) + 1;

    localStorage.setItem(dateKey, todayStr);
    localStorage.setItem(countKey, String(next));
    const uid = getActiveProgressUser();
    if (uid) void saveLearnerProgressSegment(uid, "streak", next);
    return next;
  } catch {
    return 0;
  }
}
