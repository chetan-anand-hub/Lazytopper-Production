// src/ai/aiClient.ts
// Thin client for talking to LazyTopper AI gateway (mentor + more-like-this)
// Uses relative /api/* calls so it works in dev (Vite proxy) and prod.

import type {
  MentorImageMimeType,
  MentorMode as MentorModeCore,
  MentorGatewayData,
} from "../types/mentor";

/**
 * Supported mentor modes.  In addition to the original modes (plan, solve, explain,
 * coach and mindset) we define topic‑level modes for TopicHub/Trends flows.
 *
 * - `topic_explain`: Explain a topic from basics for a Class 10 CBSE student.
 * - `topic_exam_tips`: Provide exam strategy and high‑yield tips on how to
 *   score 95+ in a given topic or unit.  These extended modes allow
 *   downstream pages (TopicHub and Trends) to route to the mentor
 *   service without overloading the regular explain/solve flows.
 */
export type MentorMode = MentorModeCore;

export interface MentorPayload {
  subject: string;              // "Maths" | "Science" | etc.
  topicKey?: string;            // e.g. "MATH-REAL-NUMBERS"
  conceptKey?: string;
  questionText?: string;        // for explain/solve modes
  studentQuestion?: string;     // for chat-style followups
  marks?: number;
  daysLeft?: number;
  hoursPerDayTotal?: number;
  targetPercent?: number;
  extraNotes?: string;
  imageBase64?: string;
  imageMimeType?: MentorImageMimeType;
  imageName?: string;
}

export interface MentorPersona {
  id: string;
  coreRules?: string[];
  description?: string;
}

export interface MentorResponse {
  mode: MentorMode;
  data: MentorGatewayData;
  meta?: {
    systemPromptUsed?: string;
    personaId?: string;
    model?: string;
  };
}

export interface MoreLikeThisSeedQuestion {
  text: string;
  marks?: number;
  difficulty?: "Easy" | "Medium" | "Hard";
  bloomSkill?: string; // "Remembering" | "Understanding" | "Applying" | ...
}

export interface MoreLikeThisRequest {
  subject: string;
  topicKey: string;
  seedQuestion: MoreLikeThisSeedQuestion;
  numVariants: number;
  requestedDifficulty?: string;
  requestedSection?: string;
}

export interface MoreLikeThisVariant extends MoreLikeThisSeedQuestion {
  index: number;
  answer?: string;
  solutionSteps?: string[];
  finalAnswer?: string;
}

export interface MoreLikeThisResponse {
  subject: string;
  topicKey: string;
  model?: string;
  provider?: string;
  variants: MoreLikeThisVariant[];
  error?: string;
}

import { paidJsonHeaders } from "./paidCallHeaders";

const API_BASE = "/api"; // Vite dev proxy or same origin in production
export const MENTOR_ENDPOINT = `${API_BASE}/mentor`;

/**
 * A daily cap was reached. NOT a failure — the request was well-formed, the
 * student did nothing wrong, and there is a specific time at which it works
 * again. It is a distinct type so callers can render the server's own copy
 * instead of a generic "something went wrong", which is what every AI call in
 * this file did before the rate limiter shipped (PR #537).
 *
 * `resetAt` is the next IST midnight, chosen server-side: the message says "it
 * resets tomorrow", and for an Indian student that is only true on an IST
 * boundary.
 */
export class DailyLimitError extends Error {
  readonly limitClass: string;
  readonly resetAt: string | null;

  constructor(message: string, limitClass: string, resetAt: string | null) {
    super(message);
    this.name = "DailyLimitError";
    this.limitClass = limitClass;
    this.resetAt = resetAt;
    // NOTE: no Object.setPrototypeOf here. It is the standard guard for TS's ES5
    // class-extends-Error downlevel, but tsconfig.app.json targets ES2022, so
    // classes are native and `instanceof` already works. Adding it would be a line
    // no test can redden — verified: removing it left the suite green — and an
    // unpinnable safeguard reads as protection while proving nothing. If the
    // target is ever lowered, the instanceof test below is what will catch it.
  }
}

/** Narrow an unknown caught value to a limit response. */
export function isDailyLimitError(err: unknown): err is DailyLimitError {
  return err instanceof DailyLimitError;
}

async function handleJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();

  if (!res.ok) {
    let details: { error?: string; message?: string; raw?: string; class?: string; resetAt?: string };
    try {
      details = JSON.parse(text);
    } catch {
      details = { raw: text };
    }

    // ── Daily cap (PR #537). Handled BEFORE the generic branch so a limit never
    //    reaches a caller as an error: no console.error (a cap is expected
    //    operation, not a fault worth alarming the console over) and a typed
    //    throw carrying the server's own message and reset time.
    if (res.status === 429 && details?.error === "daily_limit") {
      throw new DailyLimitError(
        details.message || "You've hit today's limit for this. It resets tomorrow.",
        details.class || "unknown",
        details.resetAt || null,
      );
    }

    console.error("AI API error:", res.status, details);
    throw new Error(details?.error || details?.message || "AI API request failed");
  }

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    console.error("Failed to parse AI API JSON:", text);
    throw err;
  }
}

/**
 * Call the mentor endpoint for any persona mode (plan / explain / solve / coach / mindset).
 */
export async function callMentor(
  mode: MentorMode,
  payload: MentorPayload,
  persona?: MentorPersona
): Promise<MentorResponse> {
  const res = await fetch(MENTOR_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode,
      payload,
      persona,
    }),
  });

  return handleJsonResponse<MentorResponse>(res);
}

/**
 * Generate HPQ-respecting variants for "More like this" using the backend gateway.
 */
export async function generateMoreLikeThis(
  req: MoreLikeThisRequest
): Promise<MoreLikeThisResponse> {
  const res = await fetch(`${API_BASE}/more-like-this`, {
    method: "POST",
    headers: await paidJsonHeaders(),
    body: JSON.stringify(req),
  });

  return handleJsonResponse<MoreLikeThisResponse>(res);
}

export interface StepSolutionStep {
  stepNumber: number;
  description: string;
  working: string;
  marks: number;
}

export interface StepSolutionResponse {
  totalMarks: number;
  steps: StepSolutionStep[];
  commonMistakes?: string[];
  examTip?: string;
}

function buildLocalSolution(
  stepsArr: string[],
  finalAnswer: string | undefined,
  totalMarks: number,
  isObjective: boolean,
): StepSolutionResponse {
  const n = stepsArr.length;
  const rawMarks = stepsArr.map((_, i) => {
    if (n === 1) return totalMarks;
    if (totalMarks < 2) return totalMarks / n;
    if (i === 0 || i === n - 1) return 0.5;
    const middleCount = Math.max(1, n - 2);
    return (totalMarks - 1) / middleCount;
  }).map((m) => Math.round(m * 2) / 2);

  const currentSum = rawMarks.reduce((a, b) => a + b, 0);
  const diff = Math.round((totalMarks - currentSum) * 2) / 2;
  if (diff !== 0 && rawMarks.length > 0) {
    rawMarks[rawMarks.length - 1] = Math.max(0.5, rawMarks[rawMarks.length - 1] + diff);
  }

  const steps: StepSolutionStep[] = stepsArr.map((working, i) => {
    let description: string;
    if (i === 0) {
      description = isObjective ? "Correct answer" : "Approach and setup";
    } else if (i === n - 1 && finalAnswer) {
      description = "\u2234 " + finalAnswer;
    } else if (i === n - 1) {
      description = "Final answer";
    } else {
      description = "Step " + (i + 1);
    }
    return { stepNumber: i + 1, description, working, marks: rawMarks[i] };
  });

  return {
    totalMarks,
    steps,
    commonMistakes: isObjective
      ? ["Not reading all options before marking — similar-sounding options trap you"]
      : ["Skipping intermediate working steps — board examiners award marks for method, not just the final answer"],
    examTip: isObjective
      ? "For MCQs: read all 4 options first, eliminate obviously wrong ones, then pick. No negative marking in CBSE — never leave blank."
      : "Write each step on a new line. Method marks are awarded even if the final answer has a calculation error.",
  };
}

export async function fetchStepSolution(req: {
  subject: string;
  topic: string;
  question: string;
  marks: number;
  type?: string;
  section?: string;
  answer?: string;
  explanation?: string;
  solutionSteps?: string[];
  finalAnswer?: string;
}): Promise<StepSolutionResponse> {
  // Client-side fast path: use pre-written steps directly — no network call needed.
  if (req.solutionSteps && req.solutionSteps.length > 0) {
    const isObjective = /^(MCQ|Objective|Section A)$/i.test(req.type ?? "") ||
      /^A$/i.test(req.section ?? "");
    return buildLocalSolution(req.solutionSteps, req.finalAnswer, req.marks, isObjective);
  }

  const res = await fetch(`${API_BASE}/step-solution`, {
    method: "POST",
    headers: await paidJsonHeaders(),
    body: JSON.stringify(req),
  });
  return handleJsonResponse<StepSolutionResponse>(res);
}

export type MistakeType = "conceptual" | "calculation" | "silly" | "presentation";

export interface CheckSolutionAnnotatedStep {
  stepNumber: number;
  description: string;
  studentWork: string;
  status: "correct" | "partial" | "incorrect" | "missing";
  marksAwarded: number;
  marksDeducted: number;
  teacherAnnotation: string;
  mistakeType: MistakeType | null;
  correctedWorking: string | null;
}

export interface CheckSolutionMistakeSummary {
  conceptual: number;
  calculation: number;
  silly: number;
  presentation: number;
}

/** Where the grading mark scale came from when `detectMarks` was requested:
 *  `stated` = printed on the question; `inferred` = AI judged from type/depth;
 *  `fallback` = AI gave no usable value (neutral default, surfaced honestly). */
export type CheckSolutionMarksSource = "stated" | "inferred" | "fallback";

/** Canonical topic vocabulary entry passed to the grader so the AI's detected
 *  topic is constrained to a real `topics.ts` key (never free text). */
export interface CheckSolutionTopicVocab {
  slug: string;
  name: string;
  subject: string;
}

export interface CheckSolutionResponse {
  ok: boolean;
  totalMarks: number;
  marksAwarded: number;
  percentage: number;
  annotatedSteps: CheckSolutionAnnotatedStep[];
  mistakeSummary: CheckSolutionMistakeSummary;
  teacherNote: string;
  /** The grader's objective verdict for this question (additive echo of
   *  `bankObjective || flaggedObjective`). When true, the clamp intentionally zeroed
   *  every per-step mark — the whole mark lives at answer level (PR-348) — so a step's
   *  "0 marks" is by design, not a student who scored nothing. Views read this to
   *  suppress the misleading per-step mark chip while keeping the annotations. Absent
   *  on a pre-this-change stored scorecard (falsy → old chip shown, honestly stale). */
  objective?: boolean;
  // Auto-detect echo (present only when the request set `detectMarks`).
  detectedSubject?: "Maths" | "Science" | null;
  detectedTopic?: string | null;
  marksSource?: CheckSolutionMarksSource | null;
  error?: string;
}

export async function checkSolutionImage(req: {
  subject?: string;
  topic?: string;
  question: string;
  marks?: number;
  /** Opt-in: the AI determines marks/subject/topic from the question (Check &
   *  Improve). When false/absent, the caller-supplied marks stay authoritative
   *  (Quick Practice / SolutionChecker — unchanged). */
  detectMarks?: boolean;
  /** Canonical topics the AI may choose `detectedTopic` from (auto-detect only). */
  topicVocabulary?: CheckSolutionTopicVocab[];
  imageBase64?: string;
  imageMimeType?: string;
  textAnswer?: string;
  solutionSteps?: string[];
  finalAnswer?: string;
  /** Objective signals (ALL optional, ADDITIVE). Bank-sourced Check & Improve forwards
   *  `section`/`format`/`answer`/`options` so the grader scores the MCQ deterministically
   *  (0 or full); a keyless upload forwards `objective` (from the detect step) so the
   *  grader clamps a ≤1-mark objective question off the model's binary verdict. When
   *  none are sent, grading is byte-identical to before. */
  section?: string;
  format?: string;
  answer?: string;
  options?: string[];
  objective?: boolean;
}): Promise<CheckSolutionResponse> {
  const res = await fetch(`${API_BASE}/check-solution`, {
    method: "POST",
    headers: await paidJsonHeaders(),
    body: JSON.stringify(req),
  });
  return handleJsonResponse<CheckSolutionResponse>(res);
}

/** Detect-then-confirm (Claim 2 UX): read marks/subject/topic from the QUESTION
 *  alone (text or an uploaded photo), before the student commits an answer. A
 *  focused, cheap call — no grading. The grade then runs on the confirmed values. */
/** One detected question from a (possibly multi-question) upload. Additive — the
 *  single-question Check & Improve flow ignores this and reads the top-level
 *  detected* fields; the multi-question flow grades the whole array via
 *  `gradeWorksheet`. */
export interface DetectedQuestion {
  questionNumber: number;
  questionText: string;
  marks: number;
  marksSource: "stated" | "inferred";
  /** True for a multiple-choice / assertion-reason question. Forwarded to the grade
   *  call so a keyless objective question is clamped to 0/full (≤1-mark rail). */
  objective?: boolean;
}

export interface DetectQuestionResponse {
  ok: boolean;
  detectedMarks?: number;
  detectedSubject?: "Maths" | "Science" | null;
  detectedTopic?: string | null;
  marksSource?: CheckSolutionMarksSource | null;
  /** First question's objective flag (backward-compat mirror of questions[0].objective). */
  detectedObjective?: boolean;
  /** Every question read from the upload. A single-question read yields a
   *  single-item array; `length > 1` drives the multi-question grade path. */
  questions?: DetectedQuestion[];
  error?: string;
}

export async function detectQuestion(req: {
  question?: string;
  imageBase64?: string;
  imageMimeType?: string;
  topicVocabulary?: CheckSolutionTopicVocab[];
}): Promise<DetectQuestionResponse> {
  const res = await fetch(`${API_BASE}/detect-question`, {
    method: "POST",
    headers: await paidJsonHeaders(),
    body: JSON.stringify(req),
  });
  return handleJsonResponse<DetectQuestionResponse>(res);
}

// ─── Worksheet structured grading (PR-E2b — one-PDF grade loop) ────────────────

/** One known worksheet question + its scheme, sent to the structured grader. The
 *  caller fetches this from the persisted worksheet (getWorksheetSession) and
 *  passes it in — the grader is surface-agnostic and grades against this set. */
export interface WorksheetGradeQuestionInput {
  qNumber: number;
  marks: number;
  topic?: string;
  topicLabel?: string;
  questionText: string;
  /** Section letter ("A" for MCQ/AR). Carried so the server honesty guard can
   *  classify an objective question and never fabricate a mistake type for a bare
   *  wrong MCQ pick. */
  section?: string;
  /** The canonical bank answer key — the correct OPTION TEXT (e.g. "7", "Acidic
   *  solution"), matching one entry of `options`. When present (with `options`) the
   *  grader scores the MCQ deterministically (0 or full) instead of relying on model
   *  judgment. Absent for subjective questions. */
  answer?: string;
  /** The MCQ option list, so the grader can bridge a letter pick ("(b)") to the
   *  option text `answer` compares against. */
  options?: string[];
  /** Optional legacy correct-option LETTER (e.g. "(a)"). Accepted as a fallback answer
   *  key; canonical banks carry `answer` (option text) instead. */
  correctOption?: string;
  /** Objective flag from a keyless Check & Improve detect step. When true the grader
   *  clamps a ≤1-mark question to 0/full off the model's binary verdict. */
  objective?: boolean;
  solutionSteps?: string[];
  finalAnswer?: string;
}

/** A single per-question grade result, keyed to its worksheet question number.
 *  When `couldNotRead` is true the answer was illegible/absent — it carries NO
 *  grade and is NEVER counted as 0 (honest-failure contract). When false, the
 *  graded fields form a CheckSolutionResponse-compatible result that can be fed
 *  straight into the Mistake-Intelligence front door. */
export interface WorksheetQuestionGrade {
  qNumber: number;
  couldNotRead: boolean;
  totalMarks: number;
  /** Present only when couldNotRead is false. */
  ok?: boolean;
  marksAwarded?: number;
  percentage?: number;
  annotatedSteps?: CheckSolutionAnnotatedStep[];
  mistakeSummary?: CheckSolutionMistakeSummary;
  teacherNote?: string;
  /** The grader's objective verdict (additive echo — same field the single-question
   *  CheckSolutionResponse carries). True → per-step marks were zeroed by design; the
   *  worksheet / C&I views suppress the misleading per-step chip. Flows through the
   *  generic passthrough parse; no grade-service mapping needed. */
  objective?: boolean;
  /** Present only when couldNotRead is true. */
  note?: string;
  /** Check & Improve PR-2 per-question topic (client-populated AFTER grading — the
   *  grader NEVER emits these). Resolved by re-running the existing /detect-question
   *  read per question against the topics.ts vocabulary (A2), canonicalised through
   *  the shared resolver. Empty/absent = unresolved (honest — never guessed). Drives
   *  the C&I by-topic scorecard lens + the counted "N topics" chip. Other surfaces
   *  never set them; every existing reader ignores them. */
  topicSlug?: string | null;
  topicLabel?: string | null;
}

export interface WorksheetGradeResponse {
  ok: boolean;
  worksheetId?: string;
  results: WorksheetQuestionGrade[];
  totalQuestions: number;
  gradedCount: number;
  pendingCount: number;
  /** Honest, SEPARATE totals — the graded subtotal excludes pending questions so
   *  unreadable pages never deflate a final mark presented as complete. */
  gradedMarksAwarded: number;
  gradedMarksTotal: number;
  worksheetTotalMarks: number;
  summary?: string;
  error?: string;
}

/** Grade a whole worksheet from ONE uploaded PDF against its known question set,
 *  in a single structured call (spec §6). */
export async function gradeWorksheet(req: {
  worksheetId: string;
  subject?: string;
  questions: WorksheetGradeQuestionInput[];
  imageBase64: string;
  imageMimeType?: string;
}): Promise<WorksheetGradeResponse> {
  const res = await fetch(`${API_BASE}/grade-worksheet`, {
    method: "POST",
    headers: await paidJsonHeaders(),
    body: JSON.stringify(req),
  });
  return handleJsonResponse<WorksheetGradeResponse>(res);
}

export interface GenerateVisualRequest {
  topic: string;
  concept?: string;
  subject?: string;
  grade?: number;
}

// ─── AI Questions Cache ───────────────────────────────────────────────────────

export interface CachedAiQuestion {
  text: string;
  marks: number | null;
  difficulty: string | null;
  bloomSkill: string | null;
  answer?: string | null;
  solutionSteps?: string[] | null;
  finalAnswer?: string | null;
}

/**
 * Fetch up to `n` cached AI-generated questions for a topic from the server DB.
 * Returns an empty array on any network or parse failure (non-fatal).
 */
export async function fetchCachedAiQuestions(params: {
  topicKey: string;
  subject: string;
  difficulty?: string | null;
  marks?: number | null;
  n: number;
}): Promise<CachedAiQuestion[]> {
  try {
    const qs = new URLSearchParams({
      topicKey: params.topicKey,
      subject: params.subject,
      n: String(params.n),
    });
    if (params.difficulty) qs.set("difficulty", params.difficulty);
    if (params.marks != null) qs.set("marks", String(params.marks));
    const res = await fetch(`${API_BASE}/ai-questions?${qs}`);
    const data = await handleJsonResponse<{ ok: boolean; questions: CachedAiQuestion[] }>(res);
    return data.questions ?? [];
  } catch {
    return [];
  }
}

/**
 * Fire-and-forget: persist newly generated AI question variants to the DB cache.
 * Failures are silently swallowed — caching is best-effort.
 */
export async function saveAiGeneratedQuestions(params: {
  topicKey: string;
  subject: string;
  difficulty?: string | null;
  marks?: number | null;
  variants: CachedAiQuestion[];
}): Promise<void> {
  fetch(`${API_BASE}/ai-questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  }).catch(() => {});
}

export interface GenerateVisualResponse {
  ok: boolean;
  html: string | null;
  provider?: string;
  model?: string;
  error?: string;
}

export async function generateVisual(
  req: GenerateVisualRequest
): Promise<GenerateVisualResponse> {
  const res = await fetch(`${API_BASE}/generate-visual`, {
    method: "POST",
    headers: await paidJsonHeaders(),
    body: JSON.stringify(req),
  });
  return handleJsonResponse<GenerateVisualResponse>(res);
}
