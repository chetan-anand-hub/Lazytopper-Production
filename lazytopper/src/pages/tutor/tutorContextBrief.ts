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
import { mistakeGroupOf, mistakeTypeLabel } from "../../lib/mistakeDisplay";

/**
 * SCORECARD-MI-1 (B3) — the top type as the tutor should hear it: by its owner GROUP, so a
 * careless slip is never framed as a knowledge gap ("careless (calculation slip)"). The stored
 * type name never changes; only how it is described. Unknown → the raw value, unchanged.
 */
export function describeTopMistakeType(type: unknown): string {
  const group = mistakeGroupOf(type);
  const label = mistakeTypeLabel(type);
  return group && label ? `${group.label.toLowerCase()} (${label.toLowerCase()})` : String(type ?? "");
}

/** The suffix the brief adds when the top type was decided on MARKS (SCORECARD-MI-1 PR-2). */
// The server renders the brief as "Most common recent slip: <topType> mistakes."
// (server/prompts/tutorSystemPrompt.cjs, outside this lane), so a suffix here would read as a
// broken sentence to the tutor. The TYPE now comes from marks (the real biggest loss); the
// wording of that server line is FU-B15-TUTOR-BRIEF-SERVER-WORDING. No suffix is added.
export const MARKS_BASIS_SUFFIX = "";

/**
 * SCORECARD-MI-1 PR-2 (B7) — the brief's `topType` string. The insight now picks the type that
 * cost the most MARKS whenever v2 entries exist, so the tutor coaches the real biggest loss;
 * when that is the basis the string says so, briefly, inside the existing field (the TutorBrief
 * shape is unchanged). A count-based top type reads exactly as before.
 */
export function describeBriefTopType(type: unknown, basis: "marks" | "counts" | null | undefined): string {
  const described = describeTopMistakeType(type);
  return basis === "marks" && described ? `${described}${MARKS_BASIS_SUFFIX}` : described;
}

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

  // Weak areas (sync, device-local) — weak sub-topics for THIS topic.
  // A17 owner ruling 6 (GRADING-JOBS-1): NO MASTERY FIGURE is sent. The weak-area mastery
  // value is not a real mastery measure (a topic with no graded work reads "0%"), so the tutor
  // was told an invented "0% mastery". `masteryPercent` / `masteryState` stay unset until a
  // real mastery signal exists (ME-ENGINE-1), and nothing here counts towards `hasData` unless
  // it is real (weak concepts named by graded work, a trend, a mistake type).
  try {
    const summary = getWeakAreas(waSubject ? { subject: waSubject } : undefined);
    const match = summary.weakAreas.find(
      (w) => (resolveCanonicalSlug(w.topicKey) || w.topicKey) === canonical,
    );
    if (match) {
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

  // Mistake Intelligence (cross-device, subject-level) — the biggest recent loss: by MARKS
  // when the window holds v2 entries, else by count (the insight decides; we only describe).
  try {
    const mi = await getMistakeInsights(uid, MI_WINDOW_DAYS);
    if (mi && mi.hasEnoughData) {
      if (mi.topMistakeType) brief.mistakes.topType = describeBriefTopType(mi.topMistakeType, mi.topMistakeBasis);
      if (typeof mi.totalMarksLost === "number") brief.mistakes.marksLostRecent = mi.totalMarksLost;
    }
  } catch {
    /* honest-or-silent: no MI */
  }

  brief.hasData = Boolean(
    brief.topic.trend ||
      (brief.topic.weakConcepts && brief.topic.weakConcepts.length) ||
      brief.mistakes.topType,
  );
  return brief;
}
