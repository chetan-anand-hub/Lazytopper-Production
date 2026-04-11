import type { MasteryLevel, ChapterMasteryRecord } from "./masteryLevelService";
import {
  getChapterMasteryLevel,
  getAllChapterMasteryRecords,
  recordQuizResult,
  clearNewlyMastered,
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

export interface StudentSnapshot {
  mastery: {
    records: ChapterMasteryRecord[];
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
    schedule: SRSchedule | null;
    dueCount: number;
    stats: { total: number; newCount: number; learningCount: number; reviewCount: number; masteredCount: number };
  };
}

function computeOverallMastery(records: ChapterMasteryRecord[]): MasteryLevel {
  if (records.length === 0) return "not_started";
  const levels: MasteryLevel[] = ["not_started", "attempted", "familiar", "proficient", "mastered"];
  const scores = records.map((r) => levels.indexOf(r.level));
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return levels[Math.round(avg)] ?? "familiar";
}

export async function getStudentSnapshot(userId: string): Promise<StudentSnapshot> {
  const [masteryRecords, paceProfile, srSchedule, studyLogs] = await Promise.all([
    Promise.resolve(getAllChapterMasteryRecords()),
    loadPaceProfile(),
    loadSRSchedule(userId),
    getStudyLogs(userId).catch(() => [] as StudySessionLog[]),
  ]);

  const activeType = getActivePaceProfile();
  const appFocus = getAppFocus();
  const todayFocus = getTodayFocus();
  const weeklyFocus = getWeeklyFocus();

  const dueReviews = srSchedule ? getDueReviews(srSchedule) : [];
  const srStats = srSchedule ? getSRStats(srSchedule) : { total: 0, newCount: 0, learningCount: 0, reviewCount: 0, masteredCount: 0 };

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

export async function resetStudentData(): Promise<void> {
  clearNewlyMastered();
  clearManualOverride();

  try {
    localStorage.removeItem("lazytopper.mastery.records");
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
