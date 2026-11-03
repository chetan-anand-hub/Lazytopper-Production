/**
 * useTrialEndFeedback — FEEDBACK-1's trial-end moment, mounted on Home (DesktopHome and
 * MobileHome), the page a signed-in student lands on when they open the app.
 *
 * Fires the prompt ONLY when all of these hold:
 *   - a signed-in student (uid);
 *   - the subscription record has been HYDRATED from the cloud for this uid — a stale
 *     local cache must never decide that a trial ended;
 *   - the trial has ended (`isTrialExpired`: a trial was started and the tier is back to
 *     free) and the student has NOT paid (`!isPremium`);
 *   - the trial is identifiable (`trialStartDate`, the server-set timestamp that never
 *     moves) — it is the "once per trial end" key;
 *   - TRIAL-CLOCK-1: that start is at least TRIAL_DAYS in the past. `tier === "free"` alone
 *     is not evidence a week passed: a phone whose clock runs slow read a day-1 server start
 *     as "in the future", failed it closed, and showed a student "Your free week is over".
 * The once-per-moment rule itself lives in feedbackPromptModel.ts (claimFeedbackMoment).
 *
 * It reads trial state and never writes it: no trial is started, ended or changed here.
 */
import { useEffect } from "react";
import { requestFeedbackPrompt } from "./feedbackPromptHost";
import { trialHasRunItsCourse } from "../../services/subscriptionService";

export interface TrialEndFeedbackInput {
  uid: string | null | undefined;
  hydrated: boolean | undefined;
  isTrialExpired: boolean | undefined;
  isPremium: boolean | undefined;
  trialStartDate: string | null | undefined;
  /**
   * ASK-FIX-1 — true while the trial-ended screen has yet to be shown (or is on screen): the
   * screen makes the ask first and this card follows "Continue with Basic". Omitted = no hold.
   */
  deferToScreen?: boolean;
  /** Test seam: the device clock, epoch ms. Defaults to Date.now(). */
  now?: number;
}

/** Pure: should Home ask about the trial ending? Pinned by useTrialEndFeedback.test.ts. */
export function trialEndFeedbackKey(input: TrialEndFeedbackInput): string | null {
  if (!input.uid || input.hydrated !== true) return null;
  if (input.isTrialExpired !== true || input.isPremium === true) return null;
  if (input.deferToScreen === true) return null;
  if (typeof input.trialStartDate !== "string" || !input.trialStartDate) return null;
  if (!trialHasRunItsCourse(input.trialStartDate, input.now ?? Date.now())) return null;
  return input.trialStartDate;
}

export function useTrialEndFeedback(input: TrialEndFeedbackInput): void {
  const key = trialEndFeedbackKey(input);
  const uid = input.uid ?? null;
  useEffect(() => {
    if (!key || !uid) return;
    void requestFeedbackPrompt("trial_end", { uid, trialKey: key });
  }, [key, uid]);
}
