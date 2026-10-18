import { describe, it, expect } from "vitest";
import { trialEndFeedbackKey } from "./useTrialEndFeedback";

/**
 * FEEDBACK-1 — when Home asks about the trial ending. Each "no" is one condition flipped
 * from the "yes" row, so a function that always says no (or always yes) fails.
 */
const YES = {
  uid: "u1",
  hydrated: true,
  isTrialExpired: true,
  isPremium: false,
  trialStartDate: "2026-10-01T05:00:00.000Z",
};

describe("trialEndFeedbackKey", () => {
  it("ended trial, not paid, hydrated, signed in -> the trial's start is the key", () => {
    expect(trialEndFeedbackKey(YES)).toBe("2026-10-01T05:00:00.000Z");
  });

  it.each([
    ["signed out", { uid: null }],
    ["not hydrated yet (stale cache must not decide)", { hydrated: false }],
    ["hydration unknown (a mocked hook)", { hydrated: undefined }],
    ["trial still running / never started", { isTrialExpired: false }],
    ["paid", { isPremium: true }],
    ["trial not identifiable", { trialStartDate: null }],
  ])("%s -> no prompt", (_label, flip) => {
    expect(trialEndFeedbackKey({ ...YES, ...flip })).toBeNull();
  });
});
