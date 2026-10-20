import { describe, it, expect } from "vitest";
import {
  FEEDBACK_COPY,
  FEEDBACK_REASONS,
  PAYWALL_COOLDOWN_MS,
  QUIET_PERIOD_MS,
  allFeedbackActivityNames,
  claimFeedbackMoment,
  feedbackActivityName,
  feedbackStorageKey,
  feedbackVendorName,
  parseFeedbackRecord,
  shouldShowFeedback,
  type FeedbackStore,
} from "./feedbackPromptModel";
import { ACTIVITY_EVENTS } from "../../services/activityClient";

/**
 * FEEDBACK-1 — the once-per-moment rule, the fail-closed store, and the event names.
 * Every "not shown" assertion is paired with a control that IS shown, so a rule that
 * always says no cannot pass.
 */

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.parse("2026-10-18T06:00:00.000Z");

function memStore(): FeedbackStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
}

describe("FEEDBACK-1 · paywall moment — at most once per student per 7 days", () => {
  it("shows the first time, then not again inside 7 days, then again after 7 days", () => {
    const s = memStore();
    expect(claimFeedbackMoment(s, "u1", "paywall", T0)).toBe(true);
    expect(claimFeedbackMoment(s, "u1", "paywall", T0 + 2 * DAY)).toBe(false);
    expect(claimFeedbackMoment(s, "u1", "paywall", T0 + PAYWALL_COOLDOWN_MS - 1)).toBe(false);
    expect(claimFeedbackMoment(s, "u1", "paywall", T0 + PAYWALL_COOLDOWN_MS)).toBe(true);
  });

  it("is per student: another uid on the same device is asked independently", () => {
    const s = memStore();
    expect(claimFeedbackMoment(s, "u1", "paywall", T0)).toBe(true);
    expect(claimFeedbackMoment(s, "u2", "paywall", T0 + 1)).toBe(true);
    expect(s.map.has(feedbackStorageKey("u1"))).toBe(true);
    expect(s.map.has(feedbackStorageKey("u2"))).toBe(true);
  });
});

describe("FEEDBACK-1 · trial-end moment — once per trial end", () => {
  const TRIAL = "2026-10-01T05:00:00.000Z";

  it("shows once for a trial, never again for the same trial, however long after", () => {
    const s = memStore();
    expect(claimFeedbackMoment(s, "u1", "trial_end", T0, TRIAL)).toBe(true);
    expect(claimFeedbackMoment(s, "u1", "trial_end", T0 + 2 * DAY, TRIAL)).toBe(false);
    expect(claimFeedbackMoment(s, "u1", "trial_end", T0 + 400 * DAY, TRIAL)).toBe(false);
  });

  it("needs an identifiable trial: no key -> no prompt (control: with a key -> prompt)", () => {
    expect(shouldShowFeedback({}, "trial_end", T0, null)).toBe(false);
    expect(shouldShowFeedback({}, "trial_end", T0, "")).toBe(false);
    expect(shouldShowFeedback({}, "trial_end", T0, TRIAL)).toBe(true);
  });
});

describe("FEEDBACK-1 · never two prompts within 24 hours, across moments", () => {
  it("a paywall prompt holds back the trial-end prompt for 24 h, then lets it through once", () => {
    const s = memStore();
    const TRIAL = "2026-10-01T05:00:00.000Z";
    expect(claimFeedbackMoment(s, "u1", "paywall", T0)).toBe(true);
    expect(claimFeedbackMoment(s, "u1", "trial_end", T0 + QUIET_PERIOD_MS - 1, TRIAL)).toBe(false);
    expect(claimFeedbackMoment(s, "u1", "trial_end", T0 + QUIET_PERIOD_MS, TRIAL)).toBe(true);
    expect(claimFeedbackMoment(s, "u1", "trial_end", T0 + 3 * QUIET_PERIOD_MS, TRIAL)).toBe(false);
  });

  it("a record time in the future (wrong clock) only makes the prompt rarer", () => {
    expect(shouldShowFeedback({ l: T0 + 5 * DAY, p: T0 + 5 * DAY }, "paywall", T0)).toBe(false);
    expect(shouldShowFeedback({}, "paywall", T0)).toBe(true);
  });
});

describe("FEEDBACK-1 · fail closed — a device that cannot remember gets no prompt", () => {
  it("no store, no uid, a throwing read, a throwing write, or a write that does not stick -> false", () => {
    expect(claimFeedbackMoment(null, "u1", "paywall", T0)).toBe(false);
    expect(claimFeedbackMoment(memStore(), "", "paywall", T0)).toBe(false);
    const throwsRead: FeedbackStore = { getItem: () => { throw new Error("blocked"); }, setItem: () => {} };
    expect(claimFeedbackMoment(throwsRead, "u1", "paywall", T0)).toBe(false);
    const throwsWrite: FeedbackStore = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
    expect(claimFeedbackMoment(throwsWrite, "u1", "paywall", T0)).toBe(false);
    const drops: FeedbackStore = { getItem: () => null, setItem: () => {} };
    expect(claimFeedbackMoment(drops, "u1", "paywall", T0)).toBe(false);
    // control
    expect(claimFeedbackMoment(memStore(), "u1", "paywall", T0)).toBe(true);
  });

  it("a corrupt record is read as empty, never as a crash", () => {
    expect(parseFeedbackRecord("{not json")).toEqual({});
    expect(parseFeedbackRecord("[1,2]")).toEqual({});
    expect(parseFeedbackRecord(JSON.stringify({ p: "x", t: 5, l: 3 }))).toEqual({ l: 3 });
  });

  it("the stored record holds only the three timing fields — never an answer", () => {
    const s = memStore();
    claimFeedbackMoment(s, "u1", "trial_end", T0, "2026-10-01T05:00:00.000Z");
    const stored = JSON.parse(s.map.get(feedbackStorageKey("u1"))!);
    expect(Object.keys(stored).sort()).toEqual(["l", "t"]);
  });
});

describe("FEEDBACK-1 · names and copy", () => {
  it("activity names carry moment and reason; vendor names are generic", () => {
    expect(feedbackActivityName("shown", "paywall")).toBe("feedback_shown_paywall");
    expect(feedbackActivityName("dismissed", "trial_end")).toBe("feedback_dismissed_trial_end");
    expect(feedbackActivityName("reason", "trial_end", "ask_parents")).toBe("feedback_trial_end_ask_parents");
    expect(feedbackVendorName("reason")).toBe("feedback_reason");
    expect(feedbackVendorName("shown")).toBe("feedback_shown");
    expect(feedbackVendorName("dismissed")).toBe("feedback_dismissed");
  });

  it("every name the prompt can record is in the activity allow-list (18 names, incl. the 2 call taps, + FIRST-FEEDBACK-1's 5)", () => {
    const names = allFeedbackActivityNames();
    expect(names).toHaveLength(23);
    for (const n of names) expect(ACTIVITY_EVENTS as readonly string[]).toContain(n);
  });

  it("six one-tap reasons in the ruled order; warm copy, no money or urgency words in title/thanks", () => {
    expect(FEEDBACK_REASONS.map((r) => r.code)).toEqual([
      "not_tried",
      "ask_parents",
      "price",
      "not_enough_help",
      "boards_far",
      "other",
    ]);
    for (const text of [FEEDBACK_COPY.title, FEEDBACK_COPY.subtitle, FEEDBACK_COPY.thanks]) {
      expect(text).not.toMatch(/pay|paid|premium|upgrade|₹|offer|hurry|only today|last chance/i);
    }
  });
});
