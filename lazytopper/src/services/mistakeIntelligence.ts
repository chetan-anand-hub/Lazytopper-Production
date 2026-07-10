// src/services/mistakeIntelligence.ts
//
// MI Consolidation — Phase 1 + Phase 2 (single ingestion front door).
//
// `recordMistake` is the ONE entry point every grading surface routes through
// (Quick Practice `SolutionChecker`, mobile `CheckImprove`, desktop
// `DesktopCheckImprovePage`). It owns three things so the policy can never
// drift between surfaces again:
//
//   1. POLICY  — log only for a signed-in, non-local user whose graded answer
//                actually lost marks OR carries any per-step mistakeType.
//                (This deletes the old `mistakeCount > 0` guard that silently
//                dropped Quick-Practice mistakes — see the diagnostic report.)
//   2. BUILDER — one consolidated `MistakeLogEntry` builder: `marksLost` from
//                the score, `stepDetails` from `annotatedSteps`, `mistakeCounts`
//                from the reconciled summary (client mirrors the server's
//                additive-floor reconcile so it is correct before AND after the
//                backend redeploys).
//   3. DEDUP   — no double-log / double-count. Covers the cache-restore path
//                (a previously-cached result restored on mount is logged at most
//                once across the whole device).
//
// Phase 2 bridge: a graded KNOWLEDGE-GAP mistake (conceptual + calculation only)
// ALSO writes ONE `WrongAnswerEntry` (Stream 3, adaptivePracticeEngine) so the
// topic surfaces in weak-areas through the EXISTING bounded input
// (`Math.min(wrongData.count*5, 30)` in weakAreaAggregator) — no ranking/weight
// change. Silly + presentation do NOT bridge; they are surfaced separately as a
// "careless mark-loss" insight on the Me page (see mistakeInsightsService).

import type { CheckSolutionResponse } from "../ai/aiClient";
import type { AuthUser } from "../context/AuthContext";
import { logMistakes, type MistakeLogEntry } from "./mistakeLogService";
import { isSafeEntry } from "./mistakeInsightsService";
import { recordWrongAnswer } from "./adaptivePracticeEngine";
import { resolveCanonicalSlug } from "../data/syllabus/canonicalTopicSlug";

export interface RecordMistakeContext {
  subject: string;
  /** Human-readable topic label — stored verbatim on the log entry (preserves
   *  Me hotspot grouping). */
  topic: string;
  /** Optional canonical/slug topic key for the weak-area bridge; falls back to
   *  `topic` when absent. */
  topicKey?: string;
  question: string;
  /** Stable question id when the surface has one (Quick Practice / HPQ /
   *  TopicHub). Free-typed Check & Improve has none. */
  questionId?: string;
  /** Optional difficulty for the bridged wrong-answer signal. */
  difficulty?: string;
}

export type RecordMistakeOutcome =
  | "logged" // newly persisted
  | "duplicate" // already persisted (dedup) — UI should treat as saved
  | "skipped-no-user" // signed out
  | "skipped-local" // local/browse session — never persists fabricated history
  | "skipped-clean" // full marks and no step mistakeType — nothing to log
  | "error";

export interface RecordMistakeResult {
  outcome: RecordMistakeOutcome;
  /** Whether a weak-area (Stream 3) signal was written for this check. */
  bridged: boolean;
}

interface ReconciledCounts {
  conceptual: number;
  calculation: number;
  silly: number;
  presentation: number;
}

const DEDUP_STORAGE_KEY = "lazytopper.mi.dedup.v1";
const DEDUP_MAX = 400;
const MISTAKE_TYPES = ["conceptual", "calculation", "silly", "presentation"] as const;

/** Stable, dependency-free string hash for the no-questionId dedup signature. */
function hashString(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

/**
 * Additive-floor reconcile (client mirror of checkSolution.cjs): for each
 * category, take the MAX of the LLM's self-reported summary and the count of
 * `annotatedSteps` carrying that mistakeType. Never subtracts or reclassifies.
 * Makes the breakdown correct even if the backend has not yet redeployed.
 */
function reconcileCounts(result: CheckSolutionResponse): ReconciledCounts {
  const summary = result.mistakeSummary ?? {
    conceptual: 0,
    calculation: 0,
    silly: 0,
    presentation: 0,
  };
  const stepCounts: ReconciledCounts = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  for (const step of result.annotatedSteps ?? []) {
    const t = step?.mistakeType;
    if (t && (MISTAKE_TYPES as readonly string[]).includes(t)) {
      stepCounts[t as keyof ReconciledCounts] += 1;
    }
  }
  return {
    conceptual: Math.max(Number(summary.conceptual) || 0, stepCounts.conceptual),
    calculation: Math.max(Number(summary.calculation) || 0, stepCounts.calculation),
    silly: Math.max(Number(summary.silly) || 0, stepCounts.silly),
    presentation: Math.max(Number(summary.presentation) || 0, stepCounts.presentation),
  };
}

/** Did this graded answer actually contain a mistake worth logging? */
function hasMistakeSignal(result: CheckSolutionResponse): boolean {
  const lostMarks = (Number(result.totalMarks) || 0) - (Number(result.marksAwarded) || 0) > 0;
  const typedStep = (result.annotatedSteps ?? []).some((s) => !!s?.mistakeType);
  return lostMarks || typedStep;
}

function buildEntry(
  ctx: RecordMistakeContext,
  result: CheckSolutionResponse,
  counts: ReconciledCounts,
): Omit<MistakeLogEntry, "id"> {
  const marksLost = Math.max(0, (Number(result.totalMarks) || 0) - (Number(result.marksAwarded) || 0));
  const stepDetails = (result.annotatedSteps ?? [])
    .filter((s) => s.mistakeType && s.marksDeducted > 0)
    .map((s) => ({
      stepNumber: s.stepNumber,
      mistakeType: String(s.mistakeType),
      marksDeducted: s.marksDeducted,
    }));
  return {
    timestamp: new Date().toISOString(),
    questionText: ctx.question,
    topic: ctx.topic,
    subject: ctx.subject,
    totalMarks: Number(result.totalMarks) || 0,
    marksLost,
    mistakeCounts: {
      conceptual: counts.conceptual,
      calculation: counts.calculation,
      silly: counts.silly,
      presentation: counts.presentation,
    },
    stepDetails,
  };
}

function readDedup(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DEDUP_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writeDedup(keys: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEDUP_STORAGE_KEY, JSON.stringify(keys.slice(0, DEDUP_MAX)));
  } catch {
    /* quota / SSR — dedup is best-effort, never blocks logging */
  }
}

/**
 * Dedup signature for a graded check. Identifies "this question's graded result
 * for this user". Includes the score + reconciled counts so a genuine re-check
 * with a DIFFERENT outcome logs again, while a cache-restore of the SAME result
 * (identical score + counts) is deduped.
 */
function dedupKey(
  uid: string,
  ctx: RecordMistakeContext,
  result: CheckSolutionResponse,
  counts: ReconciledCounts,
): string {
  const qid =
    ctx.questionId && ctx.questionId.trim()
      ? ctx.questionId.trim()
      : `t:${hashString(ctx.question || "")}`;
  return [
    uid,
    qid,
    `${Number(result.marksAwarded) || 0}/${Number(result.totalMarks) || 0}`,
    `${counts.conceptual}-${counts.calculation}-${counts.silly}-${counts.presentation}`,
  ].join("::");
}

/**
 * The single mistake-ingestion front door. Idempotent per (user, question,
 * outcome). Returns the outcome so each surface can drive its own status label.
 */
export async function recordMistake(
  user: AuthUser | null | undefined,
  gradeResult: CheckSolutionResponse | null | undefined,
  context: RecordMistakeContext,
): Promise<RecordMistakeResult> {
  // ── Policy ────────────────────────────────────────────────────────────
  if (!user?.uid) return { outcome: "skipped-no-user", bridged: false };
  if (user.isLocalSession) return { outcome: "skipped-local", bridged: false };
  if (!gradeResult || gradeResult.ok === false) return { outcome: "error", bridged: false };
  if (!hasMistakeSignal(gradeResult)) return { outcome: "skipped-clean", bridged: false };

  const counts = reconcileCounts(gradeResult);

  // ── Dedup ─────────────────────────────────────────────────────────────
  const key = dedupKey(user.uid, context, gradeResult, counts);
  const seen = readDedup();
  if (seen.includes(key)) return { outcome: "duplicate", bridged: false };

  // ── Builder + safety gate ─────────────────────────────────────────────
  const entry = buildEntry(context, gradeResult, counts);
  if (!isSafeEntry({ id: "pending", ...entry })) {
    return { outcome: "error", bridged: false };
  }

  // ── Stream 1 — mistake log ────────────────────────────────────────────
  try {
    await logMistakes(user.uid, entry);
  } catch {
    return { outcome: "error", bridged: false };
  }
  // Mark seen only AFTER a successful log, so a transient failure can retry.
  writeDedup([key, ...seen.filter((k) => k !== key)]);

  // ── Phase 2 — bridge knowledge-gap mistakes to weak-areas (Stream 3) ──
  // Conceptual + calculation only. ONE signal per graded check per topic
  // (not one per mistake) — the bridge runs once here, never in a loop.
  let bridged = false;
  const isKnowledgeGap =
    counts.conceptual > 0 ||
    counts.calculation > 0 ||
    (gradeResult.annotatedSteps ?? []).some(
      (s) => s.mistakeType === "conceptual" || s.mistakeType === "calculation",
    );
  if (isKnowledgeGap) {
    const topicKey =
      resolveCanonicalSlug(context.topicKey ?? context.topic) ||
      String(context.topicKey ?? context.topic ?? "");
    if (topicKey) {
      // When the surface has a real questionId, key the concept on it (mirrors
      // how practice does `conceptKey || questionId`, so distinct questions on a
      // topic are distinct concept nodes). Free-typed checks have no questionId,
      // so fall back to the TOPIC as the concept identifier.
      const hasQid = !!(context.questionId && context.questionId.trim());
      const questionId = hasQid ? context.questionId!.trim() : `graded:${topicKey}`;
      const conceptKey = hasQid ? "" : topicKey;
      try {
        recordWrongAnswer(questionId, topicKey, conceptKey, context.difficulty || "Medium");
        bridged = true;
      } catch {
        bridged = false;
      }
    }
  }

  return { outcome: "logged", bridged };
}

/** UI helper: collapse an outcome into the saved/clean/local/error buckets the
 *  evidence-state labels use. Exported so every surface maps consistently. */
export function isSavedOutcome(outcome: RecordMistakeOutcome): boolean {
  return outcome === "logged" || outcome === "duplicate";
}
