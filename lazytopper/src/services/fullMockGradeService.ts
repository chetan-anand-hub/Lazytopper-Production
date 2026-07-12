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

import type { AuthUser } from "../context/AuthContext";
import {
  gradeWorksheet,
  type CheckSolutionResponse,
  type WorksheetGradeResponse,
  type WorksheetQuestionGrade,
} from "../ai/aiClient";
import type { PersistedWorksheet, PersistedWorksheetQuestion } from "./worksheetSessionStore";
import { saveWorksheetGrade } from "./worksheetSessionStore";
import { recordMistake, type RecordMistakeOutcome } from "./mistakeIntelligence";
import { recordAttempt } from "./practiceInsights";
import {
  buildChapterTestResponse,
  type ObjectiveScore,
} from "./chapterTestGradeService";
import {
  buildFullMockSessionRecord,
  writeSessionRecord,
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
  return buildChapterTestResponse(args);
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
}): void {
  const { user, paper, code, subject, response, focus } = args;
  const uid = user?.uid;
  if (!uid || user?.isLocalSession) return;
  try {
    const record = buildFullMockSessionRecord({ paper, code, subject, response, uid, focus });
    writeSessionRecord(user, record);
  } catch (error) {
    console.warn("[fullMockGradeService] partial record write failed", error);
  }
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
}): Promise<FullMockGradeOutcome> {
  const { user, paper, code, subject, objective, subjectiveQuestions, upload, focus } = args;

  const subjectiveResponse = await gradeWorksheet({
    worksheetId: paper.worksheetId,
    subject: paper.subject,
    questions: subjectiveQuestions.map((q) => ({
      qNumber: q.qNumber,
      marks: q.marks,
      topic: q.topicLabel,
      topicLabel: q.topicLabel,
      questionText: q.questionText,
      section: q.section,
      answer: q.answer,
      options: q.options,
      solutionSteps: q.solutionSteps,
      finalAnswer: q.finalAnswer,
    })),
    imageBase64: upload.imageBase64,
    imageMimeType: upload.imageMimeType,
  });

  if (!subjectiveResponse.ok) return { ok: false, response: subjectiveResponse, miOutcomes: [] };

  const response = buildFullMockResponse({
    paper,
    objective,
    subjectiveQuestions,
    subjectiveResponse,
  });

  // Cache the unified grade device-locally (same-session re-open + graded PDF);
  // the durable cross-device re-open reads the perQuestion payload written below.
  saveWorksheetGrade(paper.worksheetId, response);

  const qByNumber = new Map(subjectiveQuestions.map((q) => [q.qNumber, q]));
  const miOutcomes: FullMockMiOutcome[] = [];
  for (const g of subjectiveResponse.results) {
    if (g.couldNotRead) continue; // honest pending — never feeds MI or a 0
    const q = qByNumber.get(g.qNumber);
    if (!q) continue;
    const csr = toCheckSolutionResponse(g);
    const questionId = fullMockQuestionId(paper.worksheetId, g.qNumber);
    // Sequential await: recordMistake reads+writes the device-local dedup list.
    // eslint-disable-next-line no-await-in-loop
    const rec = await recordMistake(user, csr, {
      subject: q.subject,
      topic: q.topicLabel,
      topicKey: q.topicKey,
      question: q.questionText,
      questionId,
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
    });
    miOutcomes.push({ qNumber: g.qNumber, mistakeOutcome: rec.outcome, bridged: rec.bridged });
  }

  // Overwrite the partial record with the FULL one (idempotent by id = code).
  try {
    const uid = user?.uid;
    if (uid && !user?.isLocalSession) {
      const record = buildFullMockSessionRecord({ paper, code, subject, response, uid, focus });
      writeSessionRecord(user, record);
      writeSessionPerQuestion(user, {
        ref: record.perQuestionRef,
        code,
        worksheetId: paper.worksheetId,
        surface: "full-mock",
        gradedAt: record.gradedAt,
        response,
      });
    }
  } catch (error) {
    console.warn("[fullMockGradeService] full record write failed", error);
  }

  return { ok: true, response, miOutcomes };
}
