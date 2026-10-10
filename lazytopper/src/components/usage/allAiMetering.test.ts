// @vitest-environment node
/**
 * ALL-AI-METERING-1 — the client half: the new `tutor` / `more-like-this` scopes and their
 * owner copy, the `thirtyDay` window, the Tutor's inline limit message, the More-like-this
 * top-up refusal reaching the page, and aiClient keeping a 30-day window.
 *
 * Node environment: nothing here touches the DOM (the C&I detection panel is asserted on the
 * real page in DesktopCheckImprovePage.funnelEvents.test.tsx).
 *
 * Scoped run:
 *   pnpm exec vitest run src/components/usage/allAiMetering.test.ts
 */

import { describe, it, expect, vi, afterEach } from "vitest";

const H = vi.hoisted(() => ({
  moreLikeThis: null as null | (() => Promise<unknown>),
}));

vi.mock("../../ai/paidCallHeaders", () => ({
  UID_HEADER: "X-Lazytopper-Uid",
  paidJsonHeaders: async () => ({ "Content-Type": "application/json" }),
  SignInAgainError: class SignInAgainError extends Error {},
  REAUTH_MESSAGE: "Please sign in again to continue.",
}));

vi.mock("../../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../ai/aiClient")>();
  return {
    ...actual,
    fetchCachedAiQuestions: async () => [],
    saveAiGeneratedQuestions: () => {},
    generateMoreLikeThis: (...args: unknown[]) => (H.moreLikeThis ? H.moreLikeThis() : actual.generateMoreLikeThis(...(args as [never]))),
  };
});

import {
  fullPremiumWindow,
  limitCopy,
  limitFromAiRefusal,
  tutorLimitMessage,
  PREMIUM_WINDOW_LABEL,
  TUTOR_TRIAL_LIMIT_COPY,
  MORE_LIKE_THIS_TRIAL_LIMIT_COPY,
  type LimitState,
} from "./fairUseGate";
import { readFairUseLimit, type UsageSnapshot } from "../../services/usageClient";
import { callTutor, type TutorRequest } from "../../ai/tutorClient";
import { FairUseLimitError } from "../../ai/aiClient";
import { buildPracticeQuestionsWithAiTopup, subscribeMoreLikeThisLimit } from "../practice/practiceQuestionBuilder";

// A reset far in the future, so no assertion here depends on what "today" is.
const RESET = "2099-03-14T18:30:00.000Z";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  H.moreLikeThis = null;
});

describe("ALL-AI-METERING-1 · scopes and owner copy", () => {
  it("★★ trial Tutor / More-like-this read the owner's sentence, word for word, with no invented reset line", () => {
    const tutor = limitCopy({ tier: "trial", scope: "tutor", resetAt: RESET, window: null });
    expect(tutor.lead).toBe("You've reached today's Tutor limit. It resets at midnight.");
    expect(tutor.resetPrefix).toBeNull();
    expect(tutor.tail).toBeNull();
    const mlt = limitCopy({ tier: "trial", scope: "more-like-this", resetAt: RESET, window: null });
    expect(mlt.lead).toBe("You've reached today's limit for new practice questions. Your saved questions still work.");
    expect(mlt.resetPrefix).toBeNull();
    expect(TUTOR_TRIAL_LIMIT_COPY).toBe(tutor.lead);
    expect(MORE_LIKE_THIS_TRIAL_LIMIT_COPY).toBe(mlt.lead);
  });

  it("★ Premium on the new scopes reads the EXISTING Premium window copy (a week cap is not 'today's')", () => {
    for (const scope of ["tutor", "more-like-this"] as const) {
      const c = limitCopy({ tier: "premium", scope, resetAt: RESET, window: "week" });
      expect(c.lead).toBe("You've reached this week fair-use limit.");
      expect(c.resetPrefix).toBe("It resets at");
      expect(c.showPlans).toBe(false);
    }
  });

  it("★ CONTROL: the grading scopes' copy is unchanged", () => {
    expect(limitCopy({ tier: "trial", scope: "checks", resetAt: RESET, window: null, allowance: 5 }).lead)
      .toBe("You've used today's 5 answer checks.");
    expect(limitCopy({ tier: "trial", scope: "chapter-test", resetAt: RESET, window: null }).tail)
      .toBe("Premium removes the daily limit.");
  });

  it("★ the 30-day window has a label and is checked FIRST (the longest window decides)", () => {
    expect(PREMIUM_WINDOW_LABEL.thirtyDay).toBe("30-day");
    const premium = { fiveHourPct: 100, dayPct: 100, weekPct: 100, thirtyDayPct: 100, resets: { fiveHour: null, day: null, week: null } };
    const snap = { enforced: true, tier: "premium", trial: null, premium } as unknown as UsageSnapshot;
    expect(fullPremiumWindow(snap)).toBe("thirtyDay");
    const noThirty = { ...snap, premium: { ...premium, thirtyDayPct: 40 } } as unknown as UsageSnapshot;
    expect(fullPremiumWindow(noThirty)).toBe("week");
  });
});

describe("ALL-AI-METERING-1 · limitFromAiRefusal — the refusal itself is the positive fact", () => {
  it("★★ a trial refusal is a panel with NO enforced snapshot (the AI switch is not the grading switch)", () => {
    const l = limitFromAiRefusal({ kind: "trial_limit", remaining: 0, resetAt: RESET, window: null }, "more-like-this", null);
    expect(l).toEqual({ tier: "trial", scope: "more-like-this", resetAt: RESET, window: null, allowance: null });
  });
  it("★ Premium names its window from the error; without one (and no snapshot) -> null, never a guessed window", () => {
    expect(limitFromAiRefusal({ kind: "usage_limit", remaining: null, resetAt: RESET, window: "day" }, "tutor"))
      .toEqual({ tier: "premium", scope: "tutor", resetAt: RESET, window: "day" });
    expect(limitFromAiRefusal({ kind: "usage_limit", remaining: null, resetAt: RESET, window: null }, "tutor")).toBeNull();
  });
  it("★ CONTROL: an unknown kind, or not a refusal at all, is null (the existing error path)", () => {
    expect(limitFromAiRefusal({ kind: null, remaining: null, resetAt: null, window: null }, "checks")).toBeNull();
    expect(limitFromAiRefusal(readFairUseLimit(new Error("network")), "checks")).toBeNull();
    expect(limitFromAiRefusal(readFairUseLimit(new FairUseLimitError("trial_limit", 0, RESET, null)), "checks")?.tier).toBe("trial");
  });
  it("★ the Tutor's inline Premium message carries the server's reset time", () => {
    const l: LimitState = { tier: "premium", scope: "tutor", resetAt: "2099-03-14T12:30:00.000Z", window: "fiveHour" };
    expect(tutorLimitMessage(l, Date.parse("2099-03-14T10:00:00.000Z"))).toBe("You've reached this 5-hour fair-use limit. It resets at 6:00 pm.");
    expect(tutorLimitMessage({ tier: "trial", scope: "tutor", resetAt: RESET, window: null })).toBe(TUTOR_TRIAL_LIMIT_COPY);
  });
});

describe("ALL-AI-METERING-1 · Tutor — a refusal surfaces the Tutor limit copy, never the raw code", () => {
  const REQ: TutorRequest = { uid: "s", topicKey: "real-numbers", topicLabel: "Real Numbers", subject: "maths", messages: [{ role: "user", content: "hi" }] };
  function respond(status: number, body: unknown) {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) })));
  }
  async function thrown(): Promise<Error> {
    try {
      await callTutor(REQ);
    } catch (e) {
      return e as Error;
    }
    throw new Error("callTutor did not throw");
  }

  it("★★ 409 trial_limit -> the owner's trial sentence", async () => {
    respond(409, { error: "trial_limit", remaining: 0, resetAt: RESET });
    const err = await thrown();
    expect(err.message).toBe(TUTOR_TRIAL_LIMIT_COPY);
    expect(err.name).toBe("FairUseLimitError");
    expect(readFairUseLimit(err)).toEqual({ kind: "trial_limit", remaining: null, resetAt: RESET, window: null });
  });
  it("★★ 429 usage_limit -> the Premium window copy with its reset (and no 'usage_limit' text)", async () => {
    respond(429, { error: "usage_limit", window: "week", resetAt: RESET });
    const err = await thrown();
    expect(err.message).toMatch(/^You've reached this week fair-use limit\. It resets at .+\.$/);
    expect(err.message).not.toMatch(/usage_limit/);
  });
  it("★ CONTROL: a 429 daily_limit and a 500 keep their existing path", async () => {
    respond(429, { error: "daily_limit", message: "You've hit today's limit for this." });
    expect((await thrown()).message).toBe("You've hit today's limit for this.");
    respond(500, { error: "boom" });
    expect((await thrown()).name).not.toBe("FairUseLimitError");
  });
});

describe("ALL-AI-METERING-1 · aiClient keeps a 30-day window", () => {
  it("★ a 429 usage_limit with window thirtyDay is read with its window, not dropped to null", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 429, text: async () => JSON.stringify({ error: "usage_limit", window: "thirtyDay", resetAt: RESET }) })));
    const { generateMoreLikeThis } = await vi.importActual<typeof import("../../ai/aiClient")>("../../ai/aiClient");
    const err = await generateMoreLikeThis({ subject: "Maths", topicKey: "x", seedQuestion: { text: "q", marks: 1 }, numVariants: 1 } as never)
      .then(() => null, (e: unknown) => e as FairUseLimitError);
    expect(err?.name).toBe("FairUseLimitError");
    expect(err?.window).toBe("thirtyDay");
  });
});

describe("ALL-AI-METERING-1 · More-like-this — a refused top-up reaches the page; the saved questions stay", () => {
  const ARGS = { grade: "10", subjectKey: "Maths" as const, topicLabel: "zz-no-such-topic-aam1", packTopicKey: "polynomials", count: 60, difficulty: "All" as const };

  it("★★ a FairUseLimitError is told to the subscriber (not console.error), and the questions are still returned", async () => {
    const called = vi.fn();
    H.moreLikeThis = () => { called(); return Promise.reject(new FairUseLimitError("trial_limit", 0, RESET, null)); };
    const seen: unknown[] = [];
    const off = subscribeMoreLikeThisLimit((e) => seen.push(e));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await buildPracticeQuestionsWithAiTopup(ARGS);
    off();
    expect(called).toHaveBeenCalledTimes(1);
    expect(seen).toHaveLength(1);
    expect(limitFromAiRefusal(readFairUseLimit(seen[0]), "more-like-this")?.scope).toBe("more-like-this");
    expect(consoleError).not.toHaveBeenCalled();
    expect(out.length).toBeGreaterThan(0);
  });

  it("★ CONTROL: any other failure is NOT a limit (console.error as before), and an unsubscribed listener hears nothing", async () => {
    H.moreLikeThis = () => Promise.reject(new Error("network"));
    const seen: unknown[] = [];
    const off = subscribeMoreLikeThisLimit((e) => seen.push(e));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await buildPracticeQuestionsWithAiTopup(ARGS);
    off();
    expect(seen).toEqual([]);
    expect(consoleError).toHaveBeenCalled();
    expect(out.length).toBeGreaterThan(0);
    H.moreLikeThis = () => Promise.reject(new FairUseLimitError("trial_limit", 0, RESET, null));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await buildPracticeQuestionsWithAiTopup(ARGS);
    expect(seen).toEqual([]);
  });
});
