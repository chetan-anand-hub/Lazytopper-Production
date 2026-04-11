import type { MasteryLevel, ChapterMasteryRecord } from "./masteryLevelService";
import {
  getChapterMasteryLevel,
  getAllChapterMasteryRecords,
  recordQuizResult,
} from "./masteryLevelService";

import type { PaceProfileType, StoredPaceProfile } from "./paceProfileService";
import {
  getActivePaceProfile,
  loadPaceProfile,
  savePaceProfile,
  clearManualOverride,
} from "./paceProfileService";

import type { FocusSnapshot, DailyFocusRecord } from "./focusTracker";
import {
  getAppFocus,
  getTodayFocus,
  getWeeklyFocus,
  startTracking as startFocusTracking,
  stopTracking as stopFocusTracking,
} from "./focusTracker";

import type { StudySessionLog, ActivityType } from "./sessionLogger";
import {
  startSession,
  logActivity,
  endSession,
  getStudyLogs,
} from "./sessionLogger";

import type { SRSchedule, SRConceptCard, SRStage } from "./spacedRepetitionEngine";
import {
  loadSRSchedule,
  getDueReviews,
  getSRStats,
  reviewConcept,
} from "./spacedRepetitionEngine";

export interface SRStatsSnapshot {
  total: number;
  newCount: number;
  learning: number;
  review: number;
  mastered: number;
  dueToday: number;
}

export interface StudentSnapshot {
  mastery: {
    records: Record<string, ChapterMasteryRecord>;
    overallLevel: MasteryLevel;
  };
  pace: {
    profile: StoredPaceProfile | null;
    activeType: PaceProfileType;
  };
  focus: {
    app: FocusSnapshot;
    today: DailyFocusRecord | null;
    weeklyRecords: DailyFocusRecord[];
  };
  sessions: {
    logs: StudySessionLog[];
  };
  spacedRepetition: {
    schedule: SRSchedule;
    dueCount: number;
    stats: SRStatsSnapshot;
  };
}

function computeOverallMastery(records: Record<string, ChapterMasteryRecord>): MasteryLevel {
  const entries = Object.values(records);
  if (entries.length === 0) return "not_started";
  const levels: MasteryLevel[] = ["not_started", "attempted", "familiar", "proficient", "mastered"];
  const scores = entries.map((r) => levels.indexOf(r.level));
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return levels[Math.round(avg)] ?? "familiar";
}

export function getStudentSnapshot(): StudentSnapshot {
  const masteryRecords = getAllChapterMasteryRecords();
  const paceProfile = loadPaceProfile();
  const srSchedule = loadSRSchedule();
  const studyLogs = getStudyLogs();

  const activeType = getActivePaceProfile();
  const appFocus = getAppFocus();
  const todayFocus = getTodayFocus();
  const weeklyFocus = getWeeklyFocus();

  const dueReviews = getDueReviews();
  const srStats = getSRStats();

  return {
    mastery: {
      records: masteryRecords,
      overallLevel: computeOverallMastery(masteryRecords),
    },
    pace: {
      profile: paceProfile,
      activeType,
    },
    focus: {
      app: appFocus,
      today: todayFocus,
      weeklyRecords: weeklyFocus,
    },
    sessions: {
      logs: studyLogs,
    },
    spacedRepetition: {
      schedule: srSchedule,
      dueCount: dueReviews.length,
      stats: srStats,
    },
  };
}

export function resetStudentData(): void {
  clearManualOverride();

  try {
    localStorage.removeItem("lazytopper.mastery.records");
  } catch {}
  try {
    localStorage.removeItem("lazytopper.newly_mastered");
  } catch {}
  try {
    localStorage.removeItem("lazytopper.pace.profile");
  } catch {}
  try {
    localStorage.removeItem("lazytopper.focus.daily");
  } catch {}
}

export {
  getChapterMasteryLevel,
  getAllChapterMasteryRecords,
  recordQuizResult,
  getActivePaceProfile,
  loadPaceProfile,
  savePaceProfile,
  getAppFocus,
  getTodayFocus,
  getWeeklyFocus,
  startFocusTracking,
  stopFocusTracking,
  startSession,
  logActivity,
  endSession,
  getStudyLogs,
  loadSRSchedule,
  getDueReviews,
  getSRStats,
  reviewConcept,
};

export type {
  MasteryLevel,
  ChapterMasteryRecord,
  PaceProfileType,
  StoredPaceProfile,
  FocusSnapshot,
  DailyFocusRecord,
  StudySessionLog,
  ActivityType,
  SRSchedule,
  SRConceptCard,
  SRStage,
};
