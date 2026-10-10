// src/pages/tutor/tutorContextBrief.ts
// Client-assembled tutor context brief (owner decision #4: CLIENT-ASSEMBLES). The
// React client reads MI + progress READ-ONLY, distills a compact brief, and passes
// it to the stateless /api/tutor endpoint, which injects it into the system prompt.
// The server stays stateless, so the honesty guard (D-TUT-8) is structural — the
// tutor cannot write a grade/score.
//
// ME-ENGINE-1 PR-2 (G2) — THE BRIEF READS THE SHARED MODEL. Every figure comes from ONE
// `readStudyModel` read (services/progressReadModel) — the read Me/Progress makes — for the SAME
// window (Me's default, `TUTOR_BRIEF_WINDOW`) and the SAME paper, through the model's ONE
// canonicaliser (`boardChapterKey`, the 26 board chapters) and its honesty gates. So the Tutor
// and Me can no longer disagree. Gone: the DEVICE-LOCAL weak areas (`getWeakAreas`, which also
// WROTE two Firestore docs on every build), the 120-day trend read, and the 14-day both-papers
// MI insight. No mastery or per-concept percentage is sent (A-17 ruling 6). ME-CONCEPT-1 (PR-3):
// the brief names at most 3 of the chapter's weakest EXAM TRENDS concepts — the concepts of its
// real, synced live mistakes, each resolved through the mistake's questionId by the read model
// (`weakestExamConcepts` over `mistakes.byConcept`; an unresolvable mistake names nothing, never
// its raw label) — and only above Me's weakness gate (PR-2b), or nothing. Names only, no figure.

import {
  ME_DEFAULT_WINDOW,
  boardChapterKey,
  readStudyModel,
  topLossGroup,
  weakestExamConcepts,
  weaknessNamingRung,
  type ReadWindow,
  type StudyReadModel,
} from "../../services/progressReadModel";
import type { TutorBrief } from "../../ai/tutorClient";
import { mistakeGroupByKey, mistakeGroupOf, mistakeTypeLabel } from "../../lib/mistakeDisplay";

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

/**
 * The window the brief reads: Me/Progress's default window — the read model's ONE constant, which
 * `MeProgressPage` also opens on (imported by both, never copied; OWNER RULING 2026-10-06). The
 * Tutor has no window picker, so it speaks for the window a student sees first on Me.
 */
export const TUTOR_BRIEF_WINDOW: ReadWindow = ME_DEFAULT_WINDOW;
const TREND_EPSILON = 2; // pct-points that count as real movement (else "stable")
/** At most this many weak concepts are named. */
const MAX_WEAK_CONCEPTS = 3;

export interface AssembleBriefArgs {
  uid: string | null;
  /** Topic slug as it arrives from the route — canonicalized inside (boardChapterKey). */
  topicKey: string;
  subject: "maths" | "science" | "";
  /** The read window — Me's default unless a caller (the G3 pin) names another. */
  window?: ReadWindow;
  /** Testability seam — NOT a product parameter. */
  nowMs?: number;
}

/**
 * The brief, from ONE model read — pure, so the G3 pin can hold it against Me and the model.
 * Every field mirrors what Me shows for the same paper and window:
 *   - `mistakes.marksLostRecent` = Me's "marks on the table" (the ungated total), and
 *     `mistakes.topType` = the group that cost the most marks in Me's hero split — BOTH only when
 *     Me names a weakness (`weaknessNamingRung`, Me's gate); below that gate, nothing;
 *   - `topic.trend` = the direction of the chapter's gated rung (±2 points dead-band), the rung
 *     Me's chapter list prints; no rung → no trend;
 *   - `topic.weakConcepts` = the chapter's weakest Exam Trends concepts (≤ 3) — the concepts of
 *     its LIVE synced mistakes, resolved through each mistake's questionId, by the marks not yet
 *     won back (ME-CONCEPT-1) — under the SAME gate (PR-2b): below it, none. Never a percentage,
 *     never invented, never a raw bank label.
 */
export function briefFromModel(model: StudyReadModel, chapterKey: string): TutorBrief {
  const brief: TutorBrief = { hasData: false, topic: {}, mistakes: {} };

  const rung = chapterKey ? model.progress.topics.find((r) => r.key === chapterKey) : undefined;
  if (rung) {
    const d = rung.delta;
    brief.topic.trend = d > TREND_EPSILON ? "improving" : d < -TREND_EPSILON ? "worsening" : "stable";
  }

  // ME-ENGINE-1 PR-2b — ONE gate for naming a weakness: Me's (`weaknessNamingRung`, the read
  // model). Below it Me says "We will not name a weakness from one or two questions", so the
  // brief names NOTHING either — no figure, no mistake group and no concept label (the labels
  // are real, but naming them is naming a weakness) [FU-ME2-BRIEF-CONCEPTS-BELOW-GATE].
  const namingRung = weaknessNamingRung(model);
  if (namingRung) {
    // ME-CONCEPT-1 — the chapter's weakest Exam Trends concepts from the model's per-concept
    // mistakes (the same rows Me's Concepts tab carries). Names only — no percentage, no mastery.
    const weak = weakestExamConcepts(model.mistakes, chapterKey, MAX_WEAK_CONCEPTS);
    if (weak.length) brief.topic.weakConcepts = weak;

    if (model.progress.totals) {
      brief.mistakes.marksLostRecent = model.progress.totals.marksLost;
      const top = topLossGroup(model.mistakes.byGroup);
      if (top) brief.mistakes.topType = mistakeGroupByKey(top).label.toLowerCase();
    }
  }

  brief.hasData = Boolean(brief.topic.trend || (brief.topic.weakConcepts && brief.topic.weakConcepts.length) || brief.mistakes.topType);
  return brief;
}

/**
 * Distill a compact, honest brief from the shared model. A failed read never breaks the tutor —
 * it yields hasData:false, and the server is then told to reference no performance and invent
 * nothing. Read-only: nothing here writes.
 */
export async function assembleTutorBrief({
  uid,
  topicKey,
  subject,
  window = TUTOR_BRIEF_WINDOW,
  nowMs,
}: AssembleBriefArgs): Promise<TutorBrief> {
  const empty: TutorBrief = { hasData: false, topic: {}, mistakes: {} };
  if (!uid) return empty;
  const chapterKey = boardChapterKey(topicKey);
  try {
    const model = await readStudyModel(uid, {
      window,
      ...(subject ? { subject } : {}),
      tutor: false,
      ...(typeof nowMs === "number" ? { nowMs } : {}),
    });
    return briefFromModel(model, chapterKey);
  } catch {
    return empty; /* honest-or-silent */
  }
}
