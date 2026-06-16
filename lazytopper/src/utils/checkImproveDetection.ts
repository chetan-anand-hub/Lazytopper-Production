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
import type { CheckSolutionResponse } from "../ai/aiClient";

export interface DetectedGradeTopic {
  subject: DesktopSubject;
  /** Canonical topic display name, or "" when no topic resolved. */
  topicName: string;
  /** Canonical topics.ts slug, or "" when no topic resolved (→ full-subject). */
  topicSlug: string;
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
