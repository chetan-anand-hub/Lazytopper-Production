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

/** FEEDBACK-2 — the new answer, the repeat ask and what a student tapped next, in plain words. */
describe("admin labels for FEEDBACK-2", () => {
  it("Too easy, the repeat ask and every next action read in plain words", () => {
    expect(activityEventLabel("feedback_first_graded_too_easy")).toBe("Feedback (after the first graded result): “Too easy”");
    expect(activityEventLabel("feedback_shown_after_graded")).toBe("Was asked “Was this useful?” (after a later graded result)");
    expect(activityEventLabel("feedback_after_graded_not_really")).toBe("Feedback (after a later graded result): “Not really”");
    expect(activityEventLabel("feedback_after_graded_next_harder")).toBe(
      "After “Was this useful?” (after a later graded result): Tapped “Try 5 harder ones”",
    );
    expect(activityEventLabel("feedback_first_graded_next_note_saved")).toContain("Sent a “Tell us more” note");
    expect(activityEventLabel("feedback_first_graded_next_note_saved")).toContain("private");
  });

  it("feedbackAnswers lists too_easy and after_graded answers, never a next-step or a shown name", () => {
    const rows = feedbackAnswers([
      {
        day: "2026-10-24",
        activity: {
          events: {
            feedback_shown_after_graded: 1,
            feedback_after_graded_too_easy: 1,
            feedback_after_graded_next_harder: 1,
            feedback_first_graded_too_easy: 2,
          },
        },
      },
    ]);
    expect(rows.map((r) => [r.moment, r.reason, r.label, r.count]).sort()).toEqual([
      ["after_graded", "too_easy", "Too easy", 1],
      ["first_graded", "too_easy", "Too easy", 2],
    ]);
  });
});
