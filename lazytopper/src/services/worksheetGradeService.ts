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

import type { AuthUser } from "../context/AuthContext";
import {
  gradeWorksheet,
  type CheckSolutionResponse,
  type WorksheetGradeResponse,
  type WorksheetQuestionGrade,
} from "../ai/aiClient";
import type { PersistedWorksheet } from "./worksheetSessionStore";
import { saveWorksheetGrade, listStoredWorksheetsLite } from "./worksheetSessionStore";
import { recordMistake, type RecordMistakeOutcome } from "./mistakeIntelligence";
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
  };
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
): Promise<WorksheetGradeOutcome> {
  const response = await gradeWorksheet({
    worksheetId: worksheet.worksheetId,
    subject: worksheet.subject,
    questions: worksheet.questions.map((q) => ({
      qNumber: q.qNumber,
      marks: q.marks,
      topic: q.topicLabel,
      topicLabel: q.topicLabel,
      questionText: q.questionText,
      // Carry the section so the server can deterministically treat a wrong
      // objective answer (MCQ / AR / Section A) as attempt-only, never a
      // fabricated mistake type. Additive — no other field changes.
      section: q.section,
      // Deterministic MCQ scoring: carry the correct option letter when the bank
      // has it. The server compares it against the student's chosen option.
      // `q` is typed as the canonical question — correctOption is an optional
      // addition not yet in the shared type; cast safely.
      correctOption: (q as unknown as { correctOption?: string }).correctOption,
      solutionSteps: q.solutionSteps,
      finalAnswer: q.finalAnswer,
    })),
    imageBase64: upload.imageBase64,
    imageMimeType: upload.imageMimeType,
  });

  if (!response.ok) return { response, miOutcomes: [] };

  // Persist so the student can revisit the grade later.
  saveWorksheetGrade(worksheet.worksheetId, response);

  const qByNumber = new Map(worksheet.questions.map((q) => [q.qNumber, q]));
  const miOutcomes: WorksheetMiOutcome[] = [];

  for (const g of response.results) {
    if (g.couldNotRead) continue; // honest pending — never feeds MI
    const q = qByNumber.get(g.qNumber);
    if (!q) continue;

    const csr = toCheckSolutionResponse(g);
    const questionId = worksheetQuestionId(worksheet.worksheetId, g.qNumber);

    // Sequential await: recordMistake reads+writes the device-local dedup list, so
    // grading question-by-question avoids a race on that list (and keeps the
    // existing front-door dedup the single idempotency layer — we add none).
    // eslint-disable-next-line no-await-in-loop
    const rec = await recordMistake(user, csr, {
      subject: q.subject,
      topic: q.topicLabel,
      topicKey: q.topicKey,
      question: q.questionText,
      questionId,
    });

    // Score-twin of the mistake door: every graded answer (full marks included)
    // is also an attempt, so worksheet scores feed accuracy / Me. Deduped on the
    // same stable id, so a re-grade with the same score never double-counts.
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
      const record = buildWorksheetSessionRecord(worksheet, response, nomen, uid);
      writeSessionRecord(user, record);
      writeSessionPerQuestion(user, {
        ref: record.perQuestionRef,
        code: nomen.code,
        worksheetId: worksheet.worksheetId,
        surface: "worksheet",
        gradedAt: record.gradedAt,
        response,
      });
    }
  } catch (error) {
    console.warn("[worksheetGradeService] session record write failed", error);
  }

  return { response, miOutcomes, sessionCode, sessionName };
}
