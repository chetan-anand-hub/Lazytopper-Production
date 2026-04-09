import { daysLeftFromIsoDate, fetchCbseExamDate } from "./cbseExamDate";

export type PaceProfileType = "marathon" | "sprint" | "crash";

export interface PaceProfileConfig {
  type: PaceProfileType;
  label: string;
  tagline: string;
  thresholdDays: { min: number; max: number };
  chapterCoverage: "all" | "must-crack-first" | "predicted-only";
  missionMix: { learn: number; practice: number; revision: number; exam: number };
  mockFrequency: "weekly" | "biweekly" | "daily";
  conceptVsPractice: number;
}

const PROFILE_CONFIGS: Record<PaceProfileType, PaceProfileConfig> = {
  marathon: {
    type: "marathon",
    label: "Steady Plan",
    tagline: "Deep learning across all chapters",
    thresholdDays: { min: 180, max: 9999 },
    chapterCoverage: "all",
    missionMix: { learn: 0.4, practice: 0.3, revision: 0.2, exam: 0.1 },
    mockFrequency: "weekly",
    conceptVsPractice: 0.6,
  },
  sprint: {
    type: "sprint",
    label: "Focused Plan",
    tagline: "Must-crack chapters first, more practice",
    thresholdDays: { min: 60, max: 179 },
    chapterCoverage: "must-crack-first",
    missionMix: { learn: 0.2, practice: 0.4, revision: 0.2, exam: 0.2 },
    mockFrequency: "biweekly",
    conceptVsPractice: 0.4,
  },
  crash: {
    type: "crash",
    label: "Focus Plan",
    tagline: "Predicted questions + mock tests dominant",
    thresholdDays: { min: 0, max: 59 },
    chapterCoverage: "predicted-only",
    missionMix: { learn: 0, practice: 0.3, revision: 0.3, exam: 0.4 },
    mockFrequency: "daily",
    conceptVsPractice: 0.1,
  },
};

export function getProfileConfig(type: PaceProfileType): PaceProfileConfig {
  return PROFILE_CONFIGS[type];
}

export function getAllProfileConfigs(): PaceProfileConfig[] {
  return [PROFILE_CONFIGS.marathon, PROFILE_CONFIGS.sprint, PROFILE_CONFIGS.crash];
}

export function detectProfileFromDays(daysLeft: number): PaceProfileType {
  if (daysLeft >= 180) return "marathon";
  if (daysLeft >= 60) return "sprint";
  return "crash";
}

export function getProfileSummary(type: PaceProfileType, daysLeft: number): string {
  const config = PROFILE_CONFIGS[type];
  const months = Math.round(daysLeft / 30);
  switch (type) {
    case "marathon":
      return `You have ${months} months — plenty of time! We'll cover every chapter deeply with weekly mock tests starting month 3.`;
    case "sprint":
      return `You have ${months} months — great timing! Must-crack chapters first, bi-weekly mocks, extra practice.`;
    case "crash":
      return `You have ${daysLeft} days — let's make them count! Focused practice on predicted questions + daily mocks.`;
  }
  return config.tagline;
}

const STORAGE_KEY = "lazytopper.paceProfile.v1";
const TRANSITION_KEY = "lazytopper.paceProfile.transition.v1";

export interface StoredPaceProfile {
  type: PaceProfileType;
  isManualOverride: boolean;
  detectedType: PaceProfileType;
  daysLeft: number;
  lastChecked: string;
}

export interface PaceTransitionNotification {
  from: PaceProfileType;
  to: PaceProfileType;
  daysLeft: number;
  timestamp: number;
  dismissed: boolean;
}

export function loadPaceProfile(): StoredPaceProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredPaceProfile;
  } catch { return null; }
}

export function savePaceProfile(profile: StoredPaceProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {}
}

export function setManualOverride(type: PaceProfileType): StoredPaceProfile {
  const existing = loadPaceProfile();
  const profile: StoredPaceProfile = {
    type,
    isManualOverride: true,
    detectedType: existing?.detectedType || type,
    daysLeft: existing?.daysLeft || 90,
    lastChecked: new Date().toISOString(),
  };
  savePaceProfile(profile);
  return profile;
}

export function clearManualOverride(): StoredPaceProfile | null {
  const existing = loadPaceProfile();
  if (!existing) return null;
  const profile: StoredPaceProfile = {
    ...existing,
    type: existing.detectedType,
    isManualOverride: false,
    lastChecked: new Date().toISOString(),
  };
  savePaceProfile(profile);
  return profile;
}

export function checkAndUpdateProfile(daysLeft: number): {
  profile: StoredPaceProfile;
  transition: PaceTransitionNotification | null;
} {
  const detected = detectProfileFromDays(daysLeft);
  const existing = loadPaceProfile();

  if (!existing) {
    const profile: StoredPaceProfile = {
      type: detected,
      isManualOverride: false,
      detectedType: detected,
      daysLeft,
      lastChecked: new Date().toISOString(),
    };
    savePaceProfile(profile);
    return { profile, transition: null };
  }

  const updated: StoredPaceProfile = {
    ...existing,
    detectedType: detected,
    daysLeft,
    lastChecked: new Date().toISOString(),
  };

  if (!existing.isManualOverride && existing.type !== detected) {
    updated.type = detected;
    const notification: PaceTransitionNotification = {
      from: existing.type,
      to: detected,
      daysLeft,
      timestamp: Date.now(),
      dismissed: false,
    };
    savePaceProfile(updated);
    saveTransitionNotification(notification);
    return { profile: updated, transition: notification };
  }

  savePaceProfile(updated);
  return { profile: updated, transition: null };
}

export function saveTransitionNotification(notification: PaceTransitionNotification): void {
  try {
    localStorage.setItem(TRANSITION_KEY, JSON.stringify(notification));
  } catch {}
}

export function loadTransitionNotification(): PaceTransitionNotification | null {
  try {
    const raw = localStorage.getItem(TRANSITION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PaceTransitionNotification;
  } catch { return null; }
}

export function dismissTransitionNotification(): void {
  const n = loadTransitionNotification();
  if (n) {
    n.dismissed = true;
    saveTransitionNotification(n);
  }
}

export function getActivePaceProfile(): PaceProfileType {
  const stored = loadPaceProfile();
  return stored?.type || "sprint";
}

export async function initPaceProfileFromExamDate(studentClass: "10" | "12" = "10"): Promise<{
  profile: StoredPaceProfile;
  transition: PaceTransitionNotification | null;
  daysLeft: number;
}> {
  const dateResult = await fetchCbseExamDate(studentClass);
  const daysLeft = Math.max(1, daysLeftFromIsoDate(dateResult.examDate));
  const result = checkAndUpdateProfile(daysLeft);
  return { ...result, daysLeft };
}
