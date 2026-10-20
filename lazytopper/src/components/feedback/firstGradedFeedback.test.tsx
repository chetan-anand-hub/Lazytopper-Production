import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { FeedbackPrompt } from "./FeedbackPrompt";
import {
  FEEDBACK_COPY,
  FIRST_GRADED_ANSWERS,
  FIRST_GRADED_COPY,
  QUIET_PERIOD_MS,
  allFeedbackActivityNames,
  claimFeedbackMoment,
  feedbackActivityName,
  feedbackReasonsFor,
  feedbackStorageKey,
  FEEDBACK_REASONS,
  type FeedbackStore,
} from "./feedbackPromptModel";
import { FIRST_GRADED_DELAY_MS, isFirstGradedEligible } from "./useFirstGradedFeedback";
import { ACTIVITY_EVENTS } from "../../services/activityClient";
import { activityEventLabel, feedbackAnswers } from "../../pages/admin/activityDetailModel";

/**
 * FIRST-FEEDBACK-1 — "Was this useful?" after the first graded result. Every "not shown"
 * assertion is paired with a control that IS shown, so a rule that always says no fails.
 * The host + scorecard-shell tests read the clock, so they live in feedbackPromptHost.test.tsx
 * (already on the clock-guard list).
 */

const T0 = Date.parse("2026-10-20T06:00:00.000Z");
const FIVE_NAMES = [
  "feedback_shown_first_graded",
  "feedback_dismissed_first_graded",
  "feedback_first_graded_yes",
  "feedback_first_graded_not_really",
  "feedback_first_graded_too_hard",
];

function memStore(): FeedbackStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("FIRST-FEEDBACK-1 · once ever, exempt from the 24 h gap", () => {
  it("shows once for a student, never again however long after; another uid is asked independently", () => {
    const s = memStore();
    expect(claimFeedbackMoment(s, "u1", "first_graded", T0)).toBe(true);
    expect(claimFeedbackMoment(s, "u1", "first_graded", T0 + 1)).toBe(false);
    expect(claimFeedbackMoment(s, "u1", "first_graded", T0 + 400 * QUIET_PERIOD_MS)).toBe(false);
    expect(claimFeedbackMoment(s, "u2", "first_graded", T0 + 1)).toBe(true);
  });

  it("a paywall prompt a minute ago does NOT hold it back (control: the trial-end prompt IS held back)", () => {
    const s = memStore();
    expect(claimFeedbackMoment(s, "u1", "paywall", T0)).toBe(true);
    expect(claimFeedbackMoment(s, "u1", "trial_end", T0 + 60_000, "trial-A")).toBe(false);
    expect(claimFeedbackMoment(s, "u1", "first_graded", T0 + 60_000)).toBe(true);
  });

  it("stores only timing fields (`g` + `l`), never an answer; fails closed on a throwing store", () => {
    const s = memStore();
    claimFeedbackMoment(s, "u1", "first_graded", T0);
    expect(Object.keys(JSON.parse(s.map.get(feedbackStorageKey("u1"))!)).sort()).toEqual(["g", "l"]);
    const throwing: FeedbackStore = { getItem: () => null, setItem: () => { throw new Error("full"); } };
    expect(claimFeedbackMoment(throwing, "u1", "first_graded", T0)).toBe(false);
    expect(claimFeedbackMoment(memStore(), "", "first_graded", T0)).toBe(false);
  });
});

describe("FIRST-FEEDBACK-1 · names, copy, allow-lists, admin labels", () => {
  it("the five names follow the existing pattern and are in the client allow-list; no call-tap name", () => {
    expect(feedbackActivityName("shown", "first_graded")).toBe("feedback_shown_first_graded");
    expect(feedbackActivityName("reason", "first_graded", "not_really")).toBe("feedback_first_graded_not_really");
    const names = allFeedbackActivityNames();
    expect(names.slice(18)).toEqual(FIVE_NAMES);
    for (const n of FIVE_NAMES) expect(ACTIVITY_EVENTS as readonly string[]).toContain(n);
    expect(ACTIVITY_EVENTS as readonly string[]).not.toContain("feedback_call_tap_first_graded");
  });

  it("exact copy: 'Was this useful?' and Yes / Not really / Too hard; the other moments keep their six", () => {
    expect(FIRST_GRADED_COPY.title).toBe("Was this useful?");
    expect(FIRST_GRADED_ANSWERS.map((a) => a.label)).toEqual(["Yes", "Not really", "Too hard"]);
    expect(feedbackReasonsFor("first_graded")).toBe(FIRST_GRADED_ANSWERS);
    expect(feedbackReasonsFor("paywall")).toBe(FEEDBACK_REASONS);
  });

  it("the admin board labels every new name and lists first_graded answers", () => {
    for (const n of FIVE_NAMES) expect(activityEventLabel(n)).not.toBe(n);
    expect(activityEventLabel("feedback_first_graded_too_hard")).toBe(
      "Feedback (after the first graded result): “Too hard”",
    );
    const rows = feedbackAnswers([
      { day: "2026-10-20", activity: { events: { feedback_shown_first_graded: 1, feedback_first_graded_yes: 1 } } },
      { day: "2026-10-19", activity: { events: { feedback_paywall_price: 1, feedback_paywall_yes: 1 } } },
    ]);
    expect(rows.map((r) => [r.day, r.moment, r.reason, r.label])).toEqual([
      ["2026-10-20", "first_graded", "yes", "Yes"],
      ["2026-10-19", "paywall", "price", "The price is too high for me right now"],
    ]);
  });
});

describe("FIRST-FEEDBACK-1 · the card", () => {
  function renderFirst() {
    const onAnswer = vi.fn();
    const onDismiss = vi.fn();
    const onDone = vi.fn();
    render(<FeedbackPrompt moment="first_graded" onAnswer={onAnswer} onDismiss={onDismiss} onDone={onDone} />);
    return { onAnswer, onDismiss, onDone };
  }

  it("shows the question and three answers — no WhatsApp offer, no subtitle, no text box", () => {
    renderFirst();
    expect(screen.getByText("Was this useful?")).toBeInTheDocument();
    for (const l of ["Yes", "Not really", "Too hard"]) expect(screen.getByRole("button", { name: l })).toBeInTheDocument();
    expect(screen.queryByTestId("feedback-call")).toBeNull();
    expect(screen.queryByText(FEEDBACK_COPY.subtitle)).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByTestId("feedback-prompt").getAttribute("aria-modal")).toBe("false");
  });

  it("one tap records the answer once; the × records a dismiss (and not an answer)", () => {
    const a = renderFirst();
    fireEvent.click(screen.getByRole("button", { name: "Too hard" }));
    fireEvent.click(screen.getByTestId("feedback-thanks"));
    expect(a.onAnswer).toHaveBeenCalledTimes(1);
    expect(a.onAnswer).toHaveBeenCalledWith("too_hard");
    expect(a.onDismiss).not.toHaveBeenCalled();
    cleanup();
    const b = renderFirst();
    fireEvent.click(screen.getByTestId("feedback-x"));
    expect(b.onDismiss).toHaveBeenCalledTimes(1);
    expect(b.onAnswer).not.toHaveBeenCalled();
    expect(b.onDone).toHaveBeenCalledTimes(1);
  });

  it("control: with no moment the six-reason card and the call offer are unchanged", () => {
    render(<FeedbackPrompt onAnswer={vi.fn()} onDismiss={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText(FEEDBACK_COPY.title)).toBeInTheDocument();
    expect(screen.getByTestId("feedback-call")).toBeInTheDocument();
    expect(screen.queryByText("Was this useful?")).toBeNull();
  });
});

describe("FIRST-FEEDBACK-1 · which scorecards may ask", () => {
  const marks = { kind: "marks" as const, awarded: 3, total: 10 };
  it("a real graded score with the host's opt-in -> yes", () => {
    expect(isFirstGradedEligible({ ask: true, deferred: false, allPending: false, score: marks })).toBe(true);
    expect(
      isFirstGradedEligible({
        ask: true,
        deferred: false,
        allPending: false,
        score: { kind: "attempts", attempted: 5, ofN: 5, mcqAnswered: 2, mcqCorrect: 0 },
      }),
    ).toBe(true);
  });
  it("no opt-in (re-open / tutor overlay / guest), a deferred stub, all pending, or nothing checked -> no", () => {
    expect(isFirstGradedEligible({ ask: undefined, deferred: false, allPending: false, score: marks })).toBe(false);
    expect(isFirstGradedEligible({ ask: false, deferred: false, allPending: false, score: marks })).toBe(false);
    expect(isFirstGradedEligible({ ask: true, deferred: true, allPending: false, score: marks })).toBe(false);
    expect(isFirstGradedEligible({ ask: true, deferred: false, allPending: true, score: marks })).toBe(false);
    expect(isFirstGradedEligible({ ask: true, deferred: false, allPending: false, score: { ...marks, total: 0 } })).toBe(false);
    expect(
      isFirstGradedEligible({
        ask: true,
        deferred: false,
        allPending: false,
        score: { kind: "attempts", attempted: 0, ofN: 5, mcqAnswered: 0, mcqCorrect: 0 },
      }),
    ).toBe(false);
  });
  it("the pause before asking is a fixed constant", () => {
    expect(FIRST_GRADED_DELAY_MS).toBe(1500);
  });
});
