/*
 * attemptDedupKey — the idempotency key for a practice attempt.
 *
 * Extracted into its own dependency-free module (no firebase, no React) so the key's
 * load-bearing properties can be proven in the CI-gated ops matrix by importing the
 * REAL function (transpile-then-require), never by re-deriving or text-scanning it.
 * `practiceInsights.ts` imports these functions from here.
 */

/** The subset of a record-attempt context the key actually reads. `RecordAttemptContext`
 *  (practiceInsights.ts) is structurally compatible — this stays minimal so the module
 *  has zero import surface. */
export interface AttemptDedupContext {
  questionId?: string;
  question?: string;
  topic?: string;
  /** SCORECARD-MI-1 PR-2 (H1) — the submission identity, the SAME fields Mistake Intelligence
   *  keys on (ruling A2): which surface graded it, the session / paper / check id, and — only
   *  where one context allows several answers to one question — the answer's own identity. */
  surface?: string;
  submissionId?: string;
  answerKey?: string;
}

/** Stable, order-preserving DJB2-style hash → base36. Used only to fold free-typed
 *  answers (no stable question id) into a compact key segment. */
export function hashAttemptString(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

/**
 * The idempotency key for an attempt. It is ALSO the Firestore doc id (see
 * `recordAttempt` — `key.replace(...)` → `doc(..., "attempts", attemptId)` with
 * `{merge:true}`), so its window is all-time and cross-device, not the local 400-entry
 * ring (that ring is only a fast pre-check).
 *
 * ★ SCORECARD-MI-1 PR-2 (H1, GA-17) — superseded by owner ruling 2026-10-05: re-grade
 * replaces. The key is the SUBMISSION's identity — uid + surface + submission context +
 * question identity (+ answer identity only where one context allows several answers to one
 * question), built by the ONE identity function below (`gradeIdentityKey`, ruling A2). The
 * SCORE IS NEVER IN THE KEY: re-grading the same submission writes the same key, so the stored
 * attempt is REPLACED (latest wins — `upsertAttempt`) instead of a second attempt being added
 * when the score changes. A genuinely NEW submission (a new session, paper or check, or a new
 * answer where several are allowed) has a new key, so wrong-then-right across sessions or
 * retries is still two attempts.
 *
 * ★ `mode` is deliberately NOT in the key, unchanged: an MCQ click (`mode:"mcq"`) and a
 * graded typed answer (`mode:"graded"`) carrying the same identity are the same attempt.
 * `mode` is HOW, not WHAT. Pinned in the ops matrix (objective-dedup acceptance §4b).
 */
export function attemptDedupKey(uid: string, ctx: AttemptDedupContext): string {
  return gradeIdentityKey(uid, {
    surface: ctx.surface,
    submissionId: ctx.submissionId,
    questionId: ctx.questionId,
    question: ctx.question || ctx.topic || "",
    answerKey: ctx.answerKey,
  });
}

/** The minimal stored-attempt shape `upsertAttempt` reads. */
export interface UpsertableAttempt {
  id: string;
  marksScored?: number;
  marksAvailable?: number;
  notAttempted?: boolean;
  marksLostByType?: unknown;
}

export type UpsertAttemptOutcome = "recorded" | "replaced" | "duplicate";

/** The outcome an attempt records — what a re-grade may change. */
function outcomeSignature(a: UpsertableAttempt): string {
  return JSON.stringify([
    Number(a.marksScored) || 0,
    Number(a.marksAvailable) || 0,
    a.notAttempted === true,
    a.marksLostByType ?? null,
  ]);
}

/**
 * SCORECARD-MI-1 PR-2 (H1) — "re-grade replaces; latest wins", as ONE pure function over the
 * stored list. The attempt whose `id` (the submission identity) matches `next.id` is REPLACED
 * IN PLACE by `next`; the same outcome again is a no-op ("duplicate" — a cache-restore writes
 * nothing); an id not yet stored is appended ("recorded"). Never two attempts for one
 * submission. Pure: returns a new list, never mutates the input.
 */
export function upsertAttempt<A extends UpsertableAttempt>(
  attempts: readonly A[],
  next: A,
): { attempts: A[]; outcome: UpsertAttemptOutcome; previous: A | null } {
  const i = attempts.findIndex((a) => a.id === next.id);
  if (i < 0) return { attempts: [...attempts, next], outcome: "recorded", previous: null };
  const previous = attempts[i];
  if (outcomeSignature(previous) === outcomeSignature(next)) {
    return { attempts: [...attempts], outcome: "duplicate", previous };
  }
  const out = [...attempts];
  out[i] = next;
  return { attempts: out, outcome: "replaced", previous };
}

/* ── SCORECARD-MI-1 (wave B-15, controller ruling A2) — the ONE grade-identity function ──
 *
 * "Re-grading the SAME submission never adds a record; a genuinely NEW submission does."
 * The identity of one graded answer = uid + surface + submission context (the session /
 * paper / check id) + question identity (+ answer-content identity only where one context
 * allows several answers to one question, e.g. a Quick Practice retry). NEVER the score or
 * the counts — those are the OUTCOME, and a re-grade changes them.
 *
 * Used for the Mistake-Intelligence entry (its Firestore doc id, so a re-grade REPLACES) and,
 * since SCORECARD-MI-1 PR-2 (H1, owner ruling 2026-10-05), for the attempt key above.
 */
export interface GradeIdentityContext {
  /** Which surface graded it ("check-improve", "worksheet", "quick-practice" …). */
  surface?: string;
  /** The submission context: the C&I session code, the worksheet / paper id, the QP session. */
  submissionId?: string;
  /** A stable question id when the surface has one. */
  questionId?: string;
  /** The question text — hashed when there is no stable id. */
  question?: string;
  /** Answer-content identity, ONLY where one context allows several answers to one question. */
  answerKey?: string;
}

export function gradeIdentityKey(uid: string, ctx: GradeIdentityContext): string {
  const surface = String(ctx.surface ?? "").trim() || "unknown";
  const submission = String(ctx.submissionId ?? "").trim();
  const question =
    ctx.questionId && ctx.questionId.trim()
      ? ctx.questionId.trim()
      : `t:${hashAttemptString(ctx.question || "")}`;
  const parts = [uid, surface, submission, question];
  const answer = String(ctx.answerKey ?? "").trim();
  if (answer) parts.push(`a:${answer}`);
  return parts.join("::");
}

/** The identity as a Firestore-legal document id (no uid — the path already carries it). */
export function gradeIdentityDocId(uid: string, ctx: GradeIdentityContext): string {
  const key = gradeIdentityKey(uid, ctx).slice(uid.length + 2);
  return key.replace(/[/.#$[\]\s]/g, "_").slice(0, 700) || "unknown";
}
