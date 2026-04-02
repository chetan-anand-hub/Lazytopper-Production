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

export function saveStrategyPlan(plan: StrategyPlan): void {
  _saveStrategyPlan(plan);
}

export function getStrategyPlan(): StrategyPlan | null {
  return _loadStrategyPlan();
}

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
