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
//                actually LOST MARKS. SCORECARD-MI-1 (owner ruling 5 Oct): a type is
//                never recorded on a question that lost nothing (a right-option MCQ,
//                withdrawn work on a full-mark answer), and a question the student did
//                not attempt is its own state, never an MI entry.
//   2. BUILDER — one consolidated `MistakeLogEntry` builder: `marksLost` from
//                the score, `stepDetails` from `annotatedSteps`, `mistakeCounts`
//                from the reconciled summary (client mirrors the server's
//                additive-floor reconcile so it is correct before AND after the
//                backend redeploys).
//   3. IDENTITY — SCORECARD-MI-1 (D5 / ruling A2). The entry's id is the stable
//                grade identity (uid + surface + submission + question [+ answer],
//                `gradeIdentityKey`), NEVER the score or the counts. A re-grade of the
//                same submission therefore REPLACES its entry (setDoc on the same id);
//                a cache-restore of the identical result writes nothing at all.
//
// Phase 2 bridge: a graded KNOWLEDGE-GAP mistake (owner ruling: conceptual ONLY)
// ALSO writes ONE `WrongAnswerEntry` (Stream 3, adaptivePracticeEngine) so the
// topic surfaces in weak-areas through the EXISTING bounded input
// (`Math.min(wrongData.count*5, 30)` in weakAreaAggregator) — no ranking/weight
// change. Careless (calculation + silly) and exam technique (presentation) do NOT
// bridge (GA-21): a student who knows the topic is never sent back to re-learn it.
// The grouping itself lives in lib/mistakeDisplay.

import type { CheckSolutionResponse } from "../ai/aiClient";
import type { AuthUser } from "../context/AuthContext";
import { logMistakes, removeStableMistakeLog, type MistakeLogEntry } from "./mistakeLogService";
import { isSafeEntry } from "./mistakeInsightsService";
import { recordWrongAnswer } from "./adaptivePracticeEngine";
import { resolveCanonicalSlug } from "../data/syllabus/canonicalTopicSlug";
import { gradeIdentityDocId, gradeIdentityKey } from "./attemptDedupKey";
import {
  effectiveTypeCounts,
  isKnowledgeGapType,
  isQuestionNotAttempted,
  marksLostOn,
  stepShowsType,
  type MistakeTypeCounts,
} from "../lib/mistakeDisplay";
// MI-CONCEPT-1 — concept resolution. Lives in its own module (NOT here) on purpose:
// `mistakeIntelligence` is vi.mock'd as a COMPLETE replacement by several suites
// (worksheetGradeService.test.ts, SolutionChecker.contract/entitlement.test.tsx), so
// an export added here would be missing in every module those suites exercise.
//
// BANK-LEAN-1 (C2) — and it is loaded with `await import("./mistakeConcept")` inside
// `recordMistake`, NOT imported statically: mistakeConcept wraps progressBankIndex,
// which IS the question bank, and this module sits in the static graph of Check &
// Improve and of every page that mounts SolutionChecker. See `resolveConcept` below.

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
  /**
   * MI-CONCEPT-1 — the concept (bank `subtopic`), supplied by a call site that holds
   * the BANK id when `questionId` is a surface-scoped SYNTHETIC attempt id.
   *
   * ★ Worksheet / full-mock / chapter-test pass `ws:`/`fm:`/`ct:` attempt ids as
   * `questionId` (they are the dedup + weak-area bridge key and must not change),
   * so the central fallback below cannot resolve them. Those three resolve from
   * `PersistedWorksheetQuestion.id` themselves and pass the result here.
   * ★ Surfaces whose `questionId` IS the bank id (Quick Practice, SolutionChecker)
   * leave this unset — `buildEntry` resolves it centrally.
   * ★ Supply it ONLY from the bank. Never a topic, never a guess.
   */
  concept?: string;
  /** Optional difficulty for the bridged wrong-answer signal. */
  difficulty?: string;
  /**
   * SCORECARD-MI-1 (D5 / A2) — the submission identity. `surface` + `submissionId` (the C&I
   * session code, the worksheet / paper / QP session id) + the question identity
   * (`questionId`, else the hashed `question`) + `answerKey` (only where one context allows
   * several answers to one question). Never the score. Absent fields degrade to the
   * question identity alone.
   */
  surface?: string;
  submissionId?: string;
  answerKey?: string;
  /** GA-41 — when the grade happened (ms or ISO). A free-check replay passes the original
   *  `gradedAt`, so the MI entry and the attempt fall in the same Me window. Defaults to now. */
  gradedAt?: number | string;
}

export type RecordMistakeOutcome =
  | "logged" // newly persisted
  | "duplicate" // already persisted (dedup) — UI should treat as saved
  | "skipped-no-user" // signed out
  | "skipped-local" // local/browse session — never persists fabricated history
  | "skipped-clean" // nothing lost — nothing to log (owner ruling: no type on full marks)
  | "skipped-not-attempted" // the student did not attempt it — its own state, never a mistake
  | "error";

export interface RecordMistakeResult {
  outcome: RecordMistakeOutcome;
  /** Whether a weak-area (Stream 3) signal was written for this check. */
  bridged: boolean;
  /** SCORECARD-MI-1 (W1): a clean / not-attempted re-grade removed this submission's earlier
   *  entry. Present only when it did. */
  cleared?: true;
}

type ReconciledCounts = MistakeTypeCounts;

const DEDUP_STORAGE_KEY = "lazytopper.mi.dedup.v1";
const DEDUP_MAX = 400;

/**
 * The four counts this entry records — `effectiveTypeCounts` from lib/mistakeDisplay, the SAME
 * function the scorecard, both PDFs and the session record use (GA-20): per type the larger of
 * the grader's summary and its typed steps, and nothing at all on a question that lost no mark.
 */
function reconcileCounts(result: CheckSolutionResponse): ReconciledCounts {
  return effectiveTypeCounts(result);
}

/** Did this graded answer actually lose marks? (SCORECARD-MI-1: the type alone no longer
 *  admits an entry — a full-mark answer carries no mistake, by owner ruling.) */
function hasMistakeSignal(result: CheckSolutionResponse): boolean {
  return marksLostOn(result) > 0;
}

/**
 * BANK-LEAN-1 (C2) — the concept for a log entry, resolved ASYNC so the bank loads only
 * when a mistake is actually being recorded. SAME RESULT as the old inline expression
 * `ctx.concept?.trim() ? ctx.concept : conceptForBankQuestionId(questionId)`:
 *   - a call-site concept wins, verbatim (no import at all);
 *   - no questionId → `conceptForBankQuestionId(undefined)` was always `undefined`, so the
 *     bank is not loaded for it (free-typed Check & Improve passes no id — the common case);
 *   - otherwise the SAME function resolves it.
 * If the chunk itself fails to load, the entry is logged WITHOUT a concept rather than the
 * mistake being lost — the absent-is-honest rule mistakeConcept documents, and recoverable:
 * the entry still persists `questionId`, so a reader can always re-resolve.
 */
async function resolveConcept(
  ctx: RecordMistakeContext,
  questionId: string | undefined,
): Promise<string | undefined> {
  if (ctx.concept?.trim()) return ctx.concept;
  if (!questionId) return undefined;
  try {
    const { conceptForBankQuestionId } = await import("./mistakeConcept");
    return conceptForBankQuestionId(questionId);
  } catch {
    return undefined;
  }
}

/** The questionId a log entry carries (trimmed; absent when blank). */
function entryQuestionId(ctx: RecordMistakeContext): string | undefined {
  return ctx.questionId && ctx.questionId.trim() ? ctx.questionId.trim() : undefined;
}

function buildEntry(
  ctx: RecordMistakeContext,
  result: CheckSolutionResponse,
  counts: ReconciledCounts,
  concept: string | undefined,
): Omit<MistakeLogEntry, "id"> {
  const marksLost = Math.max(0, (Number(result.totalMarks) || 0) - (Number(result.marksAwarded) || 0));
  // ── MI-INTAKE-FILTER — a diagnosis enters MI on its TYPE, not on whether it
  // cost marks. The old predicate also required `marksDeducted > 0`, which
  // silently discarded every diagnosis on an OBJECTIVE question: the grader's
  // `clampObjectiveResult` sets `marksDeducted = 0` on EVERY step of an MCQ /
  // 1-mark item by design (objective steps carry no per-step marks — the
  // whole-question mark lives at the question level), while
  // `applyObjectiveMistakeGuard` deliberately KEEPS the mistakeType whenever
  // there is real working to classify. So a student who answers correctly by a
  // flawed method — or wrongly but with working — was diagnosed by the grader
  // and then had that diagnosis dropped here. It also left `stepDetails`
  // contradicting `mistakeCounts` on the same entry, since `reconcileCounts`
  // never had a deduction guard.
  //
  // The type test STAYS: an untyped step is nothing to record, and inventing a
  // type would be fabrication.
  // `marksLost` above is computed from the QUESTION TOTALS and is NOT summed
  // from this list, so admitting a zero-deduction entry adds a DIAGNOSIS
  // without adding a lost mark.
  const stepDetails = (result.annotatedSteps ?? [])
    // SCORECARD-MI-1 — the same per-step rule the screen uses: no type on a not-attempted or
    // unknown-status step, none on a question that lost nothing.
    .filter((s) => s.mistakeType && stepShowsType(s, result))
    .map((s) => ({
      stepNumber: s.stepNumber,
      mistakeType: String(s.mistakeType),
      // Coerced because the dropped `> 0` test was also what previously
      // guaranteed this field was a real number before it reached Firestore.
      marksDeducted: Number(s.marksDeducted) || 0,
    }));
  // ── MI-CONCEPT-1 — questionId write-through + concept resolution ──────────
  // `questionId` already reached this function (dedup + the weak-area bridge read
  // it); it was simply never written onto the entry. Write it through.
  const questionId = entryQuestionId(ctx);
  // `concept` is resolved by the caller (resolveConcept — BANK-LEAN-1 C2): a concept
  // the call site resolved from the BANK id (worksheet / full-mock / chapter-test,
  // whose ctx.questionId is a synthetic attempt id) wins; otherwise it is resolved
  // centrally — correct for Quick Practice and SolutionChecker, which pass the bare
  // bank id, and correctly a no-op for free-typed Check & Improve, which passes no id.
  // ★ VERBATIM. Nothing here re-derives, slugifies or case-folds the value.
  // Both keys are OMITTED when absent rather than written as `undefined`, so an
  // entry with no bank identity is byte-identical in shape to a pre-MI-CONCEPT-1
  // entry — absent, not "present and empty".
  const at = ctx.gradedAt != null ? new Date(ctx.gradedAt) : new Date();
  return {
    timestamp: Number.isFinite(at.getTime()) ? at.toISOString() : new Date().toISOString(),
    questionText: ctx.question,
    ...(questionId ? { questionId } : {}),
    ...(concept ? { concept } : {}),
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

/**
 * Cache-restore signature: the stable identity PLUS the outcome. It only decides whether a
 * write is needed at all (an identical result restored on mount writes nothing); WHERE the
 * entry lives is the identity alone (`gradeIdentityDocId`), so a re-grade with a different
 * outcome overwrites the same entry instead of adding a second one (GA-17).
 */
function dedupKey(
  identity: string,
  result: CheckSolutionResponse,
  counts: ReconciledCounts,
): string {
  return [
    identity,
    `${Number(result.marksAwarded) || 0}/${Number(result.totalMarks) || 0}`,
    `${counts.conceptual}-${counts.calculation}-${counts.silly}-${counts.presentation}`,
  ].join("::");
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

/** SCORECARD-MI-1 (W1) — the ring's outcome tail for a submission whose latest grade had no
 *  mistake (full marks, or not attempted): its entry was removed. */
const CLEAN_OUTCOME = "clean";

function cleanRingKey(identity: string, result: CheckSolutionResponse): string {
  return [identity, `${Number(result.marksAwarded) || 0}/${Number(result.totalMarks) || 0}`, CLEAN_OUTCOME].join("::");
}

/** The identity a ring key was written for: the key minus its two outcome segments (score,
 *  counts). Exact, so one identity can never match another that merely starts with it. */
function ringIdentity(k: string): string {
  const parts = k.split("::");
  return parts.length > 2 ? parts.slice(0, -2).join("::") : "";
}

/** The LATEST outcome logged for this identity on this device (the ring is newest-first). */
function latestRingKeyFor(seen: string[], identity: string): string | undefined {
  return seen.find((k) => ringIdentity(k) === identity);
}

/**
 * SCORECARD-MI-1 — has an EARLIER outcome of this same submission already been logged with a
 * knowledge gap (and so already reached the weak-area bridge)? Read from the dedup ring this
 * module already keeps — no second store: each ring key ends "<conceptual>-<calc>-<silly>-<pres>"
 * (or "clean"). A re-grade of the same answer therefore never counts the same gap twice — not
 * even after a clean re-grade in between (W1).
 */
function knowledgeGapAlreadyBridged(seen: string[], identity: string): boolean {
  return seen.some((k) => {
    if (ringIdentity(k) !== identity) return false;
    const counts = k.slice(k.lastIndexOf("::") + 2).split("-");
    return (Number(counts[0]) || 0) > 0;
  });
}

/** The ONE identity context every path of the front door builds (ruling A2). */
function identityContextOf(context: RecordMistakeContext) {
  return {
    surface: context.surface,
    submissionId: context.submissionId,
    questionId: context.questionId,
    question: context.question,
    answerKey: context.answerKey,
  };
}

/**
 * SCORECARD-MI-1 (W1) — a re-grade of the same submission came back with no mistake: remove
 * that submission's stable-identity entry, so MI never keeps a mistake the scorecard no longer
 * shows. The evidence that an entry exists is this module's own dedup ring (its latest outcome
 * for the identity was a logged one) or a copy on the device. A clean marker then goes into the
 * ring, so mistake → clean → mistake writes the entry again, and the bridge still fires once.
 */
async function clearSupersededEntry(
  uid: string,
  context: RecordMistakeContext,
  result: CheckSolutionResponse,
): Promise<boolean> {
  const identityCtx = identityContextOf(context);
  const identity = gradeIdentityKey(uid, identityCtx);
  const seen = readDedup();
  const latest = latestRingKeyFor(seen, identity);
  const known = latest !== undefined && !latest.endsWith(`::${CLEAN_OUTCOME}`);
  let cleared = false;
  try {
    cleared = await removeStableMistakeLog(uid, gradeIdentityDocId(uid, identityCtx), { known });
  } catch {
    cleared = false;
  }
  if (cleared) {
    const marker = cleanRingKey(identity, result);
    writeDedup([marker, ...seen.filter((k) => k !== marker)]);
  }
  return cleared;
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
  // Not attempted is its own state — never a mistake, never an MI entry (owner ruling).
  // Neither it nor a clean grade is logged; a RE-grade that comes back that way removes the
  // submission's earlier entry (W1).
  const notAttempted = isQuestionNotAttempted(gradeResult);
  if (notAttempted || !hasMistakeSignal(gradeResult)) {
    const cleared = await clearSupersededEntry(user.uid, context, gradeResult);
    return {
      outcome: notAttempted ? "skipped-not-attempted" : "skipped-clean",
      bridged: false,
      ...(cleared ? { cleared: true as const } : {}),
    };
  }

  const counts = reconcileCounts(gradeResult);

  // ── Identity + dedup ──────────────────────────────────────────────────
  const identityCtx = identityContextOf(context);
  const identity = gradeIdentityKey(user.uid, identityCtx);
  const entryId = gradeIdentityDocId(user.uid, identityCtx);
  const key = dedupKey(identity, gradeResult, counts);
  const seen = readDedup();
  // A duplicate is the SAME outcome as this submission's LATEST one: a cache-restore writes
  // nothing, while mistake → clean → the same mistake writes the entry again (W1).
  if (latestRingKeyFor(seen, identity) === key) return { outcome: "duplicate", bridged: false };

  // ── Builder + safety gate ─────────────────────────────────────────────
  const concept = await resolveConcept(context, entryQuestionId(context));
  const entry = buildEntry(context, gradeResult, counts, concept);
  if (!isSafeEntry({ id: "pending", ...entry })) {
    return { outcome: "error", bridged: false };
  }

  // ── Stream 1 — mistake log ────────────────────────────────────────────
  try {
    // The stable id: a re-grade of this submission REPLACES its entry (D5).
    await logMistakes(user.uid, entry, { id: entryId });
  } catch {
    return { outcome: "error", bridged: false };
  }
  // Mark seen only AFTER a successful log, so a transient failure can retry.
  writeDedup([key, ...seen.filter((k) => k !== key)]);

  // ── Phase 2 — bridge knowledge-gap mistakes to weak-areas (Stream 3) ──
  // SCORECARD-MI-1 (GA-21): knowledge gaps ONLY (the owner's conceptual group, decided in
  // lib/mistakeDisplay). ONE signal per graded check per topic, and ONE per submission
  // identity — a re-grade of the same answer never counts the same gap twice.
  let bridged = false;
  const isKnowledgeGap =
    (Object.keys(counts) as Array<keyof ReconciledCounts>).some((t) => counts[t] > 0 && isKnowledgeGapType(t)) ||
    (gradeResult.annotatedSteps ?? []).some((s) => isKnowledgeGapType(s.mistakeType) && stepShowsType(s, gradeResult));
  if (isKnowledgeGap && !knowledgeGapAlreadyBridged(seen, identity)) {
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
