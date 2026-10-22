import { describe, it, expect } from "vitest";
import { activityEventLabel, feedItemLabel, feedbackAnswers } from "./activityDetailModel";
import { allFeedbackActivityNames } from "../../components/feedback/feedbackPromptModel";

/** FEEDBACK-1 — the owner reads each student's answers in plain words. */
describe("admin labels for FEEDBACK-1", () => {
  it("every feedback name has a plain-words label (never the raw name)", () => {
    for (const n of allFeedbackActivityNames()) expect(activityEventLabel(n)).not.toBe(n);
  });

  it("labels say the moment and quote the exact words the student tapped", () => {
    expect(activityEventLabel("feedback_paywall_ask_parents")).toBe(
      "Feedback (after closing an upgrade screen): “My parents need to decide”",
    );
    expect(activityEventLabel("feedback_trial_end_price")).toBe(
      "Feedback (after the trial ended): “The price is too high for me right now”",
    );
    expect(activityEventLabel("feedback_shown_trial_end")).toBe("Was asked for feedback (after the trial ended)");
    expect(activityEventLabel("feedback_dismissed_paywall")).toBe(
      "Said No thanks to feedback (after closing an upgrade screen)",
    );
    expect(feedItemLabel({ t: 1, k: "event", n: "feedback_trial_end_boards_far" })).toContain("Boards still feel far away");
  });

  it("feedbackAnswers lists answers only (not shown/dismissed), newest day first, from exact counts", () => {
    const rows = feedbackAnswers([
      { day: "2026-10-10", activity: { events: { feedback_shown_paywall: 1, feedback_paywall_price: 1, check_graded: 3 } } },
      { day: "2026-10-12", activity: { events: { feedback_dismissed_trial_end: 1, feedback_trial_end_not_tried: 2 } } },
      { day: "2026-10-11", activity: null },
    ]);
    expect(rows.map((r) => [r.day, r.moment, r.reason, r.count])).toEqual([
      ["2026-10-12", "trial_end", "not_tried", 2],
      ["2026-10-10", "paywall", "price", 1],
    ]);
    expect(rows[1].label).toBe("The price is too high for me right now");
    expect(feedbackAnswers([])).toEqual([]);
  });
});
