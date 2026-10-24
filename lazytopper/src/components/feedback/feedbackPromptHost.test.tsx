import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const trackFeedbackEvent = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", () => ({ trackFeedbackEvent }));

const auth = vi.hoisted(() => ({ currentUser: null as null | { uid: string; isAnonymous?: boolean } }));
vi.mock("../../services/firebaseClient", () => ({ authClient: auth }));

import {
  __resetFeedbackHostForTests,
  notifyPaywallDismissed,
  requestFeedbackPrompt,
} from "./feedbackPromptHost";
import { feedbackStorageKey } from "./feedbackPromptModel";
import { FIRST_GRADED_DELAY_MS } from "./useFirstGradedFeedback";
import ResultsScorecard from "../results/ResultsScorecard";
import type { ScorecardVariant } from "../results/scorecardVariants";

// PERF-3: the graded card is a lazy chunk in production; these suites test the card itself, so it loads
// synchronously here (FeedbackPrompt.lazy.test.tsx pins the real lazy path and the failed-chunk guard).
vi.mock("../../lib/lazyWithRetry", async () => {
  const m = await import("./GradedFeedbackCard");
  return { lazyWithRetry: () => m.default };
});


/**
 * FEEDBACK-1 — the host: signed-in students only, once per page load, once per moment
 * (recorded before render), fail closed, and the exact events each action records.
 */

const card = () => document.querySelector("[data-testid='feedback-prompt']");

/** Seed the device's session-record mirror (the key services/sessionRecords.ts reads). */
function seedRecords(uid: string, rows: Array<{ id: string; status: string; ageMs: number }>): void {
  const now = Date.now();
  window.localStorage.setItem(
    `lazytopper.user.${uid}.sessionRecords.v1`,
    JSON.stringify(
      rows.map((r) => ({
        id: r.id,
        worksheetId: r.id,
        surface: "worksheet",
        title: r.id,
        subject: "maths",
        topicKeys: [],
        questionIds: [],
        marksAwarded: 1,
        marksTotal: 2,
        status: r.status,
        fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
        sectionBreakdown: null,
        gradedAt: now - r.ageMs,
        perQuestionRef: `ws:${r.id}`,
        dedupKey: `${uid}::${r.id}`,
      })),
    ),
  );
}
/** A brand-new student: only the record the current result just wrote. */
const seedFirst = (uid: string) => seedRecords(uid, [{ id: "WS-M-01", status: "graded", ageMs: 1500 }]);

beforeEach(() => {
  window.localStorage.clear();
  trackFeedbackEvent.mockClear();
  auth.currentUser = null;
  __resetFeedbackHostForTests();
});

afterEach(() => {
  act(() => __resetFeedbackHostForTests());
  vi.restoreAllMocks();
});

describe("feedbackPromptHost", () => {
  it("shows for a signed-in student, records the moment BEFORE render, and counts feedback_shown once", async () => {
    let shown = false;
    await act(async () => {
      shown = await requestFeedbackPrompt("paywall", { uid: "u1" });
    });
    expect(shown).toBe(true);
    expect(card()).not.toBeNull();
    expect(window.localStorage.getItem(feedbackStorageKey("u1"))).toContain('"p"');
    expect(trackFeedbackEvent.mock.calls).toEqual([["shown", "paywall"]]);
  });

  it("never twice in one page load, even for a different moment (control: first call shows)", async () => {
    await act(async () => {
      expect(await requestFeedbackPrompt("paywall", { uid: "u1" })).toBe(true);
    });
    await act(async () => {
      expect(await requestFeedbackPrompt("trial_end", { uid: "u1", trialKey: "2026-10-01" })).toBe(false);
    });
    expect(document.querySelectorAll("[data-testid='feedback-prompt']")).toHaveLength(1);
  });

  it("never for the same moment again after a reload inside the cooldown (device record)", async () => {
    await act(async () => {
      expect(await requestFeedbackPrompt("paywall", { uid: "u1" })).toBe(true);
    });
    act(() => __resetFeedbackHostForTests()); // a reload: memory gone, device record kept
    await act(async () => {
      expect(await requestFeedbackPrompt("paywall", { uid: "u1" })).toBe(false);
    });
    expect(card()).toBeNull();
  });

  it("paywall callers: signed-out or anonymous -> nothing; signed-in -> shown", async () => {
    notifyPaywallDismissed();
    await Promise.resolve();
    await act(async () => {
      expect(await requestFeedbackPrompt("paywall")).toBe(false);
    });
    auth.currentUser = { uid: "anon", isAnonymous: true };
    await act(async () => {
      expect(await requestFeedbackPrompt("paywall")).toBe(false);
    });
    expect(card()).toBeNull();
    auth.currentUser = { uid: "real" };
    await act(async () => {
      expect(await requestFeedbackPrompt("paywall")).toBe(true);
    });
    expect(card()).not.toBeNull();
  });

  it("fail closed: blocked storage -> no prompt and no event", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    await act(async () => {
      expect(await requestFeedbackPrompt("paywall", { uid: "u1" })).toBe(false);
    });
    expect(card()).toBeNull();
    expect(trackFeedbackEvent).not.toHaveBeenCalled();
  });

  it("No thanks -> feedback_dismissed and the card is removed", async () => {
    await act(async () => {
      await requestFeedbackPrompt("trial_end", { uid: "u1", trialKey: "2026-10-01T05:00:00.000Z" });
    });
    const btn = document.querySelector("[data-testid='feedback-no-thanks']") as HTMLElement;
    act(() => {
      fireEvent.click(btn);
    });
    expect(trackFeedbackEvent.mock.calls).toEqual([
      ["shown", "trial_end"],
      ["dismissed", "trial_end"],
    ]);
    await waitFor(() => expect(card()).toBeNull());
  });

  it("a reason tap -> feedback_reason with the moment and the code, nothing else", async () => {
    await act(async () => {
      await requestFeedbackPrompt("paywall", { uid: "u1" });
    });
    act(() => {
      fireEvent.click(document.querySelector("[data-testid='feedback-opt-price']") as HTMLElement);
    });
    expect(trackFeedbackEvent.mock.calls).toEqual([
      ["shown", "paywall"],
      ["reason", "paywall", "price"],
    ]);
  });
});

/* ── FIRST-FEEDBACK-1 — "Was this useful?" through the host and the scorecard shell ── */

describe("FIRST-FEEDBACK-1 · host", () => {
  afterEach(() => vi.useRealTimers());

  it("is not blocked by an earlier prompt in this page load, but never shows while one is open", async () => {
    let shown = false;
    await act(async () => {
      shown = await requestFeedbackPrompt("paywall", { uid: "u1" });
    });
    expect(shown).toBe(true);
    await act(async () => {
      shown = await requestFeedbackPrompt("first_graded", { uid: "u1" });
    });
    expect(shown).toBe(false); // the paywall card is still open
    act(() => {
      fireEvent.click(screen.getByTestId("feedback-x"));
    });
    expect(card()).toBeNull();
    seedFirst("u1");
    await act(async () => {
      shown = await requestFeedbackPrompt("first_graded", { uid: "u1" });
    });
    expect(shown).toBe(true);
    expect(trackFeedbackEvent).toHaveBeenCalledWith("shown", "first_graded");
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    });
    expect(trackFeedbackEvent).toHaveBeenCalledWith("reason", "first_graded", "yes");
  });

  it("a signed-out visitor gets nothing (control: a signed-in student does)", async () => {
    let shown = true;
    await act(async () => {
      shown = await requestFeedbackPrompt("first_graded");
    });
    expect(shown).toBe(false);
    auth.currentUser = { uid: "u9" };
    seedFirst("u9");
    await act(async () => {
      shown = await requestFeedbackPrompt("first_graded");
    });
    expect(shown).toBe(true);
  });

  it("the scorecard renders at once; the question follows after the pause, only with the opt-in", async () => {
    vi.useFakeTimers();
    auth.currentUser = { uid: "u5" };
    seedFirst("u5");
    const variant = {
      surface: "worksheet",
      title: "Worksheet",
      subtitle: "WS-1",
      score: { kind: "marks", awarded: 4, total: 10 },
      actions: [],
    } as unknown as ScorecardVariant;
    const r = render(<ResultsScorecard variant={variant} onClose={() => {}} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FIRST_GRADED_DELAY_MS + 50);
    });
    expect(card()).toBeNull(); // control: no opt-in, no question
    r.unmount();
    render(<ResultsScorecard variant={variant} onClose={() => {}} askFirstFeedback />);
    expect(screen.getByRole("dialog", { name: "Worksheet scorecard" })).toBeInTheDocument();
    expect(card()).toBeNull(); // not before the pause: the scorecard comes first
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FIRST_GRADED_DELAY_MS + 50);
    });
    expect(card()).not.toBeNull();
    expect(screen.getByText("Was this useful?")).toBeInTheDocument();
  });

  it("(a)/(b) an existing student is NOT asked; a brand-new student IS asked, once", async () => {
    seedRecords("old", [
      { id: "WS-M-02", status: "graded", ageMs: 1500 },
      { id: "WS-M-01", status: "graded", ageMs: 3 * 86_400_000 },
    ]);
    let shown = true;
    await act(async () => {
      shown = await requestFeedbackPrompt("first_graded", { uid: "old" });
    });
    expect(shown).toBe(false);
    expect(card()).toBeNull();
    expect(window.localStorage.getItem(feedbackStorageKey("old"))).toBeNull(); // nothing recorded
    seedFirst("new");
    await act(async () => {
      shown = await requestFeedbackPrompt("first_graded", { uid: "new" });
    });
    expect(shown).toBe(true);
    act(() => {
      fireEvent.click(screen.getByTestId("feedback-x"));
    });
    act(() => __resetFeedbackHostForTests()); // a reload
    await act(async () => {
      shown = await requestFeedbackPrompt("first_graded", { uid: "new" });
    });
    expect(shown).toBe(false); // once ever
  });

  it("(d) no records on the device yet (loading / unknown) -> not shown, and not used up", async () => {
    let shown = true;
    await act(async () => {
      shown = await requestFeedbackPrompt("first_graded", { uid: "u3" });
    });
    expect(shown).toBe(false);
    window.localStorage.setItem("lazytopper.user.u3.sessionRecords.v1", "{not json");
    await act(async () => {
      shown = await requestFeedbackPrompt("first_graded", { uid: "u3" });
    });
    expect(shown).toBe(false);
    expect(window.localStorage.getItem(feedbackStorageKey("u3"))).toBeNull();
    seedFirst("u3"); // control: once the current record is there, it is asked
    await act(async () => {
      shown = await requestFeedbackPrompt("first_graded", { uid: "u3" });
    });
    expect(shown).toBe(true);
  });

  it("(e) after first_graded, a paywall prompt in the same page load is still shown", async () => {
    seedFirst("u1");
    let shown = false;
    await act(async () => {
      shown = await requestFeedbackPrompt("first_graded", { uid: "u1" });
    });
    expect(shown).toBe(true);
    act(() => {
      fireEvent.click(screen.getByTestId("feedback-x"));
    });
    await act(async () => {
      shown = await requestFeedbackPrompt("paywall", { uid: "u1" });
    });
    expect(shown).toBe(true);
    expect(trackFeedbackEvent).toHaveBeenCalledWith("shown", "paywall");
  });

  it("one Escape closes only the question; the next Escape closes the scorecard", async () => {
    auth.currentUser = { uid: "u7" };
    seedFirst("u7");
    const onClose = vi.fn();
    const variant = {
      surface: "worksheet",
      title: "Worksheet",
      subtitle: "WS-1",
      score: { kind: "marks", awarded: 4, total: 10 },
      actions: [],
    } as unknown as ScorecardVariant;
    render(<ResultsScorecard variant={variant} onClose={onClose} />);
    await act(async () => {
      expect(await requestFeedbackPrompt("first_graded")).toBe(true);
    });
    act(() => {
      fireEvent.keyDown(document.body, { key: "Escape" });
    });
    await waitFor(() => expect(card()).toBeNull());
    expect(onClose).not.toHaveBeenCalled();
    expect(trackFeedbackEvent).toHaveBeenCalledWith("dismissed", "first_graded");
    act(() => {
      fireEvent.keyDown(document.body, { key: "Escape" });
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
