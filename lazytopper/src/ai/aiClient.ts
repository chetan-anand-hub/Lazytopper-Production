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

const API_BASE = "/api"; // Vite dev proxy or same origin in production
export const MENTOR_ENDPOINT = `${API_BASE}/mentor`;

async function handleJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();

  if (!res.ok) {
    let details: { error?: string; message?: string; raw?: string };
    try {
      details = JSON.parse(text);
    } catch {
      details = { raw: text };
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
    headers: {
      "Content-Type": "application/json",
    },
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
    headers: { "Content-Type": "application/json" },
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
}): Promise<CheckSolutionResponse> {
  const res = await fetch(`${API_BASE}/check-solution`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return handleJsonResponse<CheckSolutionResponse>(res);
}

/** Detect-then-confirm (Claim 2 UX): read marks/subject/topic from the QUESTION
 *  alone (text or an uploaded photo), before the student commits an answer. A
 *  focused, cheap call — no grading. The grade then runs on the confirmed values. */
export interface DetectQuestionResponse {
  ok: boolean;
  detectedMarks?: number;
  detectedSubject?: "Maths" | "Science" | null;
  detectedTopic?: string | null;
  marksSource?: CheckSolutionMarksSource | null;
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return handleJsonResponse<DetectQuestionResponse>(res);
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return handleJsonResponse<GenerateVisualResponse>(res);
}
