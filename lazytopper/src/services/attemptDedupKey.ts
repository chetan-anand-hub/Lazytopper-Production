/*
 * attemptDedupKey — the idempotency key for a practice attempt.
 *
 * Extracted into its own dependency-free module (no firebase, no React) so the key's
 * load-bearing properties can be proven in the CI-gated ops matrix by importing the
 * REAL function (transpile-then-require), never by re-deriving or text-scanning it.
 * `practiceInsights.ts` imports both functions from here; nothing else about the
 * attempt-recording path changed.
 */

/** The subset of a record-attempt context the key actually reads. `RecordAttemptContext`
 *  (practiceInsights.ts) is structurally compatible — this stays minimal so the module
 *  has zero import surface. */
export interface AttemptDedupContext {
  questionId?: string;
  question?: string;
  topic?: string;
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
 * `{merge:true}`), so its dedup window is all-time and cross-device, not the local
 * 400-entry ring (that ring is only a fast pre-check).
 *
 * ★ `mode` is deliberately NOT in the key. The same question answered the same way to
 * the same result is ONE outcome regardless of HOW it was produced: an MCQ click
 * (`mode:"mcq"`, 1/1) and a graded typed answer (`mode:"graded"`, 1/1) on the same
 * question are the same 1/1 outcome and must collapse into one attempt doc — otherwise
 * a wrong-click-then-grade round-trip mints TWO permanent docs and progress counts the
 * question twice. The score IS in the key (`${scored}/${available}`), so two genuinely
 * different results (0/1 vs 1/1) still key apart and never collapse. `mode` is HOW, not
 * WHAT — the wrong axis of identity. Pinned in the ops matrix (objective-dedup
 * acceptance): mode-independence AND score-distinctness, each with a negative control.
 */
export function attemptDedupKey(
  uid: string,
  ctx: AttemptDedupContext,
  scored: number,
  available: number,
): string {
  const qid =
    ctx.questionId && ctx.questionId.trim()
      ? ctx.questionId.trim()
      : `t:${hashAttemptString(ctx.question || ctx.topic || "")}`;
  return [uid, qid, `${scored}/${available}`].join("::");
}

/* ── SCORECARD-MI-1 (wave B-15, controller ruling A2) — the ONE grade-identity function ──
 *
 * "Re-grading the SAME submission never adds a record; a genuinely NEW submission does."
 * The identity of one graded answer = uid + surface + submission context (the session /
 * paper / check id) + question identity (+ answer-content identity only where one context
 * allows several answers to one question, e.g. a Quick Practice retry). NEVER the score or
 * the counts — those are the OUTCOME, and a re-grade changes them.
 *
 * Used for the Mistake-Intelligence entry (its Firestore doc id, so a re-grade REPLACES).
 * ⚠ NOT YET for the attempt key above: `attemptDedupKey` keeps `${scored}/${available}`
 * because the CI gate `lazytopper/scripts/ops/objective_dedup_acceptance.mjs:94` pins
 * "0/1 and 1/1 on the same question stay DISTINCT (score is in the key)". Changing that is an
 * owner decision (HELD — SCORECARD-MI-1 report). When it is lifted, the attempt key should
 * become this function.
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
