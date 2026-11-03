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
  // A fixed device clock, 9 days after the start: the test never reads the real clock.
  now: Date.parse("2026-10-10T05:00:00.000Z"),
};
const DAY = 24 * 60 * 60 * 1000;

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
    // TRIAL-CLOCK-1 — tier "free" alone is not a finished week.
    ["start unreadable", { trialStartDate: "k" }],
    ["only 6 days since the start", { now: Date.parse("2026-10-01T05:00:00.000Z") + 6 * DAY }],
    ["start AHEAD of a slow device clock (day 1, phone a day behind)", { now: Date.parse("2026-10-01T05:00:00.000Z") - DAY }],
  ])("%s -> no prompt", (_label, flip) => {
    expect(trialEndFeedbackKey({ ...YES, ...flip })).toBeNull();
  });
});

describe("TRIAL-CLOCK-1 · the week must actually have run", () => {
  it("exactly TRIAL_DAYS after the start -> the prompt applies", () => {
    expect(trialEndFeedbackKey({ ...YES, now: Date.parse(YES.trialStartDate) + 7 * DAY })).toBe(YES.trialStartDate);
  });
  it("one ms short of TRIAL_DAYS -> no prompt", () => {
    expect(trialEndFeedbackKey({ ...YES, now: Date.parse(YES.trialStartDate) + 7 * DAY - 1 })).toBeNull();
  });
});
