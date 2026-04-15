export type MasteryLevel =
  | "not_started"
  | "attempted"
  | "familiar"
  | "proficient"
  | "mastered";

export const MASTERY_LEVELS: MasteryLevel[] = [
  "not_started",
  "attempted",
  "familiar",
  "proficient",
  "mastered",
];

export const MASTERY_POINTS: Record<MasteryLevel, number> = {
  not_started: 0,
  attempted: 0,
  familiar: 50,
  proficient: 80,
  mastered: 100,
};

export const MASTERY_LABELS: Record<MasteryLevel, string> = {
  not_started: "Not Started",
  attempted: "Just Starting",
  familiar: "Getting Better",
  proficient: "Strong",
  mastered: "Nailed It",
};

export const MASTERY_COLORS: Record<MasteryLevel, string> = {
  not_started: "var(--text-muted)",
  attempted: "#94a3b8",
  familiar: "#3b82f6",
  proficient: "#22c55e",
  mastered: "#f59e0b",
};

export const MASTERY_ICONS: Record<MasteryLevel, string> = {
  not_started: "○",
  attempted: "◔",
  familiar: "◑",
  proficient: "◕",
  mastered: "●",
};

export const MASTERY_RING_FRACTION: Record<MasteryLevel, number> = {
  not_started: 0,
  attempted: 0.25,
  familiar: 0.5,
  proficient: 0.75,
  mastered: 1,
};

function levelIndex(level: MasteryLevel): number {
  return MASTERY_LEVELS.indexOf(level);
}

function clampLevel(idx: number): MasteryLevel {
  if (idx < 0) return "not_started";
  if (idx >= MASTERY_LEVELS.length) return "mastered";
  return MASTERY_LEVELS[idx];
}

export interface QuizResult {
  totalQuestions: number;
  correctAnswers: number;
  mcqCount: number;
  mcqCorrect: number;
  nonMcqCount: number;
  nonMcqCorrect: number;
}

export function computeWeightedAccuracy(result: QuizResult): number {
  if (result.totalQuestions <= 0) return 0;
  const mcqWeight = 0.75;
  const weightedCorrect =
    result.mcqCorrect * mcqWeight + result.nonMcqCorrect * 1.0;
  const weightedMax =
    result.mcqCount * mcqWeight + result.nonMcqCount * 1.0;
  if (weightedMax <= 0) return 0;
  return Math.round((weightedCorrect / weightedMax) * 100);
}

export function computeSimpleAccuracy(result: QuizResult): number {
  if (result.totalQuestions <= 0) return 0;
  return Math.round((result.correctAnswers / result.totalQuestions) * 100);
}

export function promoteMastery(
  current: MasteryLevel,
  accuracy: number,
  isChapterTest: boolean
): MasteryLevel {
  if (accuracy >= 100 && isChapterTest && current === "proficient") {
    return "mastered";
  }
  if (accuracy >= 100) {
    const next = Math.max(levelIndex(current), levelIndex("proficient"));
    return clampLevel(next);
  }
  if (accuracy >= 70) {
    const next = Math.max(levelIndex(current), levelIndex("familiar"));
    return clampLevel(next);
  }
  return current;
}

export function demoteMastery(
  current: MasteryLevel,
  accuracy: number
): MasteryLevel {
  if (accuracy >= 70) return current;
  const drop = levelIndex(current) - 2;
  return clampLevel(Math.max(drop, levelIndex("attempted")));
}

export function updateMasteryLevel(
  current: MasteryLevel,
  result: QuizResult,
  isChapterTest: boolean = false
): MasteryLevel {
  if (result.totalQuestions <= 0) return current;
  const accuracy = computeWeightedAccuracy(result);

  if (current === "not_started") {
    return promoteMastery("attempted", accuracy, isChapterTest);
  }

  const demoted = demoteMastery(current, accuracy);
  if (levelIndex(demoted) < levelIndex(current)) {
    return demoted;
  }

  return promoteMastery(current, accuracy, isChapterTest);
}

const NEWLY_MASTERED_KEY = "lazytopper.newly_mastered";

export function markNewlyMastered(chapterKey: string): void {
  try {
    const raw = localStorage.getItem(NEWLY_MASTERED_KEY);
    const set: string[] = raw ? JSON.parse(raw) : [];
    if (!set.includes(chapterKey)) {
      set.push(chapterKey);
      localStorage.setItem(NEWLY_MASTERED_KEY, JSON.stringify(set));
    }
  } catch {}
}

export function isNewlyMastered(chapterKey: string): boolean {
  try {
    const raw = localStorage.getItem(NEWLY_MASTERED_KEY);
    if (!raw) return false;
    const set: string[] = JSON.parse(raw);
    return set.includes(chapterKey);
  } catch {
    return false;
  }
}

export function clearNewlyMastered(chapterKey: string): void {
  try {
    const raw = localStorage.getItem(NEWLY_MASTERED_KEY);
    if (!raw) return;
    const set: string[] = JSON.parse(raw);
    const filtered = set.filter(k => k !== chapterKey);
    localStorage.setItem(NEWLY_MASTERED_KEY, JSON.stringify(filtered));
  } catch {}
}

export function masteryFromLegacyPercent(percent: number): MasteryLevel {
  if (percent <= 0) return "not_started";
  if (percent < 70) return "attempted";
  if (percent < 100) return "familiar";
  return "proficient";
}

export function masteryFromStats(
  attempted: number,
  correct: number,
  mcqAttempted: number = 0,
  mcqCorrect: number = 0
): MasteryLevel {
  if (attempted <= 0) return "not_started";
  if (attempted < 2) return "attempted";

  const nonMcq = attempted - mcqAttempted;
  const nonMcqCorrect = correct - mcqCorrect;

  const result: QuizResult = {
    totalQuestions: attempted,
    correctAnswers: correct,
    mcqCount: mcqAttempted,
    mcqCorrect,
    nonMcqCount: Math.max(0, nonMcq),
    nonMcqCorrect: Math.max(0, nonMcqCorrect),
  };

  const accuracy = computeWeightedAccuracy(result);
  if (accuracy >= 90 && attempted >= 10) return "proficient";
  if (accuracy >= 70) return "familiar";
  if (accuracy >= 40) return "attempted";
  return "attempted";
}

export interface ChapterMasteryRecord {
  level: MasteryLevel;
  points: number;
  totalAttempted: number;
  totalCorrect: number;
  lastAccuracy: number;
  chapterTestPassed: boolean;
  updatedAt: string;
}

const STORAGE_KEY = "lazytopper.chapterMastery.v1";

function nowIso(): string {
  return new Date().toISOString();
}

function getStoreData(): Record<string, ChapterMasteryRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ChapterMasteryRecord>;
  } catch {
    return {};
  }
}

function saveStoreData(data: Record<string, ChapterMasteryRecord>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function getChapterMasteryRecord(
  chapterKey: string
): ChapterMasteryRecord | null {
  const data = getStoreData();
  return data[chapterKey] || null;
}

export function getChapterMasteryLevel(chapterKey: string): MasteryLevel {
  const rec = getChapterMasteryRecord(chapterKey);
  return rec?.level || "not_started";
}

export function recordQuizResult(
  chapterKey: string,
  result: QuizResult,
  isChapterTest: boolean = false
): ChapterMasteryRecord {
  const data = getStoreData();
  const prev = data[chapterKey];
  const currentLevel = prev?.level || "not_started";

  const newLevel = updateMasteryLevel(currentLevel, result, isChapterTest);
  const accuracy = computeWeightedAccuracy(result);

  const record: ChapterMasteryRecord = {
    level: newLevel,
    points: MASTERY_POINTS[newLevel],
    totalAttempted: (prev?.totalAttempted || 0) + result.totalQuestions,
    totalCorrect: (prev?.totalCorrect || 0) + result.correctAnswers,
    lastAccuracy: accuracy,
    chapterTestPassed:
      prev?.chapterTestPassed || (isChapterTest && accuracy >= 70),
    updatedAt: nowIso(),
  };

  data[chapterKey] = record;
  saveStoreData(data);
  return record;
}

export function getAllChapterMasteryRecords(): Record<
  string,
  ChapterMasteryRecord
> {
  return getStoreData();
}
