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
  adaptiveMix?: Partial<Record<DifficultyLevel, number>>;
  priorityConceptKeys?: string[];
  // K2H-8f: when true, restrict the candidate pool to PYQ-tagged questions.
  // Must run at the engine layer because the UI-layer PracticeQuestion mapping
  // strips pyqYear/isPYQ before downstream filters can see them.
  pyqOnly?: boolean;
  // Fix B: when true, enforce the 50% competency-based floor via the swap
  // loop below. Opt-in (default false) — only timed mock tests should require
  // this share; quick practice should honour the student's filter selection
  // without silently substituting competency questions.
  enforceCompetencyFloor?: boolean;
  /** Bank ids this student has already ATTEMPTED on this topic. When supplied, the
   *  take prefers UNSEEN questions (falling back to seen only to avoid a short set),
   *  so repeat sessions walk DOWN the predictionScore-sorted list instead of returning
   *  the same head forever — see takeFromBucket. OPTIONAL and default-off: omit it and
   *  the draw is byte-identical to before (the gate for the shared Daily Mission /
   *  Topic Hub callers). Quick Practice is the only surface that passes it today. */
  seenQuestionIds?: ReadonlySet<string>;
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

// K2H-8f: engine-layer PYQ matcher. Exported for unit-testing.
// Honours both the explicit `isPYQ` flag (used by P4 PYQ extraction once it
// lands) and the populated `pyqYear` field (current bank tagging convention,
// e.g. "2022", "2023", "30/1/1"). Either form qualifies as PYQ — accepting
// both avoids the format-mismatch failure described in K2H-8f Cause A.
export function isPYQQuestion(q: unknown): boolean {
  if (!q || typeof q !== "object") return false;
  const cast = q as { isPYQ?: unknown; pyqYear?: unknown };
  if (cast.isPYQ === true) return true;
  const year = cast.pyqYear;
  if (typeof year === "string" && year.trim().length > 0) return true;
  if (typeof year === "number" && Number.isFinite(year)) return true;
  return false;
}

export function applyBoardPatternFilter<T extends { section?: any; marks?: any; blueprintSlotId?: any }>(
  candidates: T[],
  pattern: BoardPattern
): T[] {
  return (candidates || []).filter((q) => inferBoardPatternFromQuestion(q) === pattern);
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

/**
 * Head-take `targetCount` items from a bucket the caller has already ordered.
 *
 * ── UNSEEN-FIRST (`seenQuestionIds`, 2026-07-15) ────────────────────────────
 * The bucket arrives sorted by predictionScore and this walks it from the HEAD — so with
 * no seen-set the SAME top-N came back every session and the rest of the topic was
 * unreachable (trigonometry: 10 of 419, forever, on the default path).
 *
 * Given a seen-set this runs TWO passes: unseen first, then seen only if the set would
 * otherwise come up short. That is what lets the window WALK DOWN the sorted list across
 * sessions instead of sitting frozen on its head.
 *
 * ★ WHY THIS DOES NOT BETRAY predictionScore ORDER — do NOT "fix" it back to a plain
 * head-take. predictionScore ordering means "meet the most exam-likely questions FIRST".
 * Re-showing a question the student has ALREADY ATTEMPTED serves that intent ZERO. This
 * preserves the intent exactly: highest predictionScore UNSEEN first. The student still
 * meets the most probable questions first; they just stop meeting the same ten forever.
 * Recombination only matters once unseen is exhausted — that is what pass 2 is for.
 *
 * `seenQuestionIds` is OPTIONAL and DEFAULT-OFF: omit it and the body is byte-identical
 * to the original single-pass head-take. That is the gate protecting the SHARED callers
 * of generatePracticeSet (Daily Mission ×4, Topic Hub ×2) — none of which passes it, and
 * none of which has a test pinning its set size, shares or mix.
 */
function takeFromBucket<T>(
  bucket: T[],
  targetCount: number,
  alreadyTaken: Set<string>,
  getId: (item: T) => string,
  takenTexts?: Set<string>,
  seenQuestionIds?: ReadonlySet<string>
): T[] {
  const result: T[] = [];
  const texts = takenTexts ?? new Set<string>();
  // ONE pass (legacy path, byte-identical) when no seen-set; otherwise unseen, then seen.
  const passes: Array<ReadonlySet<string> | undefined> =
    seenQuestionIds && seenQuestionIds.size > 0 ? [seenQuestionIds, undefined] : [undefined];
  for (const skipSet of passes) {
    for (const item of bucket) {
      const id = getId(item);
      if (alreadyTaken.has(id)) continue;
      if (skipSet && skipSet.has(id)) continue; // pass 1 only: unseen first
      const qText = String((item as any).questionText ?? (item as any).text ?? "").trim().toLowerCase().slice(0, 120);
      if (qText && texts.has(qText)) continue;
      result.push(item);
      alreadyTaken.add(id);
      if (qText) texts.add(qText);
      if (result.length >= targetCount) break;
    }
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

  // K2H-8f: PYQ-only filter at the engine layer.
  // Hard filter (no soft fallback): if the caller asks for PYQs only and the
  // pool has none, return an empty set so the UI shows an honest empty state
  // per CLAUDE.md product doctrine, rather than silently substituting non-PYQ
  // questions.
  if (cfg.pyqOnly) {
    candidates = candidates.filter(isPYQQuestion);
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

  if (cfg.priorityConceptKeys && cfg.priorityConceptKeys.length > 0) {
    const prioritySet = new Set(cfg.priorityConceptKeys.map((k) => k.toLowerCase()));
    const priority: CanonicalQuestion[] = [];
    const rest: CanonicalQuestion[] = [];
    for (const q of candidates) {
      const concept = String(
        (q as any).subtopic ?? (q as any).conceptKey ?? (q as any).subtopicKey ?? ""
      ).toLowerCase();
      if (concept && prioritySet.has(concept)) {
        priority.push(q);
      } else {
        rest.push(q);
      }
    }
    candidates = [...priority, ...rest];
  }

  // Group by difficulty.
  const buckets = groupByDifficulty(candidates);
  const hasHard = buckets.Hard.length > 0;
  const rawMix = cfg.adaptiveMix && !cfg.difficultyMix ? cfg.adaptiveMix : cfg.difficultyMix;
  const difficultyMix = normaliseDifficultyMix(rawMix, hasHard);

  // Compute target counts per difficulty.
  const targetEasy = Math.round(totalQuestions * difficultyMix.Easy);
  const targetMedium = Math.round(totalQuestions * difficultyMix.Medium);
  const targetHard = totalQuestions - targetEasy - targetMedium; // remainder to Hard

  const takenIds = new Set<string>();
  const takenTexts = new Set<string>();
  const selected: CanonicalQuestion[] = [];

  const easyPicked = takeFromBucket(
    buckets.Easy,
    targetEasy,
    takenIds,
    (q) => q.id,
    takenTexts,
    cfg.seenQuestionIds
  );
  selected.push(...easyPicked);

  const mediumPicked = takeFromBucket(
    buckets.Medium,
    targetMedium,
    takenIds,
    (q) => q.id,
    takenTexts,
    cfg.seenQuestionIds
  );
  selected.push(...mediumPicked);

  const hardPicked = targetHard > 0
    ? takeFromBucket(buckets.Hard, targetHard, takenIds, (q) => q.id, takenTexts, cfg.seenQuestionIds)
    : [];
  selected.push(...hardPicked);

  const isSingleDifficultyFilter =
    (difficultyMix.Easy === 1 && difficultyMix.Medium === 0 && difficultyMix.Hard === 0) ||
    (difficultyMix.Easy === 0 && difficultyMix.Medium === 1 && difficultyMix.Hard === 0) ||
    (difficultyMix.Easy === 0 && difficultyMix.Medium === 0 && difficultyMix.Hard === 1);

  if (selected.length < totalQuestions && !isSingleDifficultyFilter) {
    const remainingNeeded = totalQuestions - selected.length;
    // The whole-pool top-up — NOT a difficulty bucket. Easy to miss; it needs the
    // seen-set too, or an exhausted-bucket set would refill with already-seen questions.
    const topUp = takeFromBucket(
      candidates,
      remainingNeeded,
      takenIds,
      (q) => q.id,
      takenTexts,
      cfg.seenQuestionIds
    );
    selected.push(...topUp);
  }

  // Fix B: only enforce the 50% competency floor when explicitly opted in
  // (timed mock tests). Quick practice paths inherit the default (false)
  // and honour the student's filter selection without silent swaps.
  if (cfg.enforceCompetencyFloor) {
    const COMPETENCY_MIN_SHARE = 0.5;
    const compCount = selected.filter(q => q.isCompetencyBased).length;
    const compTarget = Math.ceil(selected.length * COMPETENCY_MIN_SHARE);

    // K2H-8f: when pyqOnly is on, the candidate pool is already PYQ-only, so
    // any competency swap is naturally PYQ-preserving. Skip the swap when the
    // PYQ pool yields no competency-based PYQs (common case) so we do not
    // churn the selection or break the PYQ contract.
    if (compCount < compTarget && !isSingleDifficultyFilter) {
      const compCandidates = candidates.filter(
        q => q.isCompetencyBased && !takenIds.has(q.id)
      );
      for (const cq of compCandidates) {
        if (selected.filter(q => q.isCompetencyBased).length >= compTarget) break;
        const swapIdx = selected.findIndex(q => !q.isCompetencyBased);
        if (swapIdx < 0) break;
        takenIds.delete(selected[swapIdx].id);
        selected[swapIdx] = cq;
        takenIds.add(cq.id);
      }
    }
  }

  const isAdaptiveMode = !!(cfg.adaptiveMix && !cfg.difficultyMix);
  let finalQuestions: CanonicalQuestion[];
  if (isAdaptiveMode) {
    const diffOrder: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };
    finalQuestions = [...selected].sort((a, b) => {
      const aLevel = String((a as any).canonicalDifficulty ?? (a as any).difficulty ?? "Medium");
      const bLevel = String((b as any).canonicalDifficulty ?? (b as any).difficulty ?? "Medium");
      const aKey = aLevel.charAt(0).toUpperCase() + aLevel.slice(1).toLowerCase();
      const bKey = bLevel.charAt(0).toUpperCase() + bLevel.slice(1).toLowerCase();
      return (diffOrder[aKey] ?? 1) - (diffOrder[bKey] ?? 1);
    });
  } else {
    finalQuestions = shuffle ? shuffleArray(selected) : selected;
  }

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
