// src/services/chapterTestGradeService.ts
//
// Chapter Test — the two-phase (spec §5) grade orchestration (decision D4, new file;
// worksheetGradeService.ts stays byte-unchanged). It is the CT twin of
// worksheetGradeService: the SAME sacred grader (gradeWorksheet → checkSolution.cjs,
// CALL-ONLY, byte-unchanged) and the SAME Mistake-Intelligence front door
// (recordMistake + its score twin recordAttempt), but it writes a
// surface:"chapter-test" SessionRecord under a CT- code.
//
// Two phases:
//   1. SUBMIT   — Section A objective is graded HERE, client-side, deterministic
//                 0-OR-FULL (PR-348 invariant, never fractional). No upload, no MI —
//                 an MCQ tells us right/wrong, not WHY (spec §5). A PARTIAL record is
//                 written so the history rail shows the pending card immediately.
//   2. UPLOAD   — Sections B–D (written on paper) are graded from ONE uploaded PDF
//                 through the shared structured grader; each legible result feeds MI;
//                 the FULL record (objective + subjective) overwrites the partial one
//                 (idempotent by id = code). Pending pages are never folded into a 0.
//
// The whole test is modelled as ONE UNIFIED WorksheetGradeResponse (objective folded
// in as graded rows, subjective graded-or-pending) so a single artifact drives the
// record, the scorecard hero + four-type + A–D lens, the graded PDF, and the re-open
// payload — exactly the shape the worksheet path already produces.

import { noteFirstGraded } from "../analytics/firstGraded";
import type { AuthUser } from "../context/AuthContext";
import type { GradingJobOptions } from "../ai/gradingJobs";
import { recordableInterruptedRows, recordedQNumbersOf } from "../ai/gradingJobRecords";
import {
  gradeWorksheet,
  type CheckSolutionResponse,
  type PaidCallOptions,
  type WorksheetGradeResponse,
  type WorksheetQuestionGrade,
} from "../ai/aiClient";
import { stampFromPaper } from "../components/results/sectionTypeLens";
import type { PersistedWorksheet, PersistedWorksheetQuestion } from "./worksheetSessionStore";
import { saveWorksheetGrade } from "./worksheetSessionStore";
import { recordMistake, type RecordMistakeOutcome } from "./mistakeIntelligence";
import { isGradedQuestion, objectiveMarksLost, v2GradeFields, withEffectiveCounts } from "../lib/mistakeDisplay";
// SCORECARD-MI-1 PR-2 (B9) — the ONE shared objective scorer (Controller A's module; called,
// never edited): its punctuation / option-letter bridging today, and GRADER-CORE-1 PR-2's case
// rule (options that differ only by case compared case-sensitively) once that lands there.
import { scoreObjective } from "../lib/objectiveScoring";
import { notFoundAsNotAttempted } from "../lib/notFoundNotAttempted";
import { adoptBankMark } from "./markOnPhoto";
import { conceptForBankQuestionId } from "./mistakeConcept";
import { recordAttempt } from "./practiceInsights";
import {
  buildChapterTestSessionRecord,
  writeSessionRecordResolved,
  currentCodeForPaper,
  writeSessionPerQuestion,
  type SessionRecord,
  type SessionSubject,
} from "./sessionRecords";

/** Stable, surface-namespaced per-question id for MI dedup / idempotency — `ct:`
 *  so it never collides with the worksheet `ws:` namespace on the same bank id. */
export function chapterTestQuestionId(worksheetId: string, qNumber: number): string {
  return `ct:${worksheetId}:q${qNumber}`;
}

export interface ObjectiveQuestionResult {
  qNumber: number;
  id: string;
  selected: string | null;
  correct: boolean;
  awarded: number;
  total: number;
}

export interface ObjectiveScore {
  results: ObjectiveQuestionResult[];
  awarded: number;
  total: number;
  answeredCount: number;
  totalQuestions: number;
}

/**
 * Deterministic client-side scoring of the objective (Section A) questions — the
 * PARTIAL result revealed on submit. Graded 0-OR-FULL only, NEVER fractional
 * (PR-348 invariant): a pick is correct iff it equals the canonical answer key (the
 * correct OPTION TEXT). A question with no key or no answer scores 0 (honest — we
 * never award a mark we can't justify). No working, no upload, no MI. Pure.
 */
export function scoreObjectiveSection(
  questions: PersistedWorksheetQuestion[],
  answers: Record<number, string>,
): ObjectiveScore {
  const results: ObjectiveQuestionResult[] = [];
  let awarded = 0;
  let total = 0;
  let answeredCount = 0;
  for (const q of questions) {
    const marks = Number(q.marks) || 1;
    total += marks;
    const selected = answers[q.qNumber] ?? null;
    if (selected != null && selected !== "") answeredCount += 1;
    // B9 — the shared scorer (P4's local case-folding `norm` is gone). An unresolvable compare
    // (no key, no pick) scores 0, exactly as before — never a mark we cannot justify.
    const scored = scoreObjective({
      answerKey: q.answer || "",
      studentPick: selected ?? "",
      options: Array.isArray(q.options) ? q.options : undefined,
      totalMarks: marks,
    });
    const correct = scored.resolved && scored.correct;
    if (correct) awarded += marks;
    results.push({
      qNumber: q.qNumber,
      id: q.id,
      selected,
      correct,
      awarded: correct ? marks : 0,
      total: marks,
    });
  }
  return { results, awarded, total, answeredCount, totalQuestions: questions.length };
}

/** MCQ objective results → graded rows for the unified response. MCQs carry NO
 *  mistakeType (right/wrong isn't a WHY — spec §5), so mistakeSummary is all-zero. */
function objectiveGradeRows(objective: ObjectiveScore): WorksheetQuestionGrade[] {
  return objective.results.map((r) => ({
    // PR-2 (B7) — the pick's loss in marks: unanswered = NOT ATTEMPTED (never a mistake); a
    // wrong pick = lost, reason not recorded (an MCQ tells right/wrong, not why). Sums to the loss.
    marksLostByType: objectiveMarksLost({
      totalMarks: r.total,
      marksAwarded: r.awarded,
      attempted: r.selected != null && r.selected !== "",
    }),
    qNumber: r.qNumber,
    couldNotRead: false,
    ok: true,
    totalMarks: r.total,
    marksAwarded: r.awarded,
    percentage: r.total > 0 ? Math.round((r.awarded / r.total) * 100) : 0,
    annotatedSteps: [],
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: "",
    // TUTOR-FIX-1 - the wrong tap, stored like Quick Practice does (`pickedOption`), so the scorecard
    // hop can tell the tutor WHICH option the student chose on a paper MCQ. Context only: it never
    // changes a mark (the row's marks above are final), and only a lost, answered question carries it.
    ...(r.selected != null && String(r.selected).trim() !== "" && r.awarded < r.total
      ? { pickedOption: String(r.selected).trim().slice(0, 400) }
      : {}),
  }));
}

/** Not-yet-uploaded subjective questions → pending (couldNotRead) rows, so a
 *  submitted-but-not-uploaded test reads honestly as "objective graded, written
 *  pending" — never a fabricated 0 for the written work. */
function pendingSubjectiveRows(
  subjectiveQuestions: PersistedWorksheetQuestion[],
): WorksheetQuestionGrade[] {
  return subjectiveQuestions.map((q) => ({
    qNumber: q.qNumber,
    couldNotRead: true,
    totalMarks: Number(q.marks) || 0,
    note: "Written answer not uploaded yet.",
  }));
}

/**
 * Build the UNIFIED chapter-test response: objective (always graded on submit) +
 * subjective (graded after upload, else pending). Honest, SEPARATE totals — the
 * graded subtotal excludes pending questions so unreadable / not-yet-uploaded pages
 * never deflate a mark shown as complete. Pure.
 */
export function buildChapterTestResponse(args: {
  paper: PersistedWorksheet;
  objective: ObjectiveScore;
  subjectiveQuestions: PersistedWorksheetQuestion[];
  subjectiveResponse: WorksheetGradeResponse | null;
}): WorksheetGradeResponse {
  const { paper, objective, subjectiveQuestions, subjectiveResponse } = args;
  const rows: WorksheetQuestionGrade[] = [
    ...objectiveGradeRows(objective),
    // LIVE-FIX-1 #5 (owner ruling 23 Nov 2026, 23:05 IST): a written answer NOT FOUND on the uploaded pages is "Not attempted · 0"
    // (lib/notFoundNotAttempted) - graded, in the paper's total - when the sheet was read; unreadable / mismatched stay pending.
    ...(subjectiveResponse ? notFoundAsNotAttempted(subjectiveResponse.results) : pendingSubjectiveRows(subjectiveQuestions)),
  ];
  // PR-2 — graded totals over GRADED questions only (an unreadable or mismatched answer is
  // neither a 0 nor part of the total; it is pending, and the paper total still counts it).
  const legible = rows.filter((r) => isGradedQuestion(r));
  const gradedMarksAwarded = legible.reduce((s, r) => s + (Number(r.marksAwarded) || 0), 0);
  const gradedMarksTotal = legible.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0);
  const built: WorksheetGradeResponse = {
    ok: true,
    worksheetId: paper.worksheetId,
    results: rows,
    totalQuestions: rows.length,
    gradedCount: legible.length,
    pendingCount: rows.length - legible.length,
    gradedMarksAwarded,
    gradedMarksTotal,
    worksheetTotalMarks: Number(paper.totalMarks) || gradedMarksTotal,
    summary: subjectiveResponse?.summary,
  };
  // SCORECARD-SECTION-TYPE-1 - stamp each row with its bank section and question type (display only), so
  // the live card, the device cache and the stored payload all carry the SAME lens data. A Chapter Test
  // slot is a marks band, so there is no blueprint fallback: only the bank row's own section counts.
  return stampFromPaper(built, paper.questions, { blueprintFallback: false });
}

/** Adapt one legible per-question grade into the CheckSolutionResponse shape the MI
 *  front door consumes — the SAME shape the worksheet + C&I paths feed it, so
 *  routing and dedup behave identically. */
function toCheckSolutionResponse(g: WorksheetQuestionGrade): CheckSolutionResponse {
  return {
    ok: true,
    totalMarks: Number(g.totalMarks) || 0,
    marksAwarded: Number(g.marksAwarded) || 0,
    percentage: Number(g.percentage) || 0,
    annotatedSteps: g.annotatedSteps ?? [],
    mistakeSummary: g.mistakeSummary ?? {
      conceptual: 0,
      calculation: 0,
      silly: 0,
      presentation: 0,
    },
    teacherNote: g.teacherNote ?? "",
    // SCORECARD-MI-1 PR-2 — the v2 fields travel with the grade (marks per type, states).
    ...v2GradeFields(g),
  };
}

/**
 * Phase 1 — write the PARTIAL record at submit (objective-only graded, subjective
 * pending), so the topic-scoped history rail shows the "⏳ Awaiting sheet" card the
 * moment the test is submitted, even if the student uploads later. Idempotent by
 * id = code. Honest-failure gated (no record for a signed-out / local session).
 * Best-effort — a persistence miss never blocks the scorecard.
 */
export function writeChapterTestPartialRecord(args: {
  user: AuthUser | null | undefined;
  paper: PersistedWorksheet;
  code: string;
  subject: SessionSubject;
  topicKey: string;
  response: WorksheetGradeResponse;
}): Promise<string> {
  const { user, paper, code, subject, topicKey, response } = args;
  const uid = user?.uid;
  if (!uid || user?.isLocalSession) return Promise.resolve(code);
  // RECORD-SAFE-1: the FINAL code is resolved once, before the write; the caller uses the returned code.
  return (async () => {
    try {
      const record = buildChapterTestSessionRecord({ paper, code, subject, topicKey, response, uid });
      const written = await writeSessionRecordResolved(user, record);
      noteFirstGraded(uid, written.record, "chapter_test"); // MEASURE-1 B — observe only
      return written.code;
    } catch (error) {
      console.warn("[chapterTestGradeService] partial record write failed", error);
      return code;
    }
  })();
}

export interface ChapterTestMiOutcome {
  qNumber: number;
  mistakeOutcome: RecordMistakeOutcome;
  bridged: boolean;
}

export interface ChapterTestGradeOutcome {
  /** true once the subjective sheet graded ok. */
  ok: boolean;
  /** The UNIFIED response (objective + subjective) on success; the failed subjective
   *  response (carrying `.error`) on failure. */
  response: WorksheetGradeResponse;
  miOutcomes: ChapterTestMiOutcome[];
  /** RECORD-SAFE-1: the code the full record was finally saved under (differs from the requested code only
   *  when that code belonged to another paper). Absent when nothing was written. */
  savedCode?: string;
}

/** The ONE question of a paper as the grader is sent it — the SAME fields for the whole sheet and for a mark on the photo
 *  (MARK-ON-PHOTO-2). TS-PACK-1: the bank id + the exact persisted text let the server verify a Test Series paper's questions. */
export function chapterTestQuestionInput(q: PersistedWorksheetQuestion) {
  return {
    qNumber: q.qNumber,
    ...(q.id !== undefined && q.id !== null && String(q.id) ? { questionId: String(q.id) } : {}),
    marks: q.marks,
    topic: q.topicLabel,
    topicLabel: q.topicLabel,
    questionText: q.questionText,
    section: q.section,
    answer: q.answer,
    options: q.options,
    solutionSteps: q.solutionSteps,
    finalAnswer: q.finalAnswer,
  };
}

/** ONE graded question → the MI front door + its score twin, on the question's stable id (`ct:<worksheetId>:q<n>`), so a
 *  re-upload or a mark on the photo REPLACES that question's entries rather than adding a second. */
export async function recordChapterTestQuestion(
  user: AuthUser | null | undefined,
  worksheetId: string,
  q: PersistedWorksheetQuestion | undefined,
  g: WorksheetQuestionGrade,
): Promise<ChapterTestMiOutcome | null> {
  // PR-2 — not graded (unreadable, option unread, answer does not match its question) feeds
  // nothing: no MI entry, no attempt, never a 0.
  if (!isGradedQuestion(g) || !q) return null;
  const csr = toCheckSolutionResponse(g);
  const questionId = chapterTestQuestionId(worksheetId, g.qNumber);
  // Sequential await (callers loop): recordMistake reads+writes the device-local dedup list.
  const rec = await recordMistake(user, csr, {
    subject: q.subject,
    topic: q.topicLabel,
    topicKey: q.topicKey,
    question: q.questionText,
    questionId,
    // SCORECARD-MI-1 (D5) — stable identity: a re-upload of this paper REPLACES its entries.
    surface: "chapter-test",
    submissionId: worksheetId,
    // MI-CONCEPT-1 — `questionId` above is the SYNTHETIC attempt id (`ct:…`), which
    // is not a bank id and cannot resolve. The BANK id is `q.id` on the persisted
    // question, so resolve here and hand the concept to the front door. Unresolvable
    // (withheld / deleted) → undefined, and the entry carries no concept.
    concept: conceptForBankQuestionId(q.id),
  });
  recordAttempt(user, {
    subject: q.subject,
    topic: q.topicLabel,
    topicKey: q.topicKey,
    question: q.questionText,
    questionId,
    marksScored: csr.marksAwarded,
    marksAvailable: csr.totalMarks,
    mode: "graded",
    // H1 — the same submission identity as the MI entry: a re-upload replaces the attempt.
    surface: "chapter-test",
    submissionId: worksheetId,
    grade: csr,
  });
  return { qNumber: g.qNumber, mistakeOutcome: rec.outcome, bridged: rec.bridged };
}

/**
 * Phase 2 — grade the uploaded answer sheet (Sections B–D) against the KNOWN scheme
 * in one structured call, feed each legible result through MI, then overwrite the
 * partial record with the FULL one (idempotent by id = code). ONLY the subjective
 * questions are sent — the objective section was already scored on submit and MCQs
 * never carry working. Honest-failure gated.
 */
export async function gradeChapterTestUpload(args: {
  user: AuthUser | null | undefined;
  paper: PersistedWorksheet;
  code: string;
  subject: SessionSubject;
  topicKey: string;
  objective: ObjectiveScore;
  subjectiveQuestions: PersistedWorksheetQuestion[];
  upload: { imageBase64: string; imageMimeType: string };
  /** GRADING-JOBS-1 J2 — grade as a background job (rows land one by one; resume after a reload). */
  job?: GradingJobOptions;
  /** GRADE-RESULT-COPY-1 - the page's stage listener, so a slow grade shows "Taking a little longer
   *  than usual - still checking..." instead of a frozen button. Optional and additive: absent = as before. */
  onStage?: PaidCallOptions["onStage"];
}): Promise<ChapterTestGradeOutcome> {
  const { user, paper, subject, topicKey, objective, subjectiveQuestions, upload } = args;
  // RECORD-SAFE-1: resolve the paper by identity - its record may have moved to a free code while no page was open
  const code = currentCodeForPaper(user, paper.worksheetId, "chapter-test", args.code);

  const qByNumber = new Map(subjectiveQuestions.map((q) => [q.qNumber, q]));
  const miOutcomes: ChapterTestMiOutcome[] = [];
  // J2b (D30-2): rows already recorded from the interruption this grade continues.
  const alreadyRecorded = recordedQNumbersOf(args.job?.continueFrom);

  /** ONE graded question → the MI front door + its score twin (the one per-question path). */
  const recordGraded = async (g: WorksheetQuestionGrade): Promise<void> => {
    const out = await recordChapterTestQuestion(user, paper.worksheetId, qByNumber.get(g.qNumber), g);
    if (out) miOutcomes.push(out);
  };

  let subjectiveResponse: WorksheetGradeResponse;
  try {
    subjectiveResponse = await gradeWorksheet({
    worksheetId: paper.worksheetId,
    subject: paper.subject,
    questions: subjectiveQuestions.map(chapterTestQuestionInput),
    imageBase64: upload.imageBase64,
    imageMimeType: upload.imageMimeType,
  }, { surface: "chapter-test", paperKey: paper.worksheetId, ...(args.onStage ? { onStage: args.onStage } : {}), ...(args.job ? { job: args.job } : {}) });
  } catch (err) {
    // J2b (D30-2) — an interrupted background grade: its FINAL graded rows are recorded now,
    // exactly as a normal graded row (same ids, so idempotent), then the interruption goes on
    // to the page ("Grade the remaining N"). No paper-level record: there are no totals (§6).
    try {
      for (const { row } of recordableInterruptedRows(err)) {
        if (alreadyRecorded.has(row.qNumber)) continue;
        // eslint-disable-next-line no-await-in-loop
        await recordGraded(row);
      }
    } catch (recordErr) {
      // A recording miss never hides the interruption from the student.
      console.warn("[chapterTestGradeService] interrupted-row record failed", recordErr);
    }
    throw err;
  }

  if (!subjectiveResponse.ok) return { ok: false, response: subjectiveResponse, miOutcomes: [] };

  // SCORECARD-MI-1 — ONE set of counts for every reader of this grade: no type on a
  // full-mark question (owner ruling).
  const response = withEffectiveCounts(buildChapterTestResponse({
    paper,
    objective,
    subjectiveQuestions,
    subjectiveResponse,
  }));

  // Cache the unified grade device-locally (same-session re-open); the durable
  // cross-device re-open reads the sessionRecords perQuestion payload written below.
  saveWorksheetGrade(paper.worksheetId, response);

  for (const g of withEffectiveCounts(subjectiveResponse).results) {
    // J2b (D30-2): a row recorded when the job was interrupted is not recorded twice.
    if (alreadyRecorded.has(g.qNumber)) continue;
    // eslint-disable-next-line no-await-in-loop
    await recordGraded(g);
  }

  // Overwrite the partial record with the FULL one (idempotent by id = code).
  let savedCode: string | undefined;
  try {
    const uid = user?.uid;
    if (uid && !user?.isLocalSession) {
      const record = buildChapterTestSessionRecord({ paper, code, subject, topicKey, response, uid });
      const written = await writeSessionRecordResolved(user, record);
      savedCode = written.code;
      noteFirstGraded(uid, written.record, "chapter_test"); // MEASURE-1 B — observe only
      writeSessionPerQuestion(user, {
        ref: written.record.perQuestionRef,
        code: written.code,
        worksheetId: paper.worksheetId,
        surface: "chapter-test",
        gradedAt: written.record.gradedAt,
        response,
      });
    }
  } catch (error) {
    console.warn("[chapterTestGradeService] full record write failed", error);
  }

  return { ok: true, response, miOutcomes, ...(savedCode ? { savedCode } : {}) };
}

export type BankMarkOutcome =
  | { kind: "marked"; response: WorksheetGradeResponse; savedCode?: string; record?: SessionRecord }
  | { kind: "unread" };

/**
 * MARK-ON-PHOTO-2 (owner rulings 25 Nov 2026) — "Mark it on your photo" on a Chapter Test result: ONE question of the paper is
 * graded from the ONE image the student pointed to (the per-question upload transport), with the SAME fields the paper sent
 * (chapterTestQuestionInput), under the paper's OWN worksheetId and paper pass (so it rides the paper's fair-use allowance and
 * its LIMITS-1 slot) and naming the question (X-Lazytopper-Mark-Q: the cap of 3). Synchronous, never a job.
 *
 * A row that comes back graded replaces the old one (services/markOnPhoto.ts adoptBankMark), is fed to Mistake Intelligence
 * ONCE on its stable id, and the paper is re-saved through the SAME save path as a fresh grade (device cache, the record under
 * the same code, its per-question payload rewritten whole). A row that comes back not graded changes nothing. Errors throw
 * (the page shows them in the dialog).
 */
export async function markChapterTestQuestion(args: {
  user: AuthUser | null | undefined;
  paper: PersistedWorksheet;
  code: string;
  subject: SessionSubject;
  topicKey: string;
  /** The unified result on screen (objective + written rows). */
  response: WorksheetGradeResponse;
  /** The row's index in `response.results`. */
  index: number;
  image: { imageBase64: string; imageMimeType: string };
}): Promise<BankMarkOutcome> {
  const { user, paper, subject, topicKey, response, index, image } = args;
  const row = response.results[index];
  const q = row ? paper.questions.find((x) => x.qNumber === row.qNumber) : undefined;
  if (!row || !q) return { kind: "unread" };
  const reply = await gradeWorksheet(
    {
      worksheetId: paper.worksheetId,
      subject: paper.subject,
      questions: [chapterTestQuestionInput(q)],
      uploads: [{ qNumber: q.qNumber, imageBase64: image.imageBase64, imageMimeType: image.imageMimeType }],
    },
    { surface: "chapter-test", paperKey: paper.worksheetId, markQ: q.qNumber },
  );
  const merged = adoptBankMark(response, index, reply);
  if (!merged) return { kind: "unread" };
  saveWorksheetGrade(paper.worksheetId, merged);
  try {
    await recordChapterTestQuestion(user, paper.worksheetId, q, merged.results[index]);
  } catch (e) {
    console.warn("[chapterTestGradeService] MI record for a marked answer failed (grade preserved)", e);
  }
  let savedCode: string | undefined;
  // The record as re-saved (S1): a re-opened scorecard reads its score, types and status from the RECORD, so the page swaps it in.
  let savedRecord: SessionRecord | undefined;
  try {
    const uid = user?.uid;
    if (uid && !user?.isLocalSession) {
      const code = currentCodeForPaper(user, paper.worksheetId, "chapter-test", args.code);
      const record = buildChapterTestSessionRecord({ paper, code, subject, topicKey, response: merged, uid });
      savedRecord = record;
      const written = await writeSessionRecordResolved(user, record);
      savedCode = written.code;
      savedRecord = written.record;
      writeSessionPerQuestion(user, {
        ref: written.record.perQuestionRef,
        code: written.code,
        worksheetId: paper.worksheetId,
        surface: "chapter-test",
        gradedAt: written.record.gradedAt,
        response: merged,
      });
    }
  } catch (error) {
    console.warn("[chapterTestGradeService] marked record write failed", error);
  }
  return { kind: "marked", response: merged, ...(savedCode ? { savedCode } : {}), ...(savedRecord ? { record: savedRecord } : {}) };
}
