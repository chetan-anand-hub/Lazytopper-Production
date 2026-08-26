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
import {
  gradeWorksheet,
  type CheckSolutionResponse,
  type WorksheetGradeQuestionInput,
  type WorksheetGradeResponse,
  type WorksheetGradeUpload,
  type WorksheetQuestionGrade,
} from "../ai/aiClient";
import { MAX_BATCH_UPLOADS } from "../config/gradingLimits";
// ★ IMPORT ONLY. `lib/objectiveScoring.ts` is the TS twin of the server's
// `objectiveScoring.cjs`, pinned to it by a parity unit test. Quick Practice scores its
// own objective questions through THIS function rather than a local re-implementation,
// so the client and the server cannot drift on what "correct" means. Never fork it.
import { scoreObjective } from "../lib/objectiveScoring";
import { recordAttempt, type PracticeAttempt } from "./practiceInsights";
import { recordMistake, type RecordMistakeOutcome } from "./mistakeIntelligence";
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

/* ══════════════════════════════════════════════════════════════════════════════
   BATCH-1b · THE COLLECT-AND-BATCH GRADE (the first caller of BATCH-1 / #578)
   ══════════════════════════════════════════════════════════════════════════════
   #578 taught the surface-agnostic structured grader (`gradeStructuredSet`, reached
   over POST /api/grade-worksheet) to accept PER-QUESTION answer images: each image is
   sent as its own part IMMEDIATELY after its own question's block, so the model is
   never asked to FIND "Q6" inside a document. Until this module nothing in the product
   had ever sent an `uploads` array — the capability shipped and sat unreachable.

   WHAT THIS ADDS: the client half. Answers accumulate as the student works, and at
   finish ONE call grades every answer that carries WRITTEN WORKING, in place of the
   N per-question calls Quick Practice issues today.

   ★★ INCLUSION IS BY WORKING, NEVER BY QUESTION TYPE. `classifyQuickPracticeAnswer`
   inspects what the student PRODUCED, never `section`/`format`/`objective`:
     · picked an option and nothing else       → scored LOCALLY, no API call, free;
     · picked an option AND showed working     → BATCHED (the working is real, and it
                                                 is what a mistake type is diagnosed
                                                 from — the mark stays the 0/1 clamp
                                                 the server already applies);
     · wrote/photographed a subjective answer  → BATCHED;
     · nothing at all                          → omitted (see this module's header —
                                                 an unattempted question is never a 0).
   Deciding by type is the defect: a student who shows working for an MCQ has produced
   real evidence, and a Section-C question they skipped has produced none.

   ★★ THE 1-MARKER RULING STANDS. A 1-mark Section-A item is 0/1 binary always — CBSE
   does not step-mark 1-markers. Nothing here awards a fraction: the server's
   deterministic objective clamp is untouched and this module never re-scores. Working
   photographed on a 1-marker serves MISTAKE DIAGNOSIS only, never the mark.

   ★★ WHAT THIS MODULE DELIBERATELY DOES NOT DO. It issues the call and shapes the
   result; it does not decide WHEN. Nothing in `lazytopper/src/` invokes
   `gradeQuickPracticeBatch` yet — the accumulate-and-finish trigger lives in
   PracticePage's grade loop, which is a later lane's file. Until that lane lands this
   is a REACHABLE-BUT-UNCALLED seam, and saying so in the header is deliberate: an
   unmounted capability that reads as shipped is exactly how #578 lay dead for four
   days. Do not read this comment as "wired".
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * ONE displayed question plus whatever the student actually produced for it, as the
 * page holds it at finish. The bank fields (marks/section/answer/options/…) are
 * passed straight through to the grader's question input — this module never invents
 * one and never re-derives a mark scale.
 */
export interface QuickPracticeSavedAnswer {
  /** The real bank question id (the seen-set key and the `QuickPracticeEntry` key). */
  questionId: string;
  /** 1-based position in the DISPLAYED set. This is the grader's `qNumber` and the
   *  ONLY join key in the reply, so it must be the displayed position — the same
   *  index `buildQuickPracticeResponse` uses — not a position in the attempted subset. */
  qNumber: number;
  marks: number;
  questionText: string;
  topicLabel?: string;
  /** The canonical topic key for this question, forwarded VERBATIM to the Mistake
   *  Intelligence front door. ★ Never re-derived here: `recordAttempt` stores
   *  `resolveCanonicalSlug(...) || topicLabel`, and a second resolution on this side
   *  would be a second vocabulary ([FU-PROG-TOPIC-KEY-MISMATCH]). */
  topicKey?: string | null;
  /** Objective signals, forwarded verbatim so the SERVER's deterministic 0/full clamp
   *  governs an MCQ's mark. Nothing in this module branches on them. */
  section?: string;
  format?: string;
  qType?: string;
  answer?: string | null;
  options?: string[] | null;
  objective?: boolean;
  solutionSteps?: string[] | null;
  finalAnswer?: string | null;
  /** The option the student picked, if they picked one. */
  pickedOption?: string | null;
  /** Whether that pick was correct — the page compares locally against the bank key,
   *  which is why a bare pick costs nothing. Null/undefined when nothing was picked. */
  pickedCorrect?: boolean | null;
  /** A photograph of this question's working. Photographed OR typed working puts a
   *  question in the batch — see `classifyQuickPracticeAnswer`. */
  imageBase64?: string | null;
  imageMimeType?: string | null;
  /** Typed working. ★★ AMEND-621 — this now RIDES THE BATCH. `WorksheetGradeQuestionInput`
   *  gained a `textAnswer` field in TYPED-1 (#625) and `blockFor()` emits it inside the
   *  question's own block, so typed working reaches the grader with no image at all.
   *  ★ Typed and photographed are not exclusive: an answer may carry both. */
  textAnswer?: string | null;
}

/**
 * What is to be done with one saved answer. Three dispositions.
 *
 * · `batch`     — working was PRODUCED (photographed or typed) → it rides the ONE
 *                 batched call. ★ AMEND-621: typed-only working is included. Before it,
 *                 typed working returned a fourth disposition `typed-no-channel`,
 *                 because `gradeWorksheet` had no field to carry it. TYPED-1 (#625)
 *                 added `WorksheetGradeQuestionInput.textAnswer` and the server's
 *                 `blockFor()` emission, so the channel exists and this opens it.
 *                 The disposition is GONE rather than kept unreachable — a branch
 *                 nothing can reach is a silent no-op that reads as coverage.
 * · `local-mcq` — a bare option pick, no working → scored locally, no API call.
 * · `skipped`   — nothing produced → omitted from the record entirely.
 */
export type QuickPracticeAnswerDisposition = "batch" | "local-mcq" | "skipped";

const nonEmpty = (v: string | null | undefined): boolean => String(v ?? "").trim().length > 0;

/**
 * PURE. Decide one answer's disposition FROM THE WORKING THE STUDENT PRODUCED.
 *
 * ★ Nothing here reads `section`, `format`, `qType` or `objective`. That is the whole
 * contract: an MCQ with working is batched and an untouched subjective question is not.
 */
export function classifyQuickPracticeAnswer(answer: QuickPracticeSavedAnswer): QuickPracticeAnswerDisposition {
  // ★★ AMEND-621 — PHOTOGRAPHED **OR TYPED**. The second half of this condition is the
  // whole client change: it replaced `if (nonEmpty(answer.textAnswer)) return
  // "typed-no-channel";`, which short-circuited typed working into an ungraded state
  // BEFORE it could reach the batch. TYPED-1 (#625) built the channel; this opens it.
  if (nonEmpty(answer.imageBase64) || nonEmpty(answer.textAnswer)) return "batch";
  if (nonEmpty(answer.pickedOption)) return "local-mcq";
  return "skipped";
}

export interface QuickPracticeBatchSelection {
  batch: QuickPracticeSavedAnswer[];
  localMcq: QuickPracticeSavedAnswer[];
  skipped: QuickPracticeSavedAnswer[];
  /** ★★ Answers whose working WOULD be batched but which carry the 13th (or later)
   *  answer PHOTO of the session. `MAX_BATCH_UPLOADS` is the server's cap and above it
   *  `/api/grade-worksheet` returns 400 and grades NOTHING — so without this bucket a
   *  13-photo session gets a bare error at the end and loses the other twelve grades.
   *
   *  ⚠ A COURTESY, NEVER THE GUARD. The server keeps its own 400 (`checkSolution.cjs`,
   *  pinned by `checkSolution.test.cjs` §7.13); a stale client, or one that is not ours,
   *  is still refused. This exists so the student is TOLD, and by name.
   *
   *  ★ TYPED WORKING COSTS NO UPLOAD BUDGET — the cap counts `uploads`, and typed
   *  working rides inside its question's text block. A typed-only answer is never
   *  excluded here however many photos the session carries. */
  overCap: QuickPracticeSavedAnswer[];
}

/** PURE. Partition a finished session's saved answers by disposition, preserving
 *  displayed order within each bucket, and hold the batch inside the server's own
 *  upload cap. */
export function selectQuickPracticeBatch(answers: QuickPracticeSavedAnswer[]): QuickPracticeBatchSelection {
  const selection: QuickPracticeBatchSelection = { batch: [], localMcq: [], skipped: [], overCap: [] };
  let uploadsTaken = 0;
  for (const answer of answers) {
    switch (classifyQuickPracticeAnswer(answer)) {
      case "batch": {
        // Only a PHOTO consumes the cap. Typed working is carried in the question's own
        // text block and adds no `uploads` entry, so it can never be capped out.
        if (nonEmpty(answer.imageBase64)) {
          if (uploadsTaken >= MAX_BATCH_UPLOADS) {
            selection.overCap.push(answer);
            break;
          }
          uploadsTaken += 1;
        }
        selection.batch.push(answer);
        break;
      }
      case "local-mcq":
        selection.localMcq.push(answer);
        break;
      default:
        selection.skipped.push(answer);
    }
  }
  return selection;
}

/** PURE. The grader's question input for one batched answer — a straight passthrough
 *  of the bank fields, so the server sees exactly what the worksheet path sees. */
export function buildBatchQuestionInput(answer: QuickPracticeSavedAnswer): WorksheetGradeQuestionInput {
  const input: WorksheetGradeQuestionInput = {
    qNumber: answer.qNumber,
    marks: Number(answer.marks) || 1,
    questionText: String(answer.questionText || ""),
  };
  if (nonEmpty(answer.topicLabel)) input.topicLabel = String(answer.topicLabel);
  if (nonEmpty(answer.section)) input.section = String(answer.section);
  if (answer.answer != null && nonEmpty(answer.answer)) input.answer = String(answer.answer);
  if (Array.isArray(answer.options) && answer.options.length > 0) input.options = answer.options.map(String);
  if (answer.objective === true) input.objective = true;
  if (Array.isArray(answer.solutionSteps) && answer.solutionSteps.length > 0) {
    input.solutionSteps = answer.solutionSteps.map(String);
  }
  if (answer.finalAnswer != null && nonEmpty(answer.finalAnswer)) input.finalAnswer = String(answer.finalAnswer);
  // ★★ AMEND-621 · THE CHANNEL, OPENED. TYPED-1 (#625) added this field and the server
  // emission behind it; this line is what actually SENDS a student's typed working.
  // Conditional on purpose: an absent/blank value omits the key entirely, which is what
  // keeps #578's byte-identical no-typed-answer prompt (and its sha256 pin) intact for
  // every existing caller.
  if (nonEmpty(answer.textAnswer)) input.textAnswer = String(answer.textAnswer).trim();
  // ★★★ THE STUDENT'S ANSWER, SENT TO THE THING THAT MARKS IT. Before this line the
  // grader received the question, the scheme and the working and NEVER the pick, so its
  // verdict on an MCQ judged the WORKING — a correct option with one flawed working line
  // scored 0 / 1. Conditional for the same reason `textAnswer` is: an absent/blank pick
  // omits the key entirely, which keeps #578's byte-identical prompt (and its sha256 pin,
  // checkSolution.test.cjs §7.1) intact for every caller that records no pick.
  // ⚠ DIAGNOSIS ONLY — `applyLocalObjectiveMark` below, never this, decides the mark.
  if (nonEmpty(answer.pickedOption)) input.pickedOption = String(answer.pickedOption).trim();
  return input;
}

/** PURE. Map ONE structured per-question grade onto the `CheckSolutionResponse` shape
 *  `QuickPracticeEntry.graded` carries. Numbers pass through untouched — this never
 *  re-scores, never clamps and never fills a blank with a 0.
 *
 *  Returns null for a `couldNotRead` result: the grader could not read that answer, so
 *  there is no grade. Scoring it 0 would be the fabrication (this module's header). */
export function batchGradeToCheckSolution(grade: WorksheetQuestionGrade): CheckSolutionResponse | null {
  if (grade.couldNotRead) return null;
  const totalMarks = Number(grade.totalMarks) || 0;
  const marksAwarded = Number(grade.marksAwarded) || 0;
  return {
    ok: true,
    totalMarks,
    marksAwarded,
    percentage:
      Number.isFinite(Number(grade.percentage)) && grade.percentage != null
        ? Number(grade.percentage)
        : totalMarks > 0
          ? Math.round((marksAwarded / totalMarks) * 100)
          : 0,
    annotatedSteps: grade.annotatedSteps ?? [],
    mistakeSummary: grade.mistakeSummary ?? { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: grade.teacherNote ?? "",
    ...(grade.objective === true ? { objective: true } : {}),
  };
}

/**
 * PURE. ★★★ THE OBJECTIVE MARK COMES FROM THE LOCAL COMPARE. The batch grade call does
 * DIAGNOSIS ONLY.
 *
 * THE OWNER'S RULING, and `objectiveScoring.cjs:4` has said it in prose the whole time:
 * an MCQ or 1-mark objective question is scored 0 or FULL **on the answer alone**, as in a
 * real CBSE exam. The uploaded working exists so a student can SEE THE GAP in their
 * understanding. It must never change the mark — it may not destroy a right answer nor
 * rescue a wrong one.
 *
 * ★ WHY A NUMBER HAD TO BE ADDED RATHER THAN WIRED UP. Nothing in this product computed
 * one. The page computes a BOOLEAN (`pickedCorrect`) and formats it into a STRING
 * ("Correct · 1 mark"); the only local-scoring branch, `localEntry` below, is gated on the
 * `"local-mcq"` disposition — which is FALSE for exactly the broken case, because an MCQ
 * WITH working classifies as `"batch"`. So a correct pick reached the grader, the grader
 * judged the working, and the sheet rendered `0 / 1` beneath the very sentence that
 * forbids it ("Whole mark or nothing — MCQs are never step-marked.").
 *
 * ⚠ A STEP'S STATUS MUST NEVER CONTRIBUTE TO AN OBJECTIVE MARK, BY ANY PATH. The diagnosis
 * fields (`annotatedSteps`, `mistakeSummary`, `teacherNote`) pass through UNTOUCHED so the
 * student still sees what their working shows; only the NUMBERS are replaced.
 *
 * ★ RETURNS null FOR AN UNRESOLVABLE PICK — absent, unreadable, or a question with no
 * stored answer key. Null means HONEST-UNGRADED, never 0: `absent means unknowable, not
 * wrong`. Callers already treat a null grade as "no grade" (the couldNotRead contract), so
 * the surface says the answer could not be read instead of presenting a derived 0 as a
 * graded one. Never invents a mark and never falls back to the working.
 *
 * ⚠ SUBJECTIVE QUESTIONS ARE RETURNED UNCHANGED, by identity — the guard that matters most.
 */
export function applyLocalObjectiveMark(
  answer: QuickPracticeSavedAnswer,
  graded: CheckSolutionResponse,
): CheckSolutionResponse | null {
  if (answer.objective !== true) return graded;
  // ★★ NO STORED ANSWER KEY ⇒ NO LOCAL COMPARE IS POSSIBLE ⇒ LEAVE THE GRADE ALONE.
  // The owner's ruling is "compare the student's option TO THE STORED ANSWER", which
  // presupposes there is one. `isObjectiveQuestion` also flags a Section-A item that has
  // NO options and NO key — a fill-in-the-blank, say — and for those the grader's reading
  // of the written answer is the only mechanism there has ever been. Returning
  // honest-ungraded for them would delete working grading rather than correct it.
  // ⚠ THIS CARVE-OUT WAS FOUND BY A PRE-EXISTING TEST, NOT BY DESIGN: the first version of
  // this function claimed every `objective` question and turned §8's key-less fixture into
  // a silent MI blackout. The guard was right and the code was wrong.
  if (!nonEmpty(answer.answer)) return graded;
  const totalMarks = Number(answer.marks) || 1;
  // The SHARED compare — the server's own twin, imported, never re-implemented.
  const score = scoreObjective({
    answerKey: answer.answer,
    studentPick: answer.pickedOption,
    options: Array.isArray(answer.options) ? answer.options : undefined,
    totalMarks,
  });
  if (!score.resolved) return null;
  return {
    ...graded,
    totalMarks,
    marksAwarded: score.marksAwarded,
    percentage: score.correct ? 100 : 0,
    objective: true,
  };
}

/** The injectable grade seam. Defaults to `gradeWorksheet` — the SAME client function
 *  worksheets, chapter tests, full mocks and multi-question Check & Improve already
 *  post through — so this adds no second grade path and no second server route. */
export type QuickPracticeBatchGrader = (req: {
  worksheetId: string;
  subject?: string;
  questions: WorksheetGradeQuestionInput[];
  uploads?: WorksheetGradeUpload[];
}) => Promise<WorksheetGradeResponse>;

export type QuickPracticeBatchOutcome =
  | "graded"
  /** ★★ WIRE-2 · THE 402, NAMED. The batched call is the ONLY paid call left in Quick
   *  Practice, so a free-past-trial student meets the Premium boundary HERE and nowhere
   *  else. It used to fall into `skipped-error` with the message swallowed by the catch
   *  below — the student pressed Finish and got silence: no grades, no explanation.
   *  It is its own outcome so the caller can open GATE-2's upgrade sheet instead of a
   *  red error box: a locked feature is not a fault the student committed (§4b). */
  | "skipped-premium-required"
  | "skipped-nothing-to-batch"
  | "skipped-error";

/** ONE batched answer's trip through the Mistake Intelligence front door. */
export interface QuickPracticeMiOutcome {
  qNumber: number;
  /** The BANK question id — the same id the per-question path used, deliberately. */
  questionId: string;
  mistakeOutcome: RecordMistakeOutcome;
  bridged: boolean;
}

export interface QuickPracticeBatchResult {
  outcome: QuickPracticeBatchOutcome;
  /** ONE entry per DISPLAYED question, in displayed order — the exact shape
   *  `persistQuickPracticeSession` consumes. A question with no outcome carries neither
   *  `graded` nor `mcq`, so it stays omitted from the record's results. */
  entries: QuickPracticeEntry[];
  /** How many grade calls were issued. ★ 0 or 1, NEVER N — the assertion this whole
   *  module exists for. */
  calls: number;
  /** The qNumbers actually sent in the batch. */
  sentQNumbers: number[];
  /** ★ qNumbers the grader replied about that were NEVER SENT. Always empty against a
   *  correct server (which builds its results by mapping the SENT set), so a non-empty
   *  value is a real correctness signal and never a silently-accepted grade. */
  unsolicitedQNumbers: number[];
  /** ★ Questions held OUT of this batch because their answer photo was past the
   *  server's `MAX_BATCH_UPLOADS` cap. The caller must NAME these to the student —
   *  sending them would have earned a 400 that grades nothing at all. Empty in every
   *  session at or under the cap, which is very nearly all of them. */
  overCapQNumbers: number[];
  /** ★★ ONE ENTRY PER ANSWER FED TO MISTAKE INTELLIGENCE — §4a, the moat.
   *  Empty is a real answer (nothing legible came back, or no signed-in user); it is
   *  reported rather than assumed so a silent MI blackout is observable from the caller. */
  miOutcomes: QuickPracticeMiOutcome[];
  /** ★★ Present ONLY on `skipped-premium-required`. Carries the server's own
   *  student-facing fields straight through to `UpgradeSheet` — never a client-invented
   *  message, and never a date this side guessed. */
  premiumRequired?: { feature: string; trialEndedAt: string | null };
  error?: string;
}

/**
 * Grade ONE finished Quick Practice session in ONE call.
 *
 * ★ EXACTLY ONE `grade(...)` invocation, structurally: there is no loop and no
 * per-question await anywhere below — every photographed answer is one `uploads` entry
 * of a single request. N answers cost one call, which is the entire point of #578.
 *
 * Bare MCQ picks are folded in from the page's own local compare and cost nothing.
 * Honest-failure gated: a failed batch returns `skipped-error` with the LOCAL results
 * still intact, so a grader outage never erases what was scored for free — and it never
 * fabricates a grade for the answers that did not come back.
 */
export async function gradeQuickPracticeBatch(args: {
  /** The session's stable id — echoed by the server, not interpreted here. */
  worksheetId: string;
  subject?: string;
  answers: QuickPracticeSavedAnswer[];
  /** ★★ WIRE-2 · the signed-in student, for the MI feed (§4a). Omitted / signed out →
   *  `recordMistake` and `recordAttempt` self-refuse at their own policy gate and
   *  `miOutcomes` comes back empty. Nothing here duplicates that check. */
  user?: AuthUser | null;
  /** Test seam. Production omits it and gets `gradeWorksheet`. */
  grade?: QuickPracticeBatchGrader;
}): Promise<QuickPracticeBatchResult> {
  const { worksheetId, subject, answers, user } = args;
  const grade = args.grade ?? gradeWorksheet;
  const selection = selectQuickPracticeBatch(answers);
  const overCapQNumbers = selection.overCap.map((a) => a.qNumber);

  /** The local half — a bare pick the page already compared, plus nothing for anything
   *  else. Built first so it survives a grader failure. */
  const localEntry = (answer: QuickPracticeSavedAnswer): QuickPracticeEntry => {
    const base: QuickPracticeEntry = { questionId: answer.questionId, marks: Number(answer.marks) || 0 };
    if (classifyQuickPracticeAnswer(answer) === "local-mcq" && answer.pickedCorrect != null) {
      base.mcq = answer.pickedCorrect ? "correct" : "wrong";
    }
    return base;
  };
  const baseEntries = answers.map(localEntry);

  if (selection.batch.length === 0) {
    return {
      outcome: "skipped-nothing-to-batch",
      entries: baseEntries,
      calls: 0,
      sentQNumbers: [],
      unsolicitedQNumbers: [],
      overCapQNumbers,
      miOutcomes: [],
    };
  }

  const questions = selection.batch.map(buildBatchQuestionInput);
  // ★ ONLY PHOTOGRAPHED answers become uploads. A typed-only answer is in `questions`
  // and NOT here — mapping the whole batch would send `imageBase64: "undefined"` for it
  // and put a junk part in the prompt. `selectQuickPracticeBatch` has already held this
  // list at or below `MAX_BATCH_UPLOADS`.
  const uploads: WorksheetGradeUpload[] = selection.batch
    .filter((a) => nonEmpty(a.imageBase64))
    .map((a) => ({
      qNumber: a.qNumber,
      imageBase64: String(a.imageBase64),
      ...(nonEmpty(a.imageMimeType) ? { imageMimeType: String(a.imageMimeType) } : {}),
    }));
  const sentQNumbers = questions.map((q) => q.qNumber);

  let response: WorksheetGradeResponse;
  try {
    response = await grade({ worksheetId, subject, questions, uploads });
  } catch (error) {
    // ★★ §4b · THE 402 IS NOT AN ERROR AND MUST NOT BE SWALLOWED HERE. The catch used
    // to be unconditional, so a free-past-trial student pressing Finish got
    // `skipped-error` and a console warning — silence, on the only paid call left in
    // Quick Practice. It is now split: a Premium refusal is CARRIED OUT as its own
    // outcome (the caller opens GATE-2's upgrade sheet), and everything else behaves
    // exactly as before.
    //
    // ⚠ DETECTION IS BY `err.name`, NOT `isPremiumRequiredError` — the same reason
    // SolutionChecker's branch reads the name: `aiClient` is mocked as a COMPLETE
    // one-symbol replacement by suites that must pass unmodified, so any new VALUE
    // import from it throws "No X export is defined on the mock". A type-only import
    // is erased; `name` is set by the class constructor and needs no runtime import.
    if (error instanceof Error && error.name === "PremiumRequiredError") {
      const premium = error as Error & { feature?: string; trialEndedAt?: string | null };
      return {
        outcome: "skipped-premium-required",
        entries: baseEntries,
        calls: 1,
        sentQNumbers,
        unsolicitedQNumbers: [],
        overCapQNumbers,
        miOutcomes: [],
        premiumRequired: {
          feature: String(premium.feature || "unknown"),
          trialEndedAt: premium.trialEndedAt ?? null,
        },
        // The server's own student-facing copy, kept for the caller. It is NOT rendered
        // as an error — `UpgradeSheet` carries the boundary (SolutionChecker's ruling).
        error: error.message,
      };
    }
    console.warn("[quickPracticeSessionService] batched grade failed", error);
    return {
      outcome: "skipped-error",
      entries: baseEntries,
      calls: 1,
      sentQNumbers,
      unsolicitedQNumbers: [],
      overCapQNumbers,
      miOutcomes: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }

  if (!response || response.ok !== true || !Array.isArray(response.results)) {
    return {
      outcome: "skipped-error",
      entries: baseEntries,
      calls: 1,
      sentQNumbers,
      unsolicitedQNumbers: [],
      overCapQNumbers,
      miOutcomes: [],
      error: (response && response.error) || "The batched grade did not come back.",
    };
  }

  // ★ EVERY RETURNED qNumber MUST BE ONE WE SENT. A reply about a question we did not
  // ask is a silent correctness failure no type check can see, so it is dropped and
  // REPORTED — never merged onto whichever displayed question happens to share the index.
  const sent = new Set(sentQNumbers);
  const unsolicitedQNumbers: number[] = [];
  const byQNumber = new Map<number, WorksheetQuestionGrade>();
  for (const result of response.results) {
    const qNumber = Number(result && result.qNumber);
    if (!Number.isFinite(qNumber) || !sent.has(qNumber)) {
      if (Number.isFinite(qNumber)) unsolicitedQNumbers.push(qNumber);
      continue;
    }
    if (!byQNumber.has(qNumber)) byQNumber.set(qNumber, result);
  }

  const entries = answers.map((answer) => {
    const entry = localEntry(answer);
    const result = byQNumber.get(answer.qNumber);
    if (!result) return entry;
    const raw = batchGradeToCheckSolution(result);
    // ★★★ SITE 1 of 2 — WHAT THE SCORECARD RENDERS. `entry.graded` is the value
    // `PracticePage` hands to `buildGradedAnswer`, so an objective question's mark is
    // replaced by the LOCAL compare HERE, before any renderer sees it. Fixing this in the
    // page instead would have left SITE 2 below feeding Mistake Intelligence a wrong mark
    // permanently — a correct screen over a corrupt store, which nothing would ever show.
    const graded = raw ? applyLocalObjectiveMark(answer, raw) : null;
    // couldNotRead → no grade at all. The question stays honestly unattempted-looking
    // rather than being recorded as a 0 the student did not earn. An objective question
    // whose pick could not be resolved arrives here as null for the SAME reason and is
    // treated identically: honest-ungraded, never a derived 0.
    if (graded) entry.graded = graded;
    return entry;
  });

  /* ══════════════════════════════════════════════════════════════════════════
     ★★ §4a · THE MI FEED — the moat, and the thing that goes dark silently.
     ══════════════════════════════════════════════════════════════════════════
     Before WIRE-2 every Quick Practice mistake reached Mistake Intelligence through
     SolutionChecker's `handleCheck` → `recordMistake` + `recordAttempt`. WIRE-2
     removes that call: the panel now SAVES and never grades, so `handleCheck` never
     runs on this surface. ⇒ if this loop is absent, Quick Practice — the highest-
     traffic surface in the product — stops feeding MI entirely, with nothing red
     anywhere: no throw, no type error, no failing gate. That is why it is here and
     why it is mutation-tested.

     ★ THE SAME FRONT DOOR, NOT A SECOND ONE. `recordMistake` + its score twin
     `recordAttempt` are the ONE ingestion pair every graded surface routes through
     (worksheet, chapter test, full mock, C&I). This mirrors `chapterTestGradeService`
     line for line, including the sequential await — `recordMistake` reads and writes
     a device-local dedup list, so a parallel fan-out would race it.

     ★★ AND THE QUESTION ID IS THE BARE BANK ID, DELIBERATELY. Every other batched
     surface namespaces its ids (`ct:`/`fm:`/`ws:`/`ci:`) because their questions are
     synthetic. Quick Practice's are REAL bank questions, and the per-question path
     this replaces wrote the bare id. Namespacing it here would (a) orphan the dedup
     against everything QP has already recorded and (b) break `buildSeenQuestionIds`,
     which reads `questionId` off the attempts stream to build the unique-sets
     seen-set. Same id in, same id out.

     ★ couldNotRead ⇒ NO MI WRITE. The grader could not read that answer, so there is
     no grade and nothing to classify. `batchGradeToCheckSolution` already returns null
     for it; recording a 0 would be the fabrication this module's header forbids. */
  const miOutcomes: QuickPracticeMiOutcome[] = [];
  for (const answer of selection.batch) {
    const result = byQNumber.get(answer.qNumber);
    if (!result) continue;
    // ★★★ SITE 2 of 2 — WHAT MISTAKE INTELLIGENCE STORES. This loop re-derives its own
    // grade rather than reading `entries`, so the local objective mark MUST be applied
    // here too or `recordAttempt` writes the model's wrong number into the store the
    // tutor reads — invisibly, and forever. A RENDER SITE IS NOT A PRODUCTION SITE.
    const rawCsr = batchGradeToCheckSolution(result);
    const csr = rawCsr ? applyLocalObjectiveMark(answer, rawCsr) : null;
    // Unresolvable objective pick ⇒ no grade ⇒ NO MI WRITE, exactly as couldNotRead does.
    // Recording a 0 would be the fabrication this module's header forbids.
    if (!csr) continue;
    const questionId = String(answer.questionId);
    const topic = String(answer.topicLabel || "");
    // eslint-disable-next-line no-await-in-loop
    const rec = await recordMistake(user ?? null, csr, {
      subject: String(subject || ""),
      topic,
      topicKey: answer.topicKey ?? undefined,
      question: String(answer.questionText || ""),
      questionId,
    });
    recordAttempt(user ?? null, {
      subject: String(subject || ""),
      topic,
      topicKey: answer.topicKey ?? undefined,
      question: String(answer.questionText || ""),
      questionId,
      marksScored: csr.marksAwarded,
      marksAvailable: csr.totalMarks,
      mode: "graded",
    });
    miOutcomes.push({
      qNumber: answer.qNumber,
      questionId,
      mistakeOutcome: rec.outcome,
      bridged: rec.bridged,
    });
  }

  return {
    outcome: "graded",
    entries,
    calls: 1,
    sentQNumbers,
    unsolicitedQNumbers,
    overCapQNumbers,
    miOutcomes,
  };
}
