// src/utils/checkImproveDetection.ts
//
// Claim 2 (auto-detect marks/subject/topic in Check & Improve): shared resolution
// of the grader's auto-detected subject/topic into a CANONICAL topics.ts context
// for storage. Both Check & Improve surfaces (desktop + app) use this so they can
// never diverge, and so the detected topic is canonicalised through the SAME
// resolver the Me weak-area row uses (Fix A, #242) — keeping MI attribution on a
// real `topics.ts` key instead of a free-text label.

import { desktopTopicForWeakAreaKey } from "../lib/desktop/topics";
import type { DesktopSubject } from "../lib/desktop/navigation";
import {
  detectQuestion,
  type CheckSolutionResponse,
  type CheckSolutionTopicVocab,
  type DetectQuestionResponse,
} from "../ai/aiClient";

/**
 * Governs ONLY the detection *meta-display* — the marks-source label
 * ("read from the question" / "estimated"), confidence, and any text exposing the
 * machinery (that detection is logged). Default ON for the owner testing phase;
 * flip to `false` for launch (a logged pre-launch task).
 *
 * It must NOT hide the detected VALUES themselves or the ability to correct them —
 * those stay visible + correctable even at launch (calm "we read this from your
 * question", never anxious "AI low-confidence").
 */
export const SHOW_DETECTION_META = true;

export interface DetectedGradeTopic {
  subject: DesktopSubject;
  /** Canonical topic display name, or "" when no topic resolved. */
  topicName: string;
  /** Canonical topics.ts slug, or "" when no topic resolved (→ full-subject). */
  topicSlug: string;
}

/** Mark-scale provenance. Server sources are stated/inferred/fallback; `user` is
 *  added client-side when the student corrects the detected value (detect-then-confirm). */
export type DetectionMarksSource =
  | "stated"
  | "inferred"
  | "fallback"
  | "user";

/** The confirmed (possibly student-corrected) question metadata that grading runs
 *  against in the detect-then-confirm flow. */
export interface ConfirmedDetection {
  marks: number;
  subject: DesktopSubject;
  /** Canonical topics.ts slug, or "" (full-subject). */
  topicSlug: string;
  topicName: string;
  marksSource: DetectionMarksSource | null;
}

/** Clamp a detected/edited mark to the CBSE single-question range [1,6]; a
 *  non-usable value falls back to 3 (never fabricated beyond the valid range). */
export function clampDetectedMarks(value: unknown): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 1 && n <= 6 ? n : 3;
}

/** Build the confirmed-detection state from a `/detect-question` response:
 *  canonicalise the topic (via the shared resolver) and clamp the marks. */
export function buildConfirmedDetection(
  d: Pick<
    DetectQuestionResponse,
    "detectedMarks" | "detectedSubject" | "detectedTopic" | "marksSource"
  >,
): ConfirmedDetection {
  const { subject, topicName, topicSlug } = resolveDetectedGradeTopic({
    detectedTopic: d.detectedTopic ?? null,
    detectedSubject: d.detectedSubject ?? null,
  });
  return {
    marks: clampDetectedMarks(d.detectedMarks),
    subject,
    topicName,
    topicSlug,
    marksSource: d.marksSource ?? null,
  };
}

/** One question's resolved topic in a multi-question upload (C&I PR-2, item A). */
export interface PerQuestionTopic {
  qNumber: number;
  /** Canonical topics.ts slug, or "" when the model found no confident fit. */
  topicSlug: string;
  /** Canonical display name, or "" when unresolved. */
  topicName: string;
}

/**
 * Resolve a per-QUESTION topic for each question of a (multi-question) C&I upload —
 * item A, route A2 (owner-ratified 2026-07-13): re-run the EXISTING `/detect-question`
 * read once per question against the SAME topics.ts vocabulary the session-level
 * detect already uses, then canonicalise through the shared resolver. NO grader edit
 * (the detect endpoint lives in the sacred checkSolution.cjs — untouched); this only
 * re-calls the existing client capability.
 *
 * HONESTY (spec §3 / §4.4): a question whose topic the model can't confidently place
 * returns an EMPTY slug — never guessed. Externally uploaded questions carry no bank
 * questionId, so only the TOPIC is knowable here; the concept (subtopic) stays
 * unknowable and is never fabricated. A failed detect call degrades that one question
 * to empty (best-effort), never the whole set.
 *
 * The calls run concurrently; each is the same focused, cheap read the confirm step
 * already makes. Pure w.r.t. state — returns the resolved topics for the caller to
 * attach to the grade response (it does not mutate anything).
 */
export async function resolvePerQuestionGradeTopics(
  questions: Array<{ questionNumber: number; questionText: string }>,
  topicVocabulary: CheckSolutionTopicVocab[],
): Promise<PerQuestionTopic[]> {
  const settled = await Promise.all(
    questions.map(async (q): Promise<PerQuestionTopic> => {
      const text = String(q.questionText || "").trim();
      if (!text) return { qNumber: q.questionNumber, topicSlug: "", topicName: "" };
      try {
        const d = await detectQuestion({ question: text, topicVocabulary });
        const { topicSlug, topicName } = resolveDetectedGradeTopic({
          detectedTopic: d.detectedTopic ?? null,
          detectedSubject: d.detectedSubject ?? null,
        });
        return { qNumber: q.questionNumber, topicSlug, topicName };
      } catch (error) {
        console.warn("[checkImproveDetection] per-question topic detect failed", error);
        return { qNumber: q.questionNumber, topicSlug: "", topicName: "" };
      }
    }),
  );
  return settled;
}

/** Count the DISTINCT resolved topics across a per-question set (empty slugs — the
 *  honest unresolved — never count). Powers the "N topics" counted chip + the
 *  by-topic lens gate. */
export function countDistinctTopics(perQuestion: Array<{ topicSlug?: string | null }>): number {
  const seen = new Set<string>();
  for (const q of perQuestion) {
    const slug = String(q.topicSlug || "").trim();
    if (slug) seen.add(slug);
  }
  return seen.size;
}

/**
 * Resolve `{ detectedTopic, detectedSubject }` from the grader into a canonical
 * context. Honest fallbacks (never invents a topic):
 *   - topic: the AI's detectedTopic canonicalised via `desktopTopicForWeakAreaKey`;
 *     an absent/unresolvable topic → empty slug (the caller stores it as
 *     full-subject, not a fabricated key).
 *   - subject: the resolved topic's subject (most reliable), else the AI's
 *     detectedSubject, else "Maths".
 */
export function resolveDetectedGradeTopic(
  graded: Pick<CheckSolutionResponse, "detectedTopic" | "detectedSubject">,
): DetectedGradeTopic {
  const resolved = graded.detectedTopic
    ? desktopTopicForWeakAreaKey(graded.detectedTopic)
    : undefined;
  const subject: DesktopSubject =
    (resolved?.subject as DesktopSubject | undefined) ??
    (graded.detectedSubject === "Science" ? "Science" : "Maths");
  return {
    subject,
    topicName: resolved?.name ?? "",
    topicSlug: resolved?.slug ?? "",
  };
}
