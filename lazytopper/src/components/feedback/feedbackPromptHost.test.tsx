import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, waitFor } from "@testing-library/react";

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

/**
 * FEEDBACK-1 — the host: signed-in students only, once per page load, once per moment
 * (recorded before render), fail closed, and the exact events each action records.
 */

const card = () => document.querySelector("[data-testid='feedback-prompt']");

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
