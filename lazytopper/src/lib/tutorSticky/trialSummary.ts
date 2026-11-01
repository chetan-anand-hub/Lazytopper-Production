/**
 * TUTOR-STICKY-1 — the PURE half of the trial-ending tutor summary: "This week the tutor helped you with N
 * questions across M chapters". N and M come only from the student's real, synced tutor doubts
 * (`getTutorTurnsFromCloud`: when and which chapter, never what). Nothing is estimated or rounded up; with
 * N = 0 there is no summary at all.
 */
import type { TutorTurnEvent } from "../../services/tutorSessionStore";
import { trialBannerTiming, type TrialBannerTiming } from "../../components/trial/trialEndBannerModel";

/** The summary shows for the last two days of a trial and on the day it ends (daysLeft 2, 1, 0). */
export const TRIAL_SUMMARY_DAYS_LEFT = 2;

/** When — if at all — the summary applies: an ACTIVE trial with at most two IST days left. */
export function trialSummaryTiming(trialStartIso: string | null | undefined, nowMs: number): TrialBannerTiming | null {
  const t = trialBannerTiming(trialStartIso, nowMs, 1);
  return t && t.daysLeft <= TRIAL_SUMMARY_DAYS_LEFT ? t : null;
}

export interface TutorTrialCounts {
  /** Questions the student asked the tutor (each doubt sent). */
  questions: number;
  /** Distinct chapters those questions were about. */
  chapters: number;
}

export function countTutorHelp(events: readonly TutorTurnEvent[]): TutorTrialCounts {
  return { questions: events.length, chapters: new Set(events.map((e) => e.topicKey)).size };
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** "This week the tutor helped you with 12 questions across 4 chapters." */
export function tutorHelpLine(c: TutorTrialCounts): string {
  return `This week the tutor helped you with ${plural(c.questions, "question", "questions")} across ${plural(c.chapters, "chapter", "chapters")}.`;
}

/** localStorage key prefix: the IST day this uid hid the summary ("hidden today" only, never trial state). */
export const TRIAL_SUMMARY_HIDDEN_PREFIX = "lazytopper.trialTutorSummaryHidden.";
