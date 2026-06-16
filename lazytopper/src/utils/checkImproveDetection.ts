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
import type { CheckSolutionResponse, DetectQuestionResponse } from "../ai/aiClient";

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
