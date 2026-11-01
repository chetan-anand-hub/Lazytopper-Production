// TUTOR-STICKY-1 — when the trial summary applies, and that its numbers are the real ones.
import { describe, expect, it } from "vitest";
import { countTutorHelp, trialSummaryTiming, tutorHelpLine } from "./trialSummary";

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const ist = (y: number, mo: number, d: number, h = 0) => Date.UTC(y, mo - 1, d, h) - 5.5 * HOUR;
const START = ist(2026, 11, 1, 10);
const iso = new Date(START).toISOString();

describe("trialSummaryTiming", () => {
  it("applies on the last two IST days and the day it ends, not before, not after", () => {
    expect(trialSummaryTiming(iso, START + 3 * DAY)).toBeNull(); // day 4: 4 days left
    expect(trialSummaryTiming(iso, START + 4 * DAY)).toBeNull(); // day 5: 3 days left
    expect(trialSummaryTiming(iso, START + 5 * DAY)?.daysLeft).toBe(2);
    expect(trialSummaryTiming(iso, START + 6 * DAY)?.daysLeft).toBe(1);
    expect(trialSummaryTiming(iso, START + 7 * DAY - HOUR)?.daysLeft).toBe(0);
    expect(trialSummaryTiming(iso, START + 7 * DAY + HOUR)).toBeNull(); // ended
  });
  it("says nothing without a real start", () => {
    expect(trialSummaryTiming(null, START)).toBeNull();
    expect(trialSummaryTiming("nope", START)).toBeNull();
  });
});

describe("countTutorHelp / tutorHelpLine", () => {
  const ev = (topicKey: string, at: number) => ({ at, topicKey, subject: "science" as const });
  it("counts real doubts and distinct chapters", () => {
    const c = countTutorHelp([ev("electricity", 1), ev("electricity", 2), ev("light", 3)]);
    expect(c).toEqual({ questions: 3, chapters: 2 });
    expect(tutorHelpLine(c)).toBe("This week the tutor helped you with 3 questions across 2 chapters.");
  });
  it("uses singular honestly", () => {
    expect(tutorHelpLine({ questions: 1, chapters: 1 })).toBe("This week the tutor helped you with 1 question across 1 chapter.");
  });
  it("is zero for no events", () => {
    expect(countTutorHelp([])).toEqual({ questions: 0, chapters: 0 });
  });
});
