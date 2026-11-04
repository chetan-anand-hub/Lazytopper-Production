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
      "In your free week: 3 answers checked, 1 test taken, 2 practice sets finished.",
    );
    expect(trialEndActivityLine({ checks: 1, tests: 0, practiceSets: 0 })).toBe("In your free week: 1 answer checked.");
    expect(trialEndActivityLine({ checks: 0, tests: 0, practiceSets: 0 })).toBeNull();
    expect(trialEndActivityLine(null)).toBeNull();
  });
});

// TRIAL-END-OFFER-1 - the founding line and the whole-day count, against the IST midnight the offer closes at.
describe("founding line and days left (TRIAL-END-OFFER-1)", () => {
  const IST_H = 60 * 60 * 1000;
  const ist = (mo: number, d: number, h = 0, mi = 0) => Date.UTC(2026, mo - 1, d, h, mi) - 5.5 * IST_H;
  const LINE = "Founding price \u20b91,917 till 30 Nov \u2014 \u20b92,499 from 1 Dec";

  it("shows the real deadline before, and on, 30 November; hides it from 1 December 00:00 IST", () => {
    expect(trialEndFoundingLine(ist(11, 4, 12))).toBe(LINE);
    // GST-EXCL-1 (owner, 4 Nov 18:20 IST): from 00:00 IST 5 Nov both figures read "+ GST".
    expect(trialEndFoundingLine(ist(11, 4, 23, 59))).toBe(LINE);
    const GST_LINE = "Founding price \u20b91,917 + GST till 30 Nov \u2014 \u20b92,499 + GST from 1 Dec";
    expect(trialEndFoundingLine(ist(11, 5, 0, 0))).toBe(GST_LINE);
    expect(trialEndFoundingLine(ist(11, 30, 23, 59))).toBe(GST_LINE);
    expect(trialEndFoundingLine(ist(12, 1, 0, 0))).toBeNull();
    expect(trialEndFoundingLine(ist(12, 20, 12))).toBeNull();
    expect(trialEndFoundingLine(Number.NaN)).toBeNull();
  });

  it("counts whole IST days, today included, with no off-by-one at midnight", () => {
    expect(foundingDaysLeft(ist(11, 30, 23, 59))).toBe(1); // the last minute
    expect(foundingDaysLeft(ist(11, 30, 0, 0))).toBe(1); // 30 Nov, first minute
    expect(foundingDaysLeft(ist(11, 29, 23, 59))).toBe(2); // 29 Nov, last minute
    expect(foundingDaysLeft(ist(11, 29, 0, 0))).toBe(2);
    expect(foundingDaysLeft(ist(11, 4, 15, 55))).toBe(27); // 4 Nov .. 30 Nov inclusive
    expect(foundingDaysLeft(ist(12, 1, 0, 0))).toBeNull();
  });

  it("words it plainly, singular and plural, and says nothing once the offer has closed", () => {
    expect(foundingDaysLeftLine(ist(11, 4, 12))).toBe("27 days left at this price");
    expect(foundingDaysLeftLine(ist(11, 30, 9))).toBe("1 day left at this price");
    expect(foundingDaysLeftLine(ist(12, 1, 9))).toBeNull();
  });
});
