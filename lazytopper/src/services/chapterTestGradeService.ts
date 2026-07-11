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
  buildChapterTestSessionRecord,
  writeSessionRecord,
  writeSessionPerQuestion,
  type SessionSubject,
} from "./sessionRecords";

/** Stable, surface-namespaced per-question id for MI dedup / idempotency — `ct:`
 *  so it never collides with the worksheet `ws:` namespace on the same bank id. */
export function chapterTestQuestionId(worksheetId: string, qNumber: number): string {
  return `ct:${worksheetId}:q${qNumber}`;
}

const norm = (s: string): string => String(s || "").trim().toLowerCase();

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
    const key = norm(q.answer || "");
    const correct = !!key && selected != null && norm(selected) === key;
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
    qNumber: r.qNumber,
    couldNotRead: false,
    ok: true,
    totalMarks: r.total,
    marksAwarded: r.awarded,
    percentage: r.total > 0 ? Math.round((r.awarded / r.total) * 100) : 0,
    annotatedSteps: [],
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: "",
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
    ...(subjectiveResponse ? subjectiveResponse.results : pendingSubjectiveRows(subjectiveQuestions)),
  ];
  const legible = rows.filter((r) => !r.couldNotRead);
  const gradedMarksAwarded = legible.reduce((s, r) => s + (Number(r.marksAwarded) || 0), 0);
  const gradedMarksTotal = legible.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0);
  return {
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
}): void {
  const { user, paper, code, subject, topicKey, response } = args;
  const uid = user?.uid;
  if (!uid || user?.isLocalSession) return;
  try {
    const record = buildChapterTestSessionRecord({ paper, code, subject, topicKey, response, uid });
    writeSessionRecord(user, record);
  } catch (error) {
    console.warn("[chapterTestGradeService] partial record write failed", error);
  }
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
}): Promise<ChapterTestGradeOutcome> {
  const { user, paper, code, subject, topicKey, objective, subjectiveQuestions, upload } = args;

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

  const response = buildChapterTestResponse({
    paper,
    objective,
    subjectiveQuestions,
    subjectiveResponse,
  });

  // Cache the unified grade device-locally (same-session re-open); the durable
  // cross-device re-open reads the sessionRecords perQuestion payload written below.
  saveWorksheetGrade(paper.worksheetId, response);

  const qByNumber = new Map(subjectiveQuestions.map((q) => [q.qNumber, q]));
  const miOutcomes: ChapterTestMiOutcome[] = [];
  for (const g of subjectiveResponse.results) {
    if (g.couldNotRead) continue; // honest pending — never feeds MI or a 0
    const q = qByNumber.get(g.qNumber);
    if (!q) continue;
    const csr = toCheckSolutionResponse(g);
    const questionId = chapterTestQuestionId(paper.worksheetId, g.qNumber);
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
      const record = buildChapterTestSessionRecord({ paper, code, subject, topicKey, response, uid });
      writeSessionRecord(user, record);
      writeSessionPerQuestion(user, {
        ref: record.perQuestionRef,
        code,
        worksheetId: paper.worksheetId,
        surface: "chapter-test",
        gradedAt: record.gradedAt,
        response,
      });
    }
  } catch (error) {
    console.warn("[chapterTestGradeService] full record write failed", error);
  }

  return { ok: true, response, miOutcomes };
}
