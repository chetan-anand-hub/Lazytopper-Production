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
 *     moves) — it is the "once per trial end" key.
 * The once-per-moment rule itself lives in feedbackPromptModel.ts (claimFeedbackMoment).
 *
 * It reads trial state and never writes it: no trial is started, ended or changed here.
 */
import { useEffect } from "react";
import { requestFeedbackPrompt } from "./feedbackPromptHost";

export interface TrialEndFeedbackInput {
  uid: string | null | undefined;
  hydrated: boolean | undefined;
  isTrialExpired: boolean | undefined;
  isPremium: boolean | undefined;
  trialStartDate: string | null | undefined;
}

/** Pure: should Home ask about the trial ending? Pinned by useTrialEndFeedback.test.ts. */
export function trialEndFeedbackKey(input: TrialEndFeedbackInput): string | null {
  if (!input.uid || input.hydrated !== true) return null;
  if (input.isTrialExpired !== true || input.isPremium === true) return null;
  return typeof input.trialStartDate === "string" && input.trialStartDate ? input.trialStartDate : null;
}

export function useTrialEndFeedback(input: TrialEndFeedbackInput): void {
  const key = trialEndFeedbackKey(input);
  const uid = input.uid ?? null;
  useEffect(() => {
    if (!key || !uid) return;
    void requestFeedbackPrompt("trial_end", { uid, trialKey: key });
  }, [key, uid]);
}
