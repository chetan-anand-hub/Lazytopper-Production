// src/services/worksheetGradeService.ts
//
// PR-E2b — the worksheet grade-loop orchestration (client side of the one-PDF
// structured grade). It is the seam between the persisted worksheet and the two
// shared moats:
//   1. the surface-agnostic structured grader (POST /api/grade-worksheet), and
//   2. Mistake Intelligence (the SINGLE front door `recordMistake`, + its score
//      twin `recordAttempt`).
//
// Responsibilities (kept out of the React component so they are unit-testable):
//   • build the grade request from a PersistedWorksheet (the caller owns the
//     getWorksheetSession fetch; this just maps it to the grader's input shape);
//   • persist the grade result by worksheetId so the student can revisit it;
//   • fan each LEGIBLE per-question result through `recordMistake` + `recordAttempt`
//     using a STABLE, worksheet-scoped questionId — so a re-upload that produces
//     the same result is deduped (idempotency) and weak-areas never double-count.
//
// MI routing itself (conceptual/calculation → weak-area; silly/presentation →
// careless insight) lives INSIDE recordMistake, derived from each result's
// per-step mistakeType — exactly as the wired Check & Improve path derives it.
// This module never writes an MI store directly and never re-classifies.

import { noteFirstGraded } from "../analytics/firstGraded";
import type { AuthUser } from "../context/AuthContext";
import {
  gradeWorksheet,
  type CheckSolutionResponse,
  type PaidCallOptions,
  type WorksheetGradeResponse,
  type WorksheetQuestionGrade,
} from "../ai/aiClient";
import type { PersistedWorksheet } from "./worksheetSessionStore";
import { recordableInterruptedRows, recordedQNumbersOf } from "../ai/gradingJobRecords";
import { stampFromPaper } from "../components/results/sectionTypeLens";
import { saveWorksheetGrade, listStoredWorksheetsLite } from "./worksheetSessionStore";
import { recordMistake, type RecordMistakeOutcome } from "./mistakeIntelligence";
import { isGradedQuestion, v2GradeFields, withEffectiveCounts } from "../lib/mistakeDisplay";
import { conceptForBankQuestionId } from "./mistakeConcept";
import { adoptBankMark } from "./markOnPhoto";
import { recordAttempt } from "./practiceInsights";
import {
  ensureWorksheetSessionCode,
  writeSessionRecord,
  writeSessionPerQuestion,
  buildWorksheetSessionRecord,
} from "./sessionRecords";

/**
 * Stable per-question id for MI dedup / idempotency. STABLE across re-grades of
 * the SAME worksheet (so a re-upload with the same result is deduped) and
 * namespaced (`ws:`) so it never collides with another surface's question id.
 */
export function worksheetQuestionId(worksheetId: string, qNumber: number): string {
  return `ws:${worksheetId}:q${qNumber}`;
}

export interface WorksheetMiOutcome {
  qNumber: number;
  mistakeOutcome: RecordMistakeOutcome;
  /** Whether a weak-area (knowledge-gap) signal was written for this question. */
  bridged: boolean;
}

export interface WorksheetGradeOutcome {
  response: WorksheetGradeResponse;
  miOutcomes: WorksheetMiOutcome[];
  /** PR-1 — the DURABLE session code/name minted for this completed grade
   *  (`WS-{S}-{TOPIC}-{NN}`), so the scorecard + graded PDF can show the SAME
   *  cross-device id the persisted session record carries. Absent when signed out /
   *  local (no durable identity) or if code minting failed. */
  sessionCode?: string;
  sessionName?: string;
}

/** Adapt one legible per-question grade into the CheckSolutionResponse shape the
 *  MI front door consumes — the SAME shape Check & Improve feeds it, so routing
 *  and dedup behave identically. */
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

/** The ONE question of a worksheet as the grader is sent it — the SAME fields for the whole sheet and for a mark on the photo
 *  (MARK-ON-PHOTO-2). */
export function worksheetQuestionInput(q: PersistedWorksheet["questions"][number]) {
  return {
    qNumber: q.qNumber,
    marks: q.marks,
    topic: q.topicLabel,
    topicLabel: q.topicLabel,
    questionText: q.questionText,
    // Objective signals for the server's deterministic 0/full clamp + honesty guard.
    // `section` ("A" for MCQ/AR) classifies the question; `answer` is the canonical
    // bank answer key — the correct OPTION TEXT — and `options` is the option list,
    // so the server can bridge a letter pick to that text and score the MCQ
    // deterministically (0 or full, never fractional). All three are declared on
    // PersistedWorksheetQuestion, so this read is type-checked. This REPLACES the old
    // `correctOption` cast (`as unknown as`), which asserted a field the canonical /
    // persisted type never declares and so resolved to `undefined` for every real
    // bank MCQ — leaving the server's objective guard dead code.
    section: q.section,
    answer: q.answer,
    options: q.options,
    solutionSteps: q.solutionSteps,
    finalAnswer: q.finalAnswer,
  };
}

/** ONE graded question → the MI front door + its score twin, on its stable id (`ws:<worksheetId>:q<n>`): a re-upload or a mark
 *  on the photo REPLACES that question's entries. */
export async function recordWorksheetQuestion(
  user: AuthUser | null | undefined,
  worksheetId: string,
  q: PersistedWorksheet["questions"][number] | undefined,
  g: WorksheetQuestionGrade,
): Promise<WorksheetMiOutcome | null> {
  // PR-2 — not graded (unreadable, option unread, answer does not match its question) feeds
  // nothing: no MI entry, no attempt, never a 0.
  if (!isGradedQuestion(g) || !q) return null;

  const csr = toCheckSolutionResponse(g);
  const questionId = worksheetQuestionId(worksheetId, g.qNumber);

  // Sequential await: recordMistake reads+writes the device-local dedup list, so
  // grading question-by-question avoids a race on that list (and keeps the
  // existing front-door dedup the single idempotency layer — we add none).
  const rec = await recordMistake(user, csr, {
    subject: q.subject,
    topic: q.topicLabel,
    topicKey: q.topicKey,
    question: q.questionText,
    questionId,
    // SCORECARD-MI-1 (D5) — stable identity: a re-upload of this worksheet REPLACES its
    // entries; it never adds a second one per question.
    surface: "worksheet",
    submissionId: worksheetId,
    // MI-CONCEPT-1 — `questionId` above is the SYNTHETIC attempt id (`ws:…`), which
    // is not a bank id and cannot resolve. The BANK id is `q.id` on the persisted
    // question, so resolve here and hand the concept to the front door. Unresolvable
    // (withheld / deleted) → undefined, and the entry carries no concept.
    concept: conceptForBankQuestionId(q.id),
  });

  // Score-twin of the mistake door: every graded answer (full marks included)
  // is also an attempt, so worksheet scores feed accuracy / Me. H1 (owner ruling
  // 2026-10-05, re-grade replaces): keyed on the SAME submission identity as the MI entry,
  // so a re-upload of this worksheet REPLACES the attempt (latest wins), whatever the score.
  recordAttempt(user, {
    subject: q.subject,
    topic: q.topicLabel,
    topicKey: q.topicKey,
    question: q.questionText,
    questionId,
    marksScored: csr.marksAwarded,
    marksAvailable: csr.totalMarks,
    mode: "graded",
    surface: "worksheet",
    submissionId: worksheetId,
    grade: csr,
  });

  return { qNumber: g.qNumber, mistakeOutcome: rec.outcome, bridged: rec.bridged };
}

/**
 * THE record save of a graded worksheet — ONE seam for a fresh grade and a mark on the photo (MARK-ON-PHOTO-2): the record,
 * the first-graded report, and its per-question payload rewritten whole.
 */
function writeWorksheetRecord(
  user: AuthUser,
  uid: string,
  record: ReturnType<typeof buildWorksheetSessionRecord>,
  code: string,
  worksheetId: string,
  response: WorksheetGradeResponse,
): void {
  writeSessionRecord(user, record);
  noteFirstGraded(uid, record, "worksheet"); // MEASURE-1 B — observe only
  writeSessionPerQuestion(user, {
    ref: record.perQuestionRef,
    code,
    worksheetId,
    surface: "worksheet",
    gradedAt: record.gradedAt,
    response,
  });
}

/**
 * Grade an uploaded answer-PDF against a persisted worksheet, persist the result,
 * and feed Mistake Intelligence. The grade call maps the upload Q1…QN to the
 * KNOWN scheme (never blind-segmented); pending (couldNotRead) questions are
 * skipped for MI entirely — never fabricated into a mistake or a zero.
 */
export async function gradeWorksheetAndRecord(
  user: AuthUser | null | undefined,
  worksheet: PersistedWorksheet,
  upload: { imageBase64: string; imageMimeType: string },
  /** LOW-END-1 R2: the panel's stage listener (Uploading NN% -> Sent ✓ -> Grading… -> Done). */
  opts?: { onStage?: PaidCallOptions["onStage"]; job?: PaidCallOptions["job"] },
): Promise<WorksheetGradeOutcome> {
  const qByNumber = new Map(worksheet.questions.map((q) => [q.qNumber, q]));
  const miOutcomes: WorksheetMiOutcome[] = [];
  // J2b (D30-2): rows already recorded from the interruption this grade continues.
  const alreadyRecorded = recordedQNumbersOf(opts?.job?.continueFrom);

  /** ONE graded question → the MI front door + its score twin (the one per-question path). */
  const recordGraded = async (g: WorksheetQuestionGrade): Promise<void> => {
    const out = await recordWorksheetQuestion(user, worksheet.worksheetId, qByNumber.get(g.qNumber), g);
    if (out) miOutcomes.push(out);
  };


  let rawResponse: WorksheetGradeResponse;
  try {
    rawResponse = await gradeWorksheet({
    worksheetId: worksheet.worksheetId,
    subject: worksheet.subject,
    questions: worksheet.questions.map(worksheetQuestionInput),
    imageBase64: upload.imageBase64,
    imageMimeType: upload.imageMimeType,
  }, {
    surface: "worksheet",
    paperKey: worksheet.worksheetId,
    ...(opts?.onStage ? { onStage: opts.onStage } : {}),
    // GRADING-JOBS-1 J2 — a background job when the panel opted in (rows land one by one).
    ...(opts?.job ? { job: opts.job } : {}),
  });
  } catch (err) {
    // J2b (D30-2) — an interrupted background grade: its FINAL graded rows are recorded now,
    // exactly as a normal graded row (same ids, so idempotent), then the interruption goes on
    // to the panel ("Grade the remaining N"). No paper-level record: there are no totals (§6).
    try {
      for (const { row } of recordableInterruptedRows(err)) {
        if (alreadyRecorded.has(row.qNumber)) continue;
        // eslint-disable-next-line no-await-in-loop
        await recordGraded(row);
      }
    } catch (recordErr) {
      // A recording miss never hides the interruption from the student.
      console.warn("[worksheetGradeService] interrupted-row record failed", recordErr);
    }
    throw err;
  }

  if (!rawResponse.ok) return { response: rawResponse, miOutcomes: [] };
  // SCORECARD-MI-1 — ONE set of counts for every reader of this grade (scorecard, PDF,
  // session record, MI): no type on a full-mark question (owner ruling).
  // SCORECARD-SECTION-TYPE-1 - stamp each row with its bank section and question type (display only).
  const response = stampFromPaper(withEffectiveCounts(rawResponse), worksheet.questions, { blueprintFallback: true });

  // Persist so the student can revisit the grade later.
  saveWorksheetGrade(worksheet.worksheetId, response);

  for (const g of response.results) {
    // J2b (D30-2): a row recorded when the job was interrupted is not recorded twice.
    if (alreadyRecorded.has(g.qNumber)) continue;
    // eslint-disable-next-line no-await-in-loop
    await recordGraded(g);
  }

  // ── Progress-Journey PR-1: write ONE durable session record ────────────────
  // The connectivity spine every progress surface reads. Mint the DURABLE code
  // (cross-device #NN from sessionRecords, frozen once), then persist the record +
  // the per-question payload the `perQuestionRef` points at. Idempotent (id = code)
  // and honest-failure gated inside the store (no record for a signed-out / local
  // session). Best-effort: a persistence miss NEVER breaks the grade UX.
  let sessionCode: string | undefined;
  let sessionName: string | undefined;
  try {
    const nomen = await ensureWorksheetSessionCode(worksheet, user, listStoredWorksheetsLite());
    sessionCode = nomen.code;
    sessionName = nomen.name;

    const uid = user?.uid;
    if (uid && !user?.isLocalSession) {
      writeWorksheetRecord(user, uid, buildWorksheetSessionRecord(worksheet, response, nomen, uid), nomen.code, worksheet.worksheetId, response);
    }
  } catch (error) {
    console.warn("[worksheetGradeService] session record write failed", error);
  }

  return { response, miOutcomes, sessionCode, sessionName };
}

/**
 * MARK-ON-PHOTO-2 — "Mark it on your photo" on a Worksheet result: ONE question graded from the ONE image the student pointed
 * to, with the SAME fields the worksheet sent (worksheetQuestionInput), under the worksheet's OWN id and paper pass (its
 * fair-use allowance and LIMITS-1 slot) and naming the question (X-Lazytopper-Mark-Q: the cap of 3). Synchronous, never a job.
 * A graded row replaces the old one, is fed to MI once on its stable id, and the worksheet is re-saved through the SAME save
 * path as a fresh grade (device cache, the record under the same code, its per-question payload rewritten whole).
 */
export async function markWorksheetQuestion(args: {
  user: AuthUser | null | undefined;
  worksheet: PersistedWorksheet;
  response: WorksheetGradeResponse;
  index: number;
  image: { imageBase64: string; imageMimeType: string };
}): Promise<{ kind: "marked"; response: WorksheetGradeResponse; sessionCode?: string; sessionName?: string } | { kind: "unread" }> {
  const { user, worksheet, response, index, image } = args;
  const row = response.results[index];
  const q = row ? worksheet.questions.find((x) => x.qNumber === row.qNumber) : undefined;
  if (!row || !q) return { kind: "unread" };
  const reply = await gradeWorksheet(
    {
      worksheetId: worksheet.worksheetId,
      subject: worksheet.subject,
      questions: [worksheetQuestionInput(q)],
      uploads: [{ qNumber: q.qNumber, imageBase64: image.imageBase64, imageMimeType: image.imageMimeType }],
    },
    { surface: "worksheet", paperKey: worksheet.worksheetId, markQ: q.qNumber },
  );
  const adopted = adoptBankMark(response, index, reply);
  if (!adopted) return { kind: "unread" };
  // The same lens stamp a fresh grade carries (section / type), so the scorecard reads the marked row like the others.
  const merged = stampFromPaper(adopted, worksheet.questions, { blueprintFallback: true });
  saveWorksheetGrade(worksheet.worksheetId, merged);
  try {
    await recordWorksheetQuestion(user, worksheet.worksheetId, q, merged.results[index]);
  } catch (e) {
    console.warn("[worksheetGradeService] MI record for a marked answer failed (grade preserved)", e);
  }
  let sessionCode: string | undefined;
  let sessionName: string | undefined;
  try {
    const nomen = await ensureWorksheetSessionCode(worksheet, user, listStoredWorksheetsLite());
    sessionCode = nomen.code;
    sessionName = nomen.name;
    const uid = user?.uid;
    if (uid && !user?.isLocalSession) {
      writeWorksheetRecord(user, uid, buildWorksheetSessionRecord(worksheet, merged, nomen, uid), nomen.code, worksheet.worksheetId, merged);
    }
  } catch (error) {
    console.warn("[worksheetGradeService] marked record write failed", error);
  }
  return { kind: "marked", response: merged, ...(sessionCode ? { sessionCode, sessionName } : {}) };
}
