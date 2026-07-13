// src/services/checkImproveGradeService.ts
//
// Check & Improve — the session PERSISTENCE seam (C&I PR-1): the thin service that
// makes a graded C&I session a first-class SessionSurface, mirroring
// fullMockGradeService. It does NOT grade — the page's existing grade calls
// (checkSolutionImage / gradeWorksheet) and its MI feed (recordMistake +
// recordAttempt, stable ids, re-grade dedup) are byte-unchanged; this module only
// writes the durable record + per-question payload AFTER a successful grade, via
// the SAME writeSessionRecord / writeSessionPerQuestion every surface uses
// (idempotent by id = code; honest-failure gated; never blocks the shown grade).
//
// HONESTY (locked C&I spec §4):
//   • a `mixed` session (no single topic resolved) writes topicKeys: [] — marks +
//     four-type only, NEVER single-topic progress by majority guess;
//   • a session where NOTHING was graded (couldNotRead everything / a failed call)
//     writes NO record — no grade → no fabricated history entry;
//   • an externally uploaded question has no bank questionId → its concept is
//     unknowable → questionIds stays [] (concept derivation is bank-matched-only);
//   • topicSource is stamped at write time from the LIVE session — never backfilled.

import type { AuthUser } from "../context/AuthContext";
import type { CheckSolutionResponse, WorksheetGradeResponse } from "../ai/aiClient";
import {
  buildCheckImproveSessionRecord,
  writeSessionRecord,
  writeSessionPerQuestion,
  type SessionSubject,
  type SessionTopicSource,
} from "./sessionRecords";

/** The page's DesktopSubject ("Maths" | "Science") → the record store's subject. */
export function toSessionSubject(subject: string): SessionSubject {
  return /sci/i.test(String(subject || "")) ? "science" : "maths";
}

/**
 * Derive the session's topic provenance from the EXISTING detect-then-confirm flow
 * (this tags the flow's output — the correction UI itself is untouched):
 *   no single topic resolved (empty slug / the MIX code) → "mixed";
 *   the student touched the topic/subject correction        → "confirmed";
 *   accepted the AI's read without touching it              → "inferred".
 * "bank-matched" is intentionally NOT derivable here — C&I has no bank-match path
 * yet (reserved in the union, emitted by no writer; see SessionTopicSource).
 */
export function deriveTopicSource(topicSlug: string, topicTouched: boolean): SessionTopicSource {
  if (!String(topicSlug || "").trim()) return "mixed";
  return topicTouched ? "confirmed" : "inferred";
}

/**
 * Adapt a SINGLE-question C&I grade (a CheckSolutionResponse) into the unified
 * one-question WorksheetGradeResponse shape the record builder + stored scorecard
 * consume — the exact inverse of the page's `multiQuestionToCsr`. Pure; grade
 * numbers pass through untouched (nothing re-derived, nothing invented).
 */
export function singleCheckToWorksheetResponse(graded: CheckSolutionResponse): WorksheetGradeResponse {
  const totalMarks = Number(graded.totalMarks) || 0;
  const marksAwarded = Number(graded.marksAwarded) || 0;
  return {
    ok: true,
    results: [
      {
        qNumber: 1,
        couldNotRead: false,
        totalMarks,
        ok: true,
        marksAwarded,
        percentage: Number(graded.percentage) || 0,
        annotatedSteps: graded.annotatedSteps ?? [],
        mistakeSummary: graded.mistakeSummary ?? {
          conceptual: 0,
          calculation: 0,
          silly: 0,
          presentation: 0,
        },
        teacherNote: graded.teacherNote ?? "",
      },
    ],
    totalQuestions: 1,
    gradedCount: 1,
    pendingCount: 0,
    gradedMarksAwarded: marksAwarded,
    gradedMarksTotal: totalMarks,
    worksheetTotalMarks: totalMarks,
  };
}

export type PersistCheckImproveOutcome =
  | "recorded"
  | "skipped-nothing-graded"
  | "skipped-no-user"
  | "skipped-error";

/**
 * Persist ONE graded C&I session: the SessionRecord + its perQuestion payload.
 * Idempotent by id = the durable CI code (a re-grade under the frozen code
 * overwrites, never duplicates — the same contract as the MI dedup). Honest-failure
 * gated and best-effort: a persistence miss only logs, never surfaces a grading
 * error (the grade is already on screen).
 */
export function persistCheckImproveSession(args: {
  user: AuthUser | null | undefined;
  code: string;
  title: string;
  subject: SessionSubject;
  /** The confirmed canonical slug, or "" when no single topic resolved (MIX). */
  topicSlug: string;
  topicSource: SessionTopicSource;
  response: WorksheetGradeResponse;
}): PersistCheckImproveOutcome {
  const { user, code, title, subject, topicSlug, topicSource, response } = args;
  // No grade → no record: a session where nothing could be read leaves no
  // fabricated history entry (couldNotRead singles never even reach here).
  if (!response || response.gradedCount <= 0) return "skipped-nothing-graded";
  const uid = user?.uid;
  if (!uid || user?.isLocalSession) return "skipped-no-user";
  try {
    const record = buildCheckImproveSessionRecord({
      code,
      title,
      subject,
      topicSlug,
      topicSource,
      response,
      uid,
    });
    writeSessionRecord(user, record);
    writeSessionPerQuestion(user, {
      ref: record.perQuestionRef,
      code,
      worksheetId: record.worksheetId,
      surface: "check-improve",
      gradedAt: record.gradedAt,
      response,
    });
    return "recorded";
  } catch (error) {
    console.warn("[checkImproveGradeService] session record write failed", error);
    return "skipped-error";
  }
}
