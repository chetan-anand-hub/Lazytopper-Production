import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetTrialEndScreenForTests,
  feedbackShouldDeferToScreen,
  markTrialEndScreenShownThisLoad,
  foundingDaysLeft,
  foundingDaysLeftLine,
  trialEndActivityLine,
  trialEndFoundingLine,
  trialEndScreenKey,
  trialEndScreenPathAllowed,
  trialEndScreenSeen,
  writeTrialEndScreen,
} from "./trialEndScreenModel";
import { trialEndFeedbackKey } from "../feedback/useTrialEndFeedback";

const base = { plan: "trial_7day", uid: "u", hydrated: true, isTrialExpired: true, isPremium: false, trialStartDate: "2026-06-01T04:30:00.000Z", pathname: "/browse", now: Date.parse("2026-06-09T04:30:00.000Z") };
const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  localStorage.clear();
  __resetTrialEndScreenForTests();
});

describe("trialEndScreenKey", () => {
  it("is the trial key only for a hydrated, signed-in, expired, unpaid student on an allowed route", () => {
    expect(trialEndScreenKey(base)).toBe(base.trialStartDate);
    expect(trialEndScreenKey({ ...base, uid: null })).toBeNull();
    expect(trialEndScreenKey({ ...base, hydrated: false })).toBeNull();
    expect(trialEndScreenKey({ ...base, isTrialExpired: false })).toBeNull();
    expect(trialEndScreenKey({ ...base, isPremium: true })).toBeNull();
    expect(trialEndScreenKey({ ...base, trialStartDate: null })).toBeNull();
    expect(trialEndScreenKey({ ...base, pathname: "/pricing" })).toBeNull();
    expect(trialEndScreenKey({ ...base, plan: "pass_month" })).toBeNull(); // a paid pass that ran out
    // TRIAL-CLOCK-1 — the week must have run by this device's clock, not tier "free" alone.
    expect(trialEndScreenKey({ ...base, now: Date.parse(base.trialStartDate) - DAY })).toBeNull(); // phone a day slow, day 1
    expect(trialEndScreenKey({ ...base, now: Date.parse(base.trialStartDate) + 6 * DAY })).toBeNull();
    expect(trialEndScreenKey({ ...base, trialStartDate: "not-a-date" })).toBeNull();
    expect(trialEndScreenKey({ ...base, premiumSince: "2026-06-02T00:00:00Z" })).toBeNull();
    expect(trialEndScreenKey({ ...base, passEnd: "2026-07-02T00:00:00Z" })).toBeNull();
    expect(trialEndScreenKey({ ...base, plan: undefined })).toBeNull();
    expect(trialEndScreenPathAllowed("/admin/students")).toBe(false);
    expect(trialEndScreenPathAllowed("/practice")).toBe(true);
  });
});

describe("seen + feedback deferral", () => {
  it("remembers per uid and per trial; a different trial is a new ask", () => {
    expect(trialEndScreenSeen("u", "k1")).toBe(false);
    expect(writeTrialEndScreen("u", "k1")).toBe(true);
    expect(trialEndScreenSeen("u", "k1")).toBe(true);
    expect(trialEndScreenSeen("u", "k2")).toBe(false);
    expect(trialEndScreenSeen("other", "k1")).toBe(false);
  });
  it("the feedback card holds back until the screen has been seen, and while it is on screen", () => {
    expect(feedbackShouldDeferToScreen("u", "k1")).toBe(true); // not yet shown
    writeTrialEndScreen("u", "k1");
    expect(feedbackShouldDeferToScreen("u", "k1")).toBe(false); // a later load
    markTrialEndScreenShownThisLoad();
    expect(feedbackShouldDeferToScreen("u", "k1")).toBe(true); // on screen now
    expect(feedbackShouldDeferToScreen(null, "k1")).toBe(false);
  });
  it("trialEndFeedbackKey honours deferToScreen and is unchanged without it", () => {
    const k = "2026-06-01T04:30:00.000Z";
    const i = { uid: "u", hydrated: true, isTrialExpired: true, isPremium: false, trialStartDate: k, now: Date.parse(k) + 8 * DAY };
    expect(trialEndFeedbackKey(i)).toBe(k);
    expect(trialEndFeedbackKey({ ...i, deferToScreen: true })).toBeNull();
    expect(trialEndFeedbackKey({ ...i, deferToScreen: false })).toBe(k);
  });
});

describe("trialEndActivityLine", () => {
  it("real counts, plural-aware; nothing real to say (zero or unreadable) means NO line", () => {
    expect(trialEndActivityLine({ checks: 3, tests: 1, practiceSets: 2 })).toBe(
      "In your free trial: 3 answers checked, 1 test taken, 2 practice sets finished.",
    );
    expect(trialEndActivityLine({ checks: 1, tests: 0, practiceSets: 0 })).toBe("In your free trial: 1 answer checked.");
    expect(trialEndActivityLine({ checks: 0, tests: 0, practiceSets: 0 })).toBeNull();
    expect(trialEndActivityLine(null)).toBeNull();
  });
});

// TRIAL-END-OFFER-1 / PRICE-HOLD-1 - the founding line and the whole-day count are RETIRED: the price has no end, so neither renders on any date.
describe("founding line and days left (PRICE-HOLD-1: none)", () => {
  const IST_H = 60 * 60 * 1000;
  const ist = (mo: number, d: number, h = 0, mi = 0) => Date.UTC(2026, mo - 1, d, h, mi) - 5.5 * IST_H;

  it("shows NO deadline line on any date - before, on and after 30 November / 1 December", () => {
    for (const t of [ist(11, 4, 12), ist(11, 6, 23, 59), ist(11, 7, 0, 0), ist(11, 30, 23, 59), ist(12, 1, 0, 0), ist(12, 20, 12)]) {
      expect(trialEndFoundingLine(t), String(t)).toBeNull();
    }
    expect(trialEndFoundingLine(Number.NaN)).toBeNull();
  });

  it("counts NO days left on any date", () => {
    for (const t of [ist(11, 30, 23, 59), ist(11, 30, 0, 0), ist(11, 29, 23, 59), ist(11, 4, 15, 55), ist(12, 1, 0, 0)]) {
      expect(foundingDaysLeft(t), String(t)).toBeNull();
    }
  });

  it("says nothing about days left, singular or plural, on any date", () => {
    for (const t of [ist(11, 4, 12), ist(11, 30, 9), ist(12, 1, 9)]) expect(foundingDaysLeftLine(t), String(t)).toBeNull();
  });
});
