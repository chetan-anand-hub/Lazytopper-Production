// src/services/fullMockGradeService.ts
//
// Full Mock — the two-phase grade orchestration: the FM twin of
// chapterTestGradeService (which stays byte-unchanged and LENDS its pure,
// exported pieces — `scoreObjectiveSection` + `buildChapterTestResponse` — so the
// objective 0-or-full invariant and the unified-response shape have ONE
// implementation, not a fork). The SAME sacred grader (gradeWorksheet →
// checkSolution.cjs, CALL-ONLY, byte-unchanged) and the SAME MI front door
// (recordMistake + recordAttempt), writing a surface:"full-mock" SessionRecord
// under an FM- code.
//
// Two phases (spec §5):
//   1. SUBMIT — Section A objective graded client-side, deterministic 0-OR-FULL
//      (PR-348 invariant). No MI from MCQs. A PARTIAL record is written so the
//      history panel + pending banner show the awaiting-sheet state immediately —
//      WITH the §8b focus aggregates (they are measured at submit, not upload).
//   2. UPLOAD — Sections B–E graded from ONE uploaded sheet through the shared
//      structured grader; each legible result feeds MI; the FULL record
//      overwrites the partial one (idempotent by id = code). Pending pages are
//      never folded into a 0. The upload may happen in a LATER session via the
//      pending banner's deep-link (same device — the paper is cached by
//      fullMockSession); the record id keeps it idempotent.

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
import { isGradedQuestion, v2GradeFields, withEffectiveCounts } from "../lib/mistakeDisplay";
import { conceptForBankQuestionId } from "./mistakeConcept";
import { recordAttempt } from "./practiceInsights";
import {
  buildChapterTestResponse,
  chapterTestQuestionInput,
  type BankMarkOutcome,
  type ObjectiveScore,
} from "./chapterTestGradeService";
import { adoptBankMark } from "./markOnPhoto";
import {
  buildFullMockSessionRecord,
  writeSessionRecordResolved,
  currentCodeForPaper,
  writeSessionPerQuestion,
  type SessionFocusAggregates,
  type SessionSubject,
} from "./sessionRecords";

/** Stable, surface-namespaced per-question id for MI dedup / idempotency — `fm:`
 *  so it never collides with the `ws:` / `ct:` namespaces on the same bank id. */
export function fullMockQuestionId(worksheetId: string, qNumber: number): string {
  return `fm:${worksheetId}:q${qNumber}`;
}

/**
 * Build the UNIFIED full-mock response: objective (graded at submit) + subjective
 * (graded after upload, else honest pending). Delegates to the exported, pure
 * `buildChapterTestResponse` — the shape is surface-agnostic (paper + objective +
 * subjective rows) and forking it would create a second source of truth.
 */
export function buildFullMockResponse(args: {
  paper: PersistedWorksheet;
  objective: ObjectiveScore;
  subjectiveQuestions: PersistedWorksheetQuestion[];
  subjectiveResponse: WorksheetGradeResponse | null;
}): WorksheetGradeResponse {
  // SCORECARD-SECTION-TYPE-1 - the CT builder stamps each row from the paper's bank fields; a Full Mock
  // paper drawn before those fields existed falls back to its blueprint slot (exact for a mock).
  return stampFromPaper(buildChapterTestResponse(args), args.paper.questions, { blueprintFallback: true });
}

/** Adapt one legible per-question grade into the CheckSolutionResponse shape the
 *  MI front door consumes — the same adaptation the worksheet / CT / C&I paths
 *  perform, so routing and dedup behave identically. */
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
 * pending) so the pending banner + history panel show "⏳ Awaiting sheet"
 * immediately, carrying the §8b focus aggregates measured during the sitting.
 * Idempotent by id = code. Honest-failure gated; best-effort (a persistence miss
 * never blocks the scorecard).
 */
export function writeFullMockPartialRecord(args: {
  user: AuthUser | null | undefined;
  paper: PersistedWorksheet;
  code: string;
  subject: SessionSubject;
  response: WorksheetGradeResponse;
  focus?: SessionFocusAggregates;
}): Promise<string> {
  const { user, paper, code, subject, response, focus } = args;
  const uid = user?.uid;
  if (!uid || user?.isLocalSession) return Promise.resolve(code);
  // RECORD-SAFE-1: the FINAL code is resolved once, before the write; the caller uses the returned code.
  return (async () => {
    try {
      const record = buildFullMockSessionRecord({ paper, code, subject, response, uid, focus });
      const written = await writeSessionRecordResolved(user, record);
      noteFirstGraded(uid, written.record, "full_mock"); // MEASURE-1 B — observe only
      return written.code;
    } catch (error) {
      console.warn("[fullMockGradeService] partial record write failed", error);
      return code;
    }
  })();
}

export interface FullMockMiOutcome {
  qNumber: number;
  mistakeOutcome: RecordMistakeOutcome;
  bridged: boolean;
}

export interface FullMockGradeOutcome {
  ok: boolean;
  /** The UNIFIED response (objective + subjective) on success; the failed
   *  subjective response (carrying `.error`) on failure. */
  response: WorksheetGradeResponse;
  miOutcomes: FullMockMiOutcome[];
  /** RECORD-SAFE-1: the code the full record was finally saved under (differs from the requested code only
   *  when that code belonged to another paper). */
  savedCode?: string;
}

/** ONE graded question → the MI front door + its score twin on its stable id (`fm:<worksheetId>:q<n>`): a re-upload or a mark
 *  on the photo REPLACES that question's entries. */
export async function recordFullMockQuestion(
  user: AuthUser | null | undefined,
  worksheetId: string,
  q: PersistedWorksheetQuestion | undefined,
  g: WorksheetQuestionGrade,
): Promise<FullMockMiOutcome | null> {
  // PR-2 — not graded (unreadable, option unread, answer does not match its question) feeds
  // nothing: no MI entry, no attempt, never a 0.
  if (!isGradedQuestion(g) || !q) return null;
  const csr = toCheckSolutionResponse(g);
  const questionId = fullMockQuestionId(worksheetId, g.qNumber);
  // Sequential await (callers loop): recordMistake reads+writes the device-local dedup list.
  const rec = await recordMistake(user, csr, {
    subject: q.subject,
    topic: q.topicLabel,
    topicKey: q.topicKey,
    question: q.questionText,
    questionId,
    // SCORECARD-MI-1 (D5) — stable identity: a re-upload of this paper REPLACES its entries.
    surface: "full-mock",
    submissionId: worksheetId,
    // MI-CONCEPT-1 — `questionId` above is the SYNTHETIC attempt id (`fm:…`), which
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
    surface: "full-mock",
    submissionId: worksheetId,
    grade: csr,
  });
  return { qNumber: g.qNumber, mistakeOutcome: rec.outcome, bridged: rec.bridged };
}

/**
 * Phase 2 — grade the uploaded answer sheet (Sections B–E) against the KNOWN
 * scheme in one structured call, feed each legible result through MI, then
 * overwrite the partial record with the FULL one (idempotent by id = code) plus
 * its perQuestion payload. ONLY subjective questions are sent — the objective
 * section was scored at submit and MCQs never carry working. Honest-failure gated.
 */
export async function gradeFullMockUpload(args: {
  user: AuthUser | null | undefined;
  paper: PersistedWorksheet;
  code: string;
  subject: SessionSubject;
  objective: ObjectiveScore;
  subjectiveQuestions: PersistedWorksheetQuestion[];
  upload: { imageBase64: string; imageMimeType: string };
  focus?: SessionFocusAggregates;
  /** GRADING-JOBS-1 J2 — grade as a background job (rows land one by one; resume after a reload). */
  job?: GradingJobOptions;
  /** GRADE-RESULT-COPY-1 - the page's stage listener, so a slow grade shows "Taking a little longer
   *  than usual - still checking..." instead of a frozen button. Optional and additive: absent = as before. */
  onStage?: PaidCallOptions["onStage"];
}): Promise<FullMockGradeOutcome> {
  const { user, paper, subject, objective, subjectiveQuestions, upload, focus } = args;
  // RECORD-SAFE-1: resolve the paper by identity - its record may have moved to a free code while no page was open
  const code = currentCodeForPaper(user, paper.worksheetId, "full-mock", args.code);

  const qByNumber = new Map(subjectiveQuestions.map((q) => [q.qNumber, q]));
  const miOutcomes: FullMockMiOutcome[] = [];
  // J2b (D30-2): rows already recorded from the interruption this grade continues.
  const alreadyRecorded = recordedQNumbersOf(args.job?.continueFrom);

  /** ONE graded question → the MI front door + its score twin (the one per-question path). */
  const recordGraded = async (g: WorksheetQuestionGrade): Promise<void> => {
    const out = await recordFullMockQuestion(user, paper.worksheetId, qByNumber.get(g.qNumber), g);
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
  }, { surface: "full-mock", paperKey: paper.worksheetId, ...(args.onStage ? { onStage: args.onStage } : {}), ...(args.job ? { job: args.job } : {}) });
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
      console.warn("[fullMockGradeService] interrupted-row record failed", recordErr);
    }
    throw err;
  }

  if (!subjectiveResponse.ok) return { ok: false, response: subjectiveResponse, miOutcomes: [] };

  // SCORECARD-MI-1 — ONE set of counts for every reader of this grade: no type on a
  // full-mark question (owner ruling).
  const response = withEffectiveCounts(buildFullMockResponse({
    paper,
    objective,
    subjectiveQuestions,
    subjectiveResponse,
  }));

  // Cache the unified grade device-locally (same-session re-open + graded PDF);
  // the durable cross-device re-open reads the perQuestion payload written below.
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
      const record = buildFullMockSessionRecord({ paper, code, subject, response, uid, focus });
      const written = await writeSessionRecordResolved(user, record);
      savedCode = written.code;
      noteFirstGraded(uid, written.record, "full_mock"); // MEASURE-1 B — observe only
      writeSessionPerQuestion(user, {
        ref: written.record.perQuestionRef,
        code: written.code,
        worksheetId: paper.worksheetId,
        surface: "full-mock",
        gradedAt: written.record.gradedAt,
        response,
      });
    }
  } catch (error) {
    console.warn("[fullMockGradeService] full record write failed", error);
  }

  return { ok: true, response, miOutcomes, ...(savedCode ? { savedCode } : {}) };
}

/**
 * MARK-ON-PHOTO-2 — "Mark it on your photo" on a Full Mock result: the Full Mock twin of chapterTestGradeService
 * markChapterTestQuestion (one question, the paper's own id + paper pass + X-Lazytopper-Mark-Q, synchronous; MI once on the
 * stable id; the SAME save path as a fresh grade, keeping the sitting's focus aggregates on the record).
 */
export async function markFullMockQuestion(args: {
  user: AuthUser | null | undefined;
  paper: PersistedWorksheet;
  code: string;
  subject: SessionSubject;
  response: WorksheetGradeResponse;
  index: number;
  image: { imageBase64: string; imageMimeType: string };
  focus?: SessionFocusAggregates;
}): Promise<BankMarkOutcome> {
  const { user, paper, subject, response, index, image, focus } = args;
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
    { surface: "full-mock", paperKey: paper.worksheetId, markQ: q.qNumber },
  );
  const merged = adoptBankMark(response, index, reply);
  if (!merged) return { kind: "unread" };
  saveWorksheetGrade(paper.worksheetId, merged);
  try {
    await recordFullMockQuestion(user, paper.worksheetId, q, merged.results[index]);
  } catch (e) {
    console.warn("[fullMockGradeService] MI record for a marked answer failed (grade preserved)", e);
  }
  let savedCode: string | undefined;
  try {
    const uid = user?.uid;
    if (uid && !user?.isLocalSession) {
      const code = currentCodeForPaper(user, paper.worksheetId, "full-mock", args.code);
      const record = buildFullMockSessionRecord({ paper, code, subject, response: merged, uid, focus });
      const written = await writeSessionRecordResolved(user, record);
      savedCode = written.code;
      writeSessionPerQuestion(user, {
        ref: written.record.perQuestionRef,
        code: written.code,
        worksheetId: paper.worksheetId,
        surface: "full-mock",
        gradedAt: written.record.gradedAt,
        response: merged,
      });
    }
  } catch (error) {
    console.warn("[fullMockGradeService] marked record write failed", error);
  }
  return { kind: "marked", response: merged, ...(savedCode ? { savedCode } : {}) };
}
