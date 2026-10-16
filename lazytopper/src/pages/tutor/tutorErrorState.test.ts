// TUTOR-FIX-2 T7 — every tutor failure maps to its own state (the session used to flatten all of
// them into one line). One row per state, built from the REAL errors callTutor throws.

import { describe, it, expect, vi } from "vitest";

vi.mock("../../ai/paidCallHeaders", () => ({
  paidJsonHeaders: async () => ({ "Content-Type": "application/json" }),
  SignInAgainError: class SignInAgainError extends Error {
    constructor(m: string) {
      super(m);
      this.name = "SignInAgainError";
    }
  },
  REAUTH_MESSAGE: "Please sign in again.",
}));

import { TutorBusyError, TutorLimitError, TutorPremiumRequiredError } from "../../ai/tutorClient";
import { backAtLine, classifyTutorError, limitHeadline } from "./tutorErrorState";

// 16 Oct 2026, 14:00 IST.
const NOW = Date.parse("2026-10-16T08:30:00.000Z");
const NEXT_MIDNIGHT_IST = "2026-10-16T18:30:00.000Z";
const LATER_TODAY_IST = "2026-10-16T12:00:00.000Z"; // 5:30 pm IST

describe("T7 · classifyTutorError", () => {
  it("402 premium_required → premium (the upgrade card)", () => {
    const s = classifyTutorError(new TutorPremiumRequiredError("The tutor is part of Premium.", "tutor", "free", null), true);
    expect(s).toEqual({ kind: "premium", message: "The tutor is part of Premium." });
  });
  it("409 trial_limit → limit, carrying the server's resetAt", () => {
    const s = classifyTutorError(new TutorLimitError("trial_limit", NEXT_MIDNIGHT_IST, null), true);
    expect(s).toEqual({ kind: "limit", resetAt: NEXT_MIDNIGHT_IST, window: null });
  });
  it("429 usage_limit → limit, with its window", () => {
    const s = classifyTutorError(new TutorLimitError("usage_limit", LATER_TODAY_IST, "fiveHour"), true);
    expect(s).toEqual({ kind: "limit", resetAt: LATER_TODAY_IST, window: "fiveHour" });
  });
  it("429 busy_today → busy (same family), with resetAt and the plans call to action", () => {
    const s = classifyTutorError(new TutorBusyError("LazyTopper is very busy today. See plans.", NEXT_MIDNIGHT_IST, "plans"), true);
    expect(s).toMatchObject({ kind: "busy", resetAt: NEXT_MIDNIGHT_IST, plans: true });
  });
  it("401 that could not be refreshed → reauth (the existing sign-in-again line)", () => {
    const e = new Error("Please sign in again.");
    e.name = "SignInAgainError";
    expect(classifyTutorError(e, true)).toEqual({ kind: "reauth", message: "Please sign in again." });
  });
  it("a fetch that never reached the server → offline", () => {
    expect(classifyTutorError(new TypeError("Failed to fetch"), true)).toEqual({ kind: "offline" });
  });
  it("the browser is offline → offline, whatever was thrown", () => {
    expect(classifyTutorError(new Error("anything"), false)).toEqual({ kind: "offline" });
  });
  it("a 5xx / unreadable reply → failed, the server's own sentence (as today)", () => {
    expect(classifyTutorError(new Error("The tutor is busy. Try again in a minute."), true)).toEqual({
      kind: "failed",
      message: "The tutor is busy. Try again in a minute.",
    });
  });
});

describe("T7 · the 'back at' line, in IST", () => {
  it("a reset later today names the time", () => {
    expect(backAtLine(LATER_TODAY_IST, NOW)).toBe("Back at 5:30 pm.");
  });
  it("the next IST midnight reads as tomorrow", () => {
    expect(backAtLine(NEXT_MIDNIGHT_IST, NOW)).toBe("Back tomorrow.");
  });
  it("no reset from the server → tomorrow", () => {
    expect(backAtLine(null, NOW)).toBe("Back tomorrow.");
  });
  it("a midnight days away (a weekly window) is named, not called tomorrow", () => {
    expect(backAtLine("2026-10-19T18:30:00.000Z", NOW)).toBe("Back at 12:00 am on Tue 20 Oct.");
  });
  it("headlines: today's messages, a shorter window, the busy day", () => {
    expect(limitHeadline({ kind: "limit", resetAt: null, window: null })).toBe("You've used today's tutor messages.");
    expect(limitHeadline({ kind: "limit", resetAt: null, window: "fiveHour" })).toBe("You've used your tutor messages for now.");
    expect(limitHeadline({ kind: "busy", resetAt: null, message: "", plans: false })).toBe("The tutor is very busy today.");
  });
});
