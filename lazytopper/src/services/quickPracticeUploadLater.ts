// src/services/quickPracticeUploadLater.ts
//
// QP-UPLOAD-LATER — Quick Practice gets the "upload your written answers later" mechanism
// Chapter Test, Worksheet and Full Mock already have.
//
// Before this, the record write waited for the written grade, so a student who finished a set
// with written questions still on paper and left the page lost the set. Now:
//
//   1. "Upload later" (`saveQuickPracticeUploadLater`) writes the session record NOW, with the
//      outcomes scored so far (the same `persistQuickPracticeSession`, same record id), plus a
//      text-only snapshot of the written questions still waiting (quickPracticePaperStore).
//   2. The later grade (`gradeQuickPracticeLater`) sends ONLY the waiting questions through
//      the UNCHANGED `gradeQuickPracticeBatch`, under the SAME worksheetId the set was given —
//      that id is the MI submission id, so `recordMistake` / `recordAttempt` REPLACE, never
//      double count. The new grades are merged onto the earlier outcomes and the SAME record
//      id is re-written. The snapshot is cleared once nothing is waiting.
//
// ★ OWNER RULING (16 Oct 2026 22:20): a later upload is graded AND recorded to Mistake
//   Intelligence like a Chapter Test upload (`record: true`), even though the steps were
//   visible after Finish. This is the explicit later-upload path ONLY: the page's normal
//   review-mode gate (PRACTICE-REVIEW-HONEST-1, `record: false` for working saved in review)
//   is untouched.
// ★ Grading, scoring and mistake typing are the shared service's, byte-unchanged.
// ★ Signed-out / local: nothing is kept and the caller says so honestly.

import type { AuthUser } from "../context/AuthContext";
import {
  gradeQuickPracticeBatch,
  persistQuickPracticeSession,
  type QuickPracticeBatchGrader,
  type QuickPracticeBatchResult,
  type QuickPracticeEntry,
  type QuickPracticeSavedAnswer,
} from "./quickPracticeSessionService";
import { quickPracticeCode } from "./sessionRecords";
import {
  deleteQuickPracticePaper,
  saveQuickPracticePaper,
  type QuickPracticePaperSnapshot,
} from "./quickPracticePaperStore";

export type QuickPracticePersistIdentity = QuickPracticePaperSnapshot["persist"];

function isCloudUser(user: AuthUser | null | undefined): boolean {
  return !!user?.uid && !user.isLocalSession && user.uid !== "anonymous";
}

/** PURE. The written (non-objective) questions with no graded outcome yet, in displayed order.
 *  An MCQ is never "waiting": its mark is the click. */
export function pendingWrittenAnswers(
  answers: QuickPracticeSavedAnswer[],
  entries: QuickPracticeEntry[],
): QuickPracticeSavedAnswer[] {
  return answers.filter((a) => a.objective !== true && !entries[a.qNumber - 1]?.graded);
}

/** The set's record id — the SAME derivation `persistQuickPracticeSession` uses. */
export function quickPracticeRecordCode(persist: QuickPracticePersistIdentity, entries: QuickPracticeEntry[]): string {
  return quickPracticeCode(persist.subject, {
    topicSlug: persist.topicSlug,
    filterSignature: persist.filterSignature,
    questionIds: entries.map((e) => e.questionId),
    startedAt: persist.startedAt,
  });
}

export type UploadLaterOutcome =
  /** `recorded` — whether a session record was actually written (false when nothing was scored yet). */
  | { outcome: "saved"; code: string; pendingCount: number; recorded: boolean }
  | { outcome: "signed-out" }
  | { outcome: "nothing-pending" };

/** "Upload later": write the record now (outcomes so far) + the waiting-questions snapshot. */
export function saveQuickPracticeUploadLater(args: {
  user: AuthUser | null | undefined;
  worksheetId: string;
  subject?: string;
  persist: QuickPracticePersistIdentity;
  /** One per DISPLAYED question (the page's `sessionAnswers`). */
  answers: QuickPracticeSavedAnswer[];
  /** One per DISPLAYED question: the outcomes the record holds now. */
  entries: QuickPracticeEntry[];
  /** The caller's own waiting list, when it knows more (e.g. an answer already graded in
   *  review mode is not waiting). Omitted ⇒ `pendingWrittenAnswers(answers, entries)`. */
  pending?: QuickPracticeSavedAnswer[];
}): UploadLaterOutcome {
  const { user, worksheetId, subject, persist, answers, entries } = args;
  if (!isCloudUser(user)) return { outcome: "signed-out" };
  const pending = args.pending ?? pendingWrittenAnswers(answers, entries);
  if (pending.length === 0) return { outcome: "nothing-pending" };
  // The record is written NOW — leaving the page no longer loses the set. (Nothing scored yet
  // ⇒ the service writes no record, by its own rule; the snapshot still holds the set.)
  const persisted = persistQuickPracticeSession({ user, ...persist, entries });
  const code = quickPracticeRecordCode(persist, entries);
  saveQuickPracticePaper(user, { code, worksheetId, subject, persist, entries, pending });
  return { outcome: "saved", code, pendingCount: pending.length, recorded: persisted === "recorded" };
}

/** PURE. The earlier outcomes with each newly GRADED later answer placed at its displayed
 *  position. A later answer that did not come back graded leaves the earlier entry as it was. */
export function mergeLaterEntries(
  earlier: QuickPracticeEntry[],
  laterEntries: QuickPracticeEntry[],
  sent: QuickPracticeSavedAnswer[],
): QuickPracticeEntry[] {
  const merged = earlier.map((e) => ({ ...e }));
  sent.forEach((answer, i) => {
    const graded = laterEntries[i]?.graded;
    const pos = answer.qNumber - 1;
    if (!graded || pos < 0 || pos >= merged.length) return;
    const next: QuickPracticeEntry = { ...merged[pos], graded };
    delete next.notGraded;
    delete next.notGradedReason;
    merged[pos] = next;
  });
  return merged;
}

export interface LaterWorking {
  imageBase64?: string | null;
  imageMimeType?: string | null;
  textAnswer?: string | null;
}

export interface QuickPracticeLaterResult {
  result: QuickPracticeBatchResult;
  /** The merged outcomes (graded only). */
  entries?: QuickPracticeEntry[];
  /** Written questions still waiting after this grade (empty ⇒ snapshot cleared). */
  stillPending: QuickPracticeSavedAnswer[];
}

/** The later grade: ONLY the waiting questions, the SAME worksheetId, recorded (owner ruling). */
export async function gradeQuickPracticeLater(args: {
  user: AuthUser | null | undefined;
  snapshot: QuickPracticePaperSnapshot;
  /** The working saved now, by bank question id. */
  working: Record<string, LaterWorking>;
  /** Test seam; production gets `gradeWorksheet` through the service. */
  grade?: QuickPracticeBatchGrader;
}): Promise<QuickPracticeLaterResult> {
  const { user, snapshot, working } = args;
  const answers: QuickPracticeSavedAnswer[] = snapshot.pending.map((p) => {
    const w = working[String(p.questionId)];
    return {
      ...p,
      imageBase64: w?.imageBase64 ?? null,
      imageMimeType: w?.imageMimeType ?? null,
      textAnswer: w ? (w.textAnswer ?? null) : (p.textAnswer ?? null),
    };
  });
  const result = await gradeQuickPracticeBatch({
    worksheetId: snapshot.worksheetId,
    subject: snapshot.subject,
    answers,
    user,
    ...(args.grade ? { grade: args.grade } : {}),
    // ★ OWNER RULING 16 Oct 22:20 — the explicit later-upload flag: recorded like a Chapter
    //   Test upload. Never reached from the page's normal (review-gated) grade.
    record: true,
  });
  if (result.outcome !== "graded") {
    return { result, stillPending: snapshot.pending };
  }
  const entries = mergeLaterEntries(snapshot.entries, result.entries, answers);
  // The SAME record id (same identity, same displayed ids), now with the written grades.
  persistQuickPracticeSession({ user, ...snapshot.persist, entries });
  const stillPending = snapshot.pending.filter((p) => !entries[p.qNumber - 1]?.graded);
  if (stillPending.length === 0) {
    deleteQuickPracticePaper(user, snapshot.code);
  } else {
    saveQuickPracticePaper(user, {
      code: snapshot.code,
      worksheetId: snapshot.worksheetId,
      subject: snapshot.subject,
      persist: snapshot.persist,
      entries,
      pending: stillPending,
    });
  }
  return { result, entries, stillPending };
}
