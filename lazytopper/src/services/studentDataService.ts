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

export const SCHEMA_VERSION = 2;
const SCHEMA_KEY = "lazytopper.schema_version";

const STUDENT_DATA_KEYS: readonly string[] = [
  "lazytopper.mastery.records",
  "lazytopper.newly_mastered",
  "lazytopper.pace.profile",
  "lazytopper.pace.transition",
  "lazytopper.focus.daily",
  "lazytopper.focus.enabled",
  "lazytopper.streak",
  "lazytopper.streakWasReset",
  "lazytopper.profile",
  "lazytopper.profile.v2",
  "lazytopper.lastSubjectContext",
  "lazytopper.dailyGoal",
  "lazytopper.lastPlanDeepLink",
  "lazytopper.firstVisitOverlayShown",
  "lazytopper.studySessions",
  "lazytopper.xp",
  "lazytopper.hideCountdown",
  "lazytopper.studyHoursThisWeek",
  "vibeMode",
] as const;

const STUDENT_DATA_PREFIX_PATTERNS: readonly string[] = [
  "lazytopper.progress.",
  "lazytopper.sr.",
  "lazytopper.practiceInsights.",
  "lazytopper.topicHub.",
  "lazytopper.guidedJourney.",
  "lazytopper.learningPath.",
  "lazytopper.dailyMission.",
  "lazytopper.dailyMissionXpAwarded.",
  "lazytopper.mockScoreHistory.",
  "lazytopper.dailyPractice.",
  "lazytopper.subscription.",
  "lazytopper.wrongAnswerLog.",
  "lazytopper.hintVariant.",
  "lazytopper.strategy.",
  "lazytopper.parentPin.",
  "lazytopper.cloud.",
  "lazytopper.adaptivePractice.",
] as const;

type MigrationFn = (stored: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Record<number, MigrationFn> = {
  1: (data) => {
    if (data["lazytopper.profile"] && !data["lazytopper.profile.v2"]) {
      data["lazytopper.profile.v2"] = data["lazytopper.profile"];
    }
    return data;
  },
};

export interface SRStatsSnapshot {
  total: number;
  newCount: number;
  learning: number;
  review: number;
  mastered: number;
  dueToday: number;
}

export interface StudentSnapshot {
  schemaVersion: number;
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

function getStoredSchemaVersion(): number {
  try {
    const raw = localStorage.getItem(SCHEMA_KEY);
    if (!raw) return 0;
    const v = Number(raw);
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

function setStoredSchemaVersion(v: number): void {
  try {
    localStorage.setItem(SCHEMA_KEY, String(v));
  } catch {}
}

function collectAllStudentKeys(): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (STUDENT_DATA_KEYS.includes(k)) {
        keys.push(k);
        continue;
      }
      for (const prefix of STUDENT_DATA_PREFIX_PATTERNS) {
        if (k.startsWith(prefix)) {
          keys.push(k);
          break;
        }
      }
    }
  } catch {}
  return keys;
}

function runMigrations(): void {
  const stored = getStoredSchemaVersion();
  if (stored >= SCHEMA_VERSION) return;

  const allKeys = collectAllStudentKeys();
  const data: Record<string, unknown> = {};
  for (const k of allKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw !== null) data[k] = raw;
    } catch {}
  }

  let current = stored;
  while (current < SCHEMA_VERSION) {
    current++;
    const migrationFn = MIGRATIONS[current];
    if (migrationFn) {
      const migrated = migrationFn(data);
      for (const [k, v] of Object.entries(migrated)) {
        if (v !== data[k]) {
          try {
            localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
          } catch {}
        }
      }
      Object.assign(data, migrated);
    }
  }

  setStoredSchemaVersion(SCHEMA_VERSION);
}

export function getData(_uid?: string): StudentSnapshot {
  runMigrations();
  return buildSnapshot();
}

export const getStudentSnapshot = getData;

function buildSnapshot(): StudentSnapshot {
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
    schemaVersion: SCHEMA_VERSION,
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

export function saveData(_uid?: string, data?: Partial<StudentSnapshot>): void {
  if (!data) return;
  if (data.pace?.profile) {
    savePaceProfile(data.pace.profile);
  }
  setStoredSchemaVersion(SCHEMA_VERSION);
}

export function resetData(_uid?: string): void {
  clearManualOverride();
  const allKeys = collectAllStudentKeys();
  for (const k of allKeys) {
    try {
      localStorage.removeItem(k);
    } catch {}
  }
  try {
    localStorage.removeItem(SCHEMA_KEY);
  } catch {}
}

export const resetStudentData = resetData;

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
