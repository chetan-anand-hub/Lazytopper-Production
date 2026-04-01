// src/data/practiceSetGenerator.ts
// Phase 0 – Practice set generator built on top of PredictionCore.
//
// GOAL (Step 1):
// - Given subject + topicKey (+ optional conceptKey),
//   generate a 10/15 question practice set from canonicalQuestionBank.
// - Use predictionScore ordering so that higher-probability questions
//   are preferred, but still respect difficulty mix where possible.
//
// This file is DATA-ONLY / ENGINE-ONLY. It does NOT touch any UI components.
// Later, PracticePage / Mentor can call `generatePracticeSet` with the
// appropriate config.

import { PredictionCore } from "./predictionCore";
import { suggestDifficulty } from "../prediction/difficultyAutoSuggest";
import type {
  CanonicalQuestion,
  DifficultyLevel,
  LTSubjectKey,
} from "./predictionTypes";

export type BoardPattern = "A" | "B" | "C" | "D" | "E";


export interface PracticeSetConfig {
  subject?: LTSubjectKey;       // e.g. "Maths" | "Science". If omitted, we use all subjects.
  topicKey: string;             // e.g. "Trigonometry", "SCI-MNM", "ChemicalReactions"
  conceptKey?: string;          // optional: narrower concept/subtopic key
  totalQuestions?: number;      // default: 10
  // Target difficulty mix as fractions. Values do not have to sum to 1;
  // we normalise internally. If omitted, we fall back to a sensible default.
  difficultyMix?: Partial<Record<DifficultyLevel, number>>;
  boardPattern?: BoardPattern;   // optional: Board pattern A–E (derived from section/marks)
  shuffle?: boolean;            // default: true
}

export interface ResolvedPracticeSetConfig {
  subject?: LTSubjectKey;
  topicKey: string;
  conceptKey?: string;
  totalQuestions: number;
  difficultyMix: Record<DifficultyLevel, number>;
  boardPattern?: BoardPattern;
  shuffle: boolean;
}

export interface PracticeSet {
  config: ResolvedPracticeSetConfig;
  questions: CanonicalQuestion[];
}

// ---------------------------
// Utility helpers
// ---------------------------



// --- Board-pattern helpers (A–E) ---
// Many question sources include `section` (A–E). Some may only have `marks` or `blueprintSlotId`.
// We infer a best-effort board pattern to support deep-links like ?section=B on PracticePage.
export function normalizeBoardPattern(v: unknown): BoardPattern | undefined {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "A" || s === "B" || s === "C" || s === "D" || s === "E") return s as BoardPattern;
  return undefined;
}

export function inferBoardPatternFromQuestion(q: any): BoardPattern | undefined {
  if (!q) return undefined;

  const sec = String(q.section ?? "").trim().toUpperCase();
  if (sec === "A" || sec === "B" || sec === "C" || sec === "D" || sec === "E") return sec as BoardPattern;

  const slot = String(q.blueprintSlotId ?? "").trim().toUpperCase();
  const first = slot ? slot[0] : "";
  if (first === "A" || first === "B" || first === "C" || first === "D" || first === "E") return first as BoardPattern;

  const marks = typeof q.marks === "number" ? q.marks : parseInt(String(q.marks ?? ""), 10);
  if (!Number.isFinite(marks)) return undefined;

  // Mapping used in TopicHub/CBSE patterns:
  // A=1m, B=2m, C=3m, D=5m, E=4m (case-based)
  if (marks === 1) return "A";
  if (marks === 2) return "B";
  if (marks === 3) return "C";
  if (marks === 5) return "D";
  if (marks === 4) return "E";

  return undefined;
}

export function applyBoardPatternFilter<T extends { section?: any; marks?: any; blueprintSlotId?: any }>(
  candidates: T[],
  pattern: BoardPattern
): T[] {
  return (candidates || []).filter((q) => inferBoardPatternFromQuestion(q) === pattern);
}
function normaliseDifficultyMix(
  raw: Partial<Record<DifficultyLevel, number>> | undefined,
  hasHard: boolean
): Record<DifficultyLevel, number> {
  // Defaults depend on whether there are any Hard questions available.
  let base: Record<DifficultyLevel, number>;
  if (hasHard) {
    base = { Easy: 0.4, Medium: 0.4, Hard: 0.2 };
  } else {
    base = { Easy: 0.5, Medium: 0.5, Hard: 0 };
  }

  const merged: Record<DifficultyLevel, number> = {
    Easy: raw?.Easy ?? base.Easy,
    Medium: raw?.Medium ?? base.Medium,
    Hard: raw?.Hard ?? base.Hard,
  };

  const sum = merged.Easy + merged.Medium + merged.Hard;
  if (sum <= 0) {
    return base;
  }

  return {
    Easy: merged.Easy / sum,
    Medium: merged.Medium / sum,
    Hard: merged.Hard / sum,
  };
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function groupByDifficulty(
  questions: CanonicalQuestion[]
): Record<DifficultyLevel, CanonicalQuestion[]> {
  const buckets: Record<DifficultyLevel, CanonicalQuestion[]> = {
    Easy: [],
    Medium: [],
    Hard: [],
  };

  for (const q of questions) {
    // Use policy-driven difficulty as the primary signal.
    // We still respect the existing difficulty/canonicalDifficulty fields if present
    // for backwards compatibility of any older data, but the v1 policy is the source
    // of truth.
    let level: DifficultyLevel;

    const rawExisting =
      (q as any).canonicalDifficulty ?? (q as any).difficulty ?? null;
    if (rawExisting) {
      const s = String(rawExisting).trim().toLowerCase();
      if (s === "easy" || s === "e") {
        level = "Easy";
      } else if (s === "hard" || s === "h") {
        level = "Hard";
      } else {
        level = "Medium";
      }
    } else {
      // Fall back to policy suggestion.
      // We import suggestDifficulty from ../prediction/difficultyAutoSuggest.
      const suggested = suggestDifficulty(q as any);
      if (suggested === "easy") {
        level = "Easy";
      } else if (suggested === "hard") {
        level = "Hard";
      } else {
        level = "Medium";
      }
    }

    if (level === "Easy") {
      buckets.Easy.push(q);
    } else if (level === "Hard") {
      buckets.Hard.push(q);
    } else {
      buckets.Medium.push(q);
    }
  }

  return buckets;
}

function takeFromBucket<T>(
  bucket: T[],
  targetCount: number,
  alreadyTaken: Set<string>,
  getId: (item: T) => string
): T[] {
  const result: T[] = [];
  for (const item of bucket) {
    const id = getId(item);
    if (alreadyTaken.has(id)) continue;
    result.push(item);
    alreadyTaken.add(id);
    if (result.length >= targetCount) break;
  }
  return result;
}

// ---------------------------
// Core generator
// ---------------------------

export function generatePracticeSet(
  cfg: PracticeSetConfig
): PracticeSet {
  const totalQuestions = cfg.totalQuestions ?? 10;
  const shuffle = cfg.shuffle !== false;

  // Get candidate questions from PredictionCore, already sorted by predictionScore.
  let candidates = PredictionCore.getLikelyQuestionsForConcept(
    cfg.topicKey,
    cfg.conceptKey
  );

  // Filter by subject if requested (case-insensitive, avoids silent wipeouts when bank uses 'Maths' vs 'maths').
  if (cfg.subject) {
    const want = String(cfg.subject).trim().toLowerCase();
    candidates = candidates.filter((q: any) => String(q?.subject ?? "").trim().toLowerCase() === want);
  }

  // Filter by Board pattern A–E if requested (e.g., deep-link ?section=B)
  const boardPattern = normalizeBoardPattern((cfg as any).boardPattern ?? (cfg as any).section ?? (cfg as any).pattern ?? (cfg as any).type);
  if (boardPattern) {
    candidates = applyBoardPatternFilter(candidates, boardPattern);
  }


  // If we somehow have zero questions, just return empty set.
  if (candidates.length === 0) {
    const emptyConfig: ResolvedPracticeSetConfig = {
      subject: cfg.subject,
      topicKey: cfg.topicKey,
      conceptKey: cfg.conceptKey,
      totalQuestions,
      difficultyMix: { Easy: 0, Medium: 0, Hard: 0 },
      shuffle,
    };
    return { config: emptyConfig, questions: [] };
  }

  // Group by difficulty.
  const buckets = groupByDifficulty(candidates);
  const hasHard = buckets.Hard.length > 0;
  const difficultyMix = normaliseDifficultyMix(cfg.difficultyMix, hasHard);

  // Compute target counts per difficulty.
  const targetEasy = Math.round(totalQuestions * difficultyMix.Easy);
  const targetMedium = Math.round(totalQuestions * difficultyMix.Medium);
  const targetHard = totalQuestions - targetEasy - targetMedium; // remainder to Hard

  const takenIds = new Set<string>();
  const selected: CanonicalQuestion[] = [];

  // Always respect predictionScore ordering by using candidates as-is in buckets.
  const easyPicked = takeFromBucket(
    buckets.Easy,
    targetEasy,
    takenIds,
    (q) => q.id
  );
  selected.push(...easyPicked);

  const mediumPicked = takeFromBucket(
    buckets.Medium,
    targetMedium,
    takenIds,
    (q) => q.id
  );
  selected.push(...mediumPicked);

  const hardPicked = targetHard > 0
    ? takeFromBucket(buckets.Hard, targetHard, takenIds, (q) => q.id)
    : [];
  selected.push(...hardPicked);

  // If we still have fewer than totalQuestions (not enough in some buckets),
  // top up from the global candidate list in predictionScore order.
  if (selected.length < totalQuestions) {
    const remainingNeeded = totalQuestions - selected.length;
    const topUp = takeFromBucket(
      candidates,
      remainingNeeded,
      takenIds,
      (q) => q.id
    );
    selected.push(...topUp);
  }

  // Optionally shuffle final set so students don't always see questions
  // in the same order. Order is not important for predictive value.
  const finalQuestions = shuffle ? shuffleArray(selected) : selected;

  const resolvedConfig: ResolvedPracticeSetConfig = {
    subject: cfg.subject,
    topicKey: cfg.topicKey,
    conceptKey: cfg.conceptKey,
    totalQuestions: finalQuestions.length,
    difficultyMix,
    boardPattern,
    shuffle,
  };

  return {
    config: resolvedConfig,
    questions: finalQuestions,
  };
}
