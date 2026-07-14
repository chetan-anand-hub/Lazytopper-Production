// src/pages/tutor/tutorContextBrief.ts
// Client-assembled tutor context brief (owner decision #4: CLIENT-ASSEMBLES). The
// React client reads MI + progress READ-ONLY, distills a compact brief, and passes
// it to the stateless /api/tutor endpoint, which injects it into the system prompt.
// The server stays stateless, so the honesty guard (D-TUT-8) is structural — the
// tutor cannot write a grade/score.
//
// CANONICAL KEYS (D-TUT-14, the progress-saga lesson): every topic key is normalized
// through resolveCanonicalSlug — the SINGLE authority. We deliberately do NOT touch
// the rival resolveCanonicalTopicKey (topicAliasMap) the old tutor used; mixing the
// two is the "two canonicalizers -> silent miss" trap.

import { resolveCanonicalSlug } from "../../data/syllabus/canonicalTopicSlug";
import { getMistakeInsights } from "../../services/mistakeInsightsService";
import { getWeakAreas } from "../../services/weakAreaAggregator";
import { getTopicTrendFromCloud } from "../../services/progressStore";
import type { TutorBrief } from "../../ai/tutorClient";

const MI_WINDOW_DAYS = 14;
const TREND_EPSILON = 2; // pct-points that count as real movement (else "stable")

export interface AssembleBriefArgs {
  uid: string | null;
  /** Topic slug as it arrives from the route — canonicalized inside. */
  topicKey: string;
  subject: "maths" | "science" | "";
}

/**
 * Distill a compact, honest brief. Every read is wrapped so a single failure never
 * breaks the tutor — a thin/absent signal simply yields hasData:false, and the
 * server is then told to reference no performance and invent nothing.
 */
export async function assembleTutorBrief({
  uid,
  topicKey,
  subject,
}: AssembleBriefArgs): Promise<TutorBrief> {
  const brief: TutorBrief = { hasData: false, topic: {}, mistakes: {} };
  if (!uid) return brief;

  const canonical = resolveCanonicalSlug(topicKey) || topicKey;
  const waSubject = subject === "science" ? "Science" : subject === "maths" ? "Maths" : undefined;

  // Weak areas (sync, device-local) — mastery + weak sub-topics for THIS topic.
  try {
    const summary = getWeakAreas(waSubject ? { subject: waSubject } : undefined);
    const match = summary.weakAreas.find(
      (w) => (resolveCanonicalSlug(w.topicKey) || w.topicKey) === canonical,
    );
    if (match) {
      if (typeof match.masteryPercent === "number") brief.topic.masteryPercent = match.masteryPercent;
      if (match.masteryState) brief.topic.masteryState = String(match.masteryState);
      if (Array.isArray(match.weakConcepts) && match.weakConcepts.length) {
        brief.topic.weakConcepts = match.weakConcepts.slice(0, 3);
      }
    }
  } catch {
    /* honest-or-silent: no weak-area signal */
  }

  // Per-topic trajectory (cross-device) — improving / worsening / stable.
  try {
    const cloud = await getTopicTrendFromCloud(canonical, "4mo", uid);
    if (cloud && cloud.trend) {
      const d = cloud.trend.delta;
      brief.topic.trend = d > TREND_EPSILON ? "improving" : d < -TREND_EPSILON ? "worsening" : "stable";
    }
  } catch {
    /* honest-or-silent: no trend */
  }

  // Mistake Intelligence (cross-device, subject-level) — dominant recent slip.
  try {
    const mi = await getMistakeInsights(uid, MI_WINDOW_DAYS);
    if (mi && mi.hasEnoughData) {
      if (mi.topMistakeType) brief.mistakes.topType = String(mi.topMistakeType);
      if (typeof mi.totalMarksLost === "number") brief.mistakes.marksLostRecent = mi.totalMarksLost;
    }
  } catch {
    /* honest-or-silent: no MI */
  }

  brief.hasData = Boolean(
    brief.topic.masteryPercent != null ||
      brief.topic.trend ||
      (brief.topic.weakConcepts && brief.topic.weakConcepts.length) ||
      brief.mistakes.topType,
  );
  return brief;
}
