// src/services/quickPracticeSessionService.ts
//
// Quick Practice — the session PERSISTENCE seam: the thin service that makes a
// FINISHED QP session a first-class SessionSurface, mirroring checkImproveGradeService.
// It does NOT grade — the page's existing grade path (SolutionChecker's
// checkSolutionImage) and its MI feed (recordMistake + recordAttempt) are
// byte-unchanged; this module only assembles the durable record + per-question payload
// AFTER the student finishes, via the SAME writeSessionRecord / writeSessionPerQuestion
// every surface uses.
//
// ── NON-COUNTING (LOCKED §1a as amended, owner-ratified 2026-07-15) ──────────
// This record feeds NO progress/MI rung. QP's marks and mistakes ALREADY stream to
// progress through recordAttempt (SolutionChecker / PracticeQuestionCard); counting
// this record too would DOUBLE every one. The exclusion is enforced structurally by
// `PROGRESS_COUNTING_SURFACES` at progressStore's two aggregation boundaries — not by
// anything in this file. See sessionRecords.ts's header for the full amendment.
//
// HONESTY:
//   • an UNATTEMPTED question is OMITTED, never scored 0 and never marked couldNotRead
//     (that flag means "the grader could not read your upload" — a different fact);
//   • `results.length < questionIds.length` is therefore MEANINGFUL and intentional for
//     QP: attempted vs displayed. Do NOT "fix" it by padding — the padding would be the
//     fabrication. (The alignment guard this trips in progressStore is moot: QP records
//     never reach those rungs.)
//   • a bare MCQ click carries NO working → NO annotatedSteps and NO mistakeSummary
//     (the shipped "no visible reasoning → no MI intel" invariant, D-PROG-2);
//   • a session where NOTHING was attempted writes NO record — no fabricated history.

import type { AuthUser } from "../context/AuthContext";
import type { CheckSolutionResponse, WorksheetGradeResponse, WorksheetQuestionGrade } from "../ai/aiClient";
import type { PracticeAttempt } from "./practiceInsights";
import { resolveCanonicalSlug } from "../data/syllabus/canonicalTopicSlug";
import {
  buildQuickPracticeSessionRecord,
  quickPracticeCode,
  stableHash8,
  writeSessionRecord,
  writeSessionPerQuestion,
  type QuickPracticeIdentity,
  type SessionSubject,
} from "./sessionRecords";

/** ONE canonical topic vocabulary — the P0 [FU-TOPICKEY-UNIVERSAL] authority. Mirrors
 *  progressStore's `canonicalKey`: BOTH sides of every compare resolve through
 *  `resolveCanonicalSlug`, never `resolveCanonicalTopicKey` (the resolver #363
 *  demoted). This is load-bearing here — `recordAttempt` stores
 *  `resolveCanonicalSlug(...) || topicLabel`, so an attempt's topicKey may be a
 *  canonical slug OR a raw label ("Real Numbers"), and comparing raw strings would
 *  silently match nothing ([FU-PROG-TOPIC-KEY-MISMATCH]). */
function canonicalKey(raw: string | null | undefined): string {
  const input = String(raw ?? "").trim();
  if (!input) return "";
  return String(resolveCanonicalSlug(input) || "").trim().toLowerCase();
}

/**
 * The seen-set: bank ids this student has already ATTEMPTED on this topic.
 *
 * Source is the `practiceInsights` attempts stream, NOT the new session record —
 * PracticeAttempt already carries `questionId` + `topicKey` + `timestamp`, which IS a
 * seen-set, and it is written on every QP answer (subjective grade AND bare MCQ click).
 * Reading it here means the unique-sets fix stands on its own: it needs no session
 * record, works for sessions that were abandoned before any finish, and covers HPQ
 * answers on the same topic too.
 *
 * Honest limits, stated because they shape the result rather than break it:
 *   · "seen" means ANSWERED. A question that was displayed and skipped is not in here —
 *     which is why the draw ALSO rotates the unseen partition (see selectInRangeFromPool).
 *   · a synthetic id (`ws:`/`ct:`/`fm:`/`ci:`) can never collide with a bank id, so
 *     other surfaces' attempts are naturally inert here.
 * Pure — the caller supplies the attempts.
 */
export function buildSeenQuestionIds(attempts: PracticeAttempt[], topicKey: string): Set<string> {
  const target = canonicalKey(topicKey);
  const seen = new Set<string>();
  if (!target) return seen;
  for (const a of attempts) {
    if (canonicalKey(a.topicKey || a.topicName) !== target) continue;
    const qid = String(a.questionId || "").trim();
    if (qid) seen.add(qid);
  }
  return seen;
}

/**
 * The per-session rotation offset — a deterministic function of the session's identity,
 * never `Math.random()` (CLAUDE.md §7). Same topic + same filters + same visit → the
 * same offset, so the set is stable while the student works; a new visit or a new
 * filter set → a different offset → a different combination.
 */
export function sessionRotationOffset(topicSlug: string, filterSignature: string, startedAt: number): number {
  const facts = `${canonicalKey(topicSlug)}|${filterSignature}|${startedAt}`;
  return parseInt(stableHash8(facts), 16);
}

/** One displayed question's outcome, as the page knows it at finish. */
export interface QuickPracticeEntry {
  /** The real bank question id (also the seen-set key). */
  questionId: string;
  /** The question's mark value (the MCQ path has no grader to report totalMarks). */
  marks: number;
  /** A full subjective grade, when the student checked written working. */
  graded?: CheckSolutionResponse;
  /** A bare MCQ click outcome, when there is no graded working. */
  mcq?: "correct" | "wrong";
}

/**
 * Assemble the unified WorksheetGradeResponse for a finished QP session from the
 * page's own state. Pure; grade numbers pass through untouched.
 *
 * `qNumber` is the 1-based position in the DISPLAYED set (not in the attempted
 * subset), so it stays a valid index into the record's `questionIds` even though the
 * results are sparse.
 *
 * A question with BOTH a graded result and an MCQ click prefers the GRADED one: it is
 * strictly more informative (real working, real per-step marks, real mistake types)
 * and it is what the student actually submitted for grading.
 */
export function buildQuickPracticeResponse(entries: QuickPracticeEntry[]): WorksheetGradeResponse {
  const results: WorksheetQuestionGrade[] = [];
  let gradedMarksAwarded = 0;
  let gradedMarksTotal = 0;
  let worksheetTotalMarks = 0;

  entries.forEach((entry, index) => {
    const qNumber = index + 1;
    worksheetTotalMarks += Number(entry.marks) || 0;

    if (entry.graded) {
      const totalMarks = Number(entry.graded.totalMarks) || 0;
      const marksAwarded = Number(entry.graded.marksAwarded) || 0;
      results.push({
        qNumber,
        couldNotRead: false,
        totalMarks,
        ok: true,
        marksAwarded,
        percentage: Number(entry.graded.percentage) || 0,
        annotatedSteps: entry.graded.annotatedSteps ?? [],
        mistakeSummary: entry.graded.mistakeSummary ?? {
          conceptual: 0,
          calculation: 0,
          silly: 0,
          presentation: 0,
        },
        teacherNote: entry.graded.teacherNote ?? "",
      });
      gradedMarksAwarded += marksAwarded;
      gradedMarksTotal += totalMarks;
      return;
    }

    if (entry.mcq) {
      const totalMarks = Number(entry.marks) || 0;
      const marksAwarded = entry.mcq === "correct" ? totalMarks : 0;
      // No annotatedSteps, no mistakeSummary: a bare click showed no reasoning, so
      // there is nothing to classify and we never guess one (D-PROG-2).
      results.push({
        qNumber,
        couldNotRead: false,
        totalMarks,
        ok: true,
        marksAwarded,
        percentage: totalMarks > 0 ? Math.round((marksAwarded / totalMarks) * 100) : 0,
      });
      gradedMarksAwarded += marksAwarded;
      gradedMarksTotal += totalMarks;
      return;
    }

    // Unattempted — omitted entirely (see the header).
  });

  return {
    ok: true,
    results,
    totalQuestions: entries.length,
    gradedCount: results.length,
    // QP has no upload cycle: a question is attempted or it isn't. Nothing is "pending".
    pendingCount: 0,
    gradedMarksAwarded,
    gradedMarksTotal,
    worksheetTotalMarks,
  };
}

export type PersistQuickPracticeOutcome =
  | "recorded"
  | "skipped-nothing-attempted"
  | "skipped-no-user"
  | "skipped-error";

/**
 * Persist ONE finished Quick Practice session: the SessionRecord + its perQuestion
 * payload. Idempotent by id = the derived QP code (re-finishing the SAME set in the
 * SAME visit overwrites, never duplicates — the code is a pure function of the
 * session's own facts, so no counter is minted and an ABANDONED session writes
 * nothing). Honest-failure gated and best-effort: a persistence miss only logs — it
 * never surfaces an error, because nothing the student can see depends on it.
 */
export function persistQuickPracticeSession(args: {
  user: AuthUser | null | undefined;
  title: string;
  subject: SessionSubject;
  /** The canonical slug for this session's topic. For a multi-topic set this is the
   *  joined identity slug ("mixed:a+b"); `topicKeys` then carries the real per-topic list. */
  topicSlug: string;
  /** Multi-topic ONLY: every chosen topic's canonical slug, so the record carries each
   *  real topic. Omit for single-topic → the record derives `[topicSlug]` as before. */
  topicKeys?: string[];
  /** Stable string of the committed filters — part of the session identity. */
  filterSignature: string;
  /** When this VISIT began (ms epoch) — a new visit is a new session. */
  startedAt: number;
  entries: QuickPracticeEntry[];
}): PersistQuickPracticeOutcome {
  const { user, title, subject, topicSlug, topicKeys, filterSignature, startedAt, entries } = args;

  const response = buildQuickPracticeResponse(entries);
  // Nothing attempted → no record. An opened-and-abandoned set leaves no history.
  if (response.gradedCount <= 0) return "skipped-nothing-attempted";

  const uid = user?.uid;
  if (!uid || user?.isLocalSession) return "skipped-no-user";

  try {
    const questionIds = entries.map((e) => e.questionId);
    const identity: QuickPracticeIdentity = { topicSlug, filterSignature, questionIds, startedAt };
    const code = quickPracticeCode(subject, identity);
    const record = buildQuickPracticeSessionRecord({
      code,
      title,
      subject,
      topicSlug,
      questionIds,
      response,
      startedAt,
      uid,
    });
    // Multi-topic: carry EVERY chosen topic on the record. Done HERE (not in the record
    // builder) so `sessionRecords.ts` stays byte-unchanged — it is on the Tutor⇄C&I overlay
    // lane's forbidden-zero-diff guard (check_improve_overlay_additive_acceptance.mjs), and
    // the builder's single-`[slug]` default is the correct single-topic shape anyway. The
    // canonical-slug resolution mirrors the builder's own. Single-topic → untouched.
    const multiTopicKeys =
      topicKeys && topicKeys.length > 0
        ? Array.from(new Set(topicKeys.map((k) => resolveCanonicalSlug(k)).filter(Boolean)))
        : null;
    const finalRecord =
      multiTopicKeys && multiTopicKeys.length > 0
        ? { ...record, topicKeys: multiTopicKeys }
        : record;
    writeSessionRecord(user, finalRecord);
    writeSessionPerQuestion(user, {
      ref: record.perQuestionRef,
      code,
      worksheetId: record.worksheetId,
      surface: "quick-practice",
      gradedAt: record.gradedAt,
      response,
    });
    return "recorded";
  } catch (error) {
    console.warn("[quickPracticeSessionService] session record write failed", error);
    return "skipped-error";
  }
}
