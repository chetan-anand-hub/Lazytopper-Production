/**
 * G2a — the 429 path. A capped student must see the server's own message, not a
 * generic failure.
 *
 * Scoped run:
 *   npx vitest run src/ai/dailyLimit.test.ts --poolOptions.threads.maxThreads=2
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { DailyLimitError, isDailyLimitError, detectQuestion } from "./aiClient";
import { formatResetAt } from "../components/auth/DailyLimitNotice";

const RESET_AT = "2026-07-28T18:30:00.000Z"; // next IST midnight

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(body),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a 429 daily_limit becomes a typed limit, never a generic error", () => {
  // ★ THE POINT OF THE WHOLE FILE. Before this, every non-2xx threw
  // `new Error(details.error)` — so a capped student saw "daily_limit" or
  // "AI API request failed". The rate limiter has been live in production since
  // #537 with no client handling at all.
  // MUTATION: delete the 429 branch in handleJsonResponse ⇒ RED.
  it("throws DailyLimitError carrying the server's message, class and resetAt", async () => {
    mockFetchOnce(429, {
      error: "daily_limit",
      message: "You've hit today's limit for this. It resets tomorrow.",
      class: "vision",
      resetAt: RESET_AT,
    });

    await expect(
      detectQuestion({ imageBase64: "x", mimeType: "image/png" } as never),
    ).rejects.toBeInstanceOf(DailyLimitError);

    try {
      await detectQuestion({ imageBase64: "x", mimeType: "image/png" } as never);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(isDailyLimitError(err)).toBe(true);
      const limit = err as DailyLimitError;
      expect(limit.message).toBe("You've hit today's limit for this. It resets tomorrow.");
      expect(limit.limitClass).toBe("vision");
      expect(limit.resetAt).toBe(RESET_AT);
      // It must NOT read as a fault.
      expect(limit.message).not.toMatch(/error|failed|wrong/i);
    }
  });

  // The class-aware shed (#537) sends a DIFFERENT message explaining what still
  // works. The client must pass it through verbatim rather than substituting
  // generic limit copy, or the reassurance is lost.
  // MUTATION: hardcode the message instead of reading details.message ⇒ RED.
  it("passes the vision-shed message through verbatim", async () => {
    mockFetchOnce(429, {
      error: "daily_limit",
      message:
        "Photo checking is paused for today while we keep the tutor and practice running. It resets tomorrow.",
      class: "vision",
      resetAt: RESET_AT,
    });

    try {
      await detectQuestion({ imageBase64: "x", mimeType: "image/png" } as never);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as DailyLimitError).message).toMatch(/tutor and practice/i);
    }
  });

  // A 429 that is NOT ours (an upstream proxy, say) must not be dressed up as a
  // friendly limit — that would tell the student to come back tomorrow for a
  // problem that has nothing to do with quota.
  // MUTATION: drop the `details.error === "daily_limit"` condition ⇒ RED.
  it("a 429 without our daily_limit body stays a generic error", async () => {
    mockFetchOnce(429, { error: "Too Many Requests" });

    try {
      await detectQuestion({ imageBase64: "x", mimeType: "image/png" } as never);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(isDailyLimitError(err)).toBe(false);
      expect(err).toBeInstanceOf(Error);
    }
  });

  it("non-429 failures are untouched", async () => {
    mockFetchOnce(500, { error: "boom" });
    try {
      await detectQuestion({ imageBase64: "x", mimeType: "image/png" } as never);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(isDailyLimitError(err)).toBe(false);
    }
  });

  // `instanceof` is what every caller uses to tell a limit from a fault, so it is
  // worth pinning directly. Note what this test does NOT prove: the usual
  // `Object.setPrototypeOf` guard is absent because tsconfig targets ES2022 and
  // classes are native — removing that line was mutation-tested and left the
  // suite GREEN, so it was dropped rather than kept as unpinnable ceremony. This
  // test is what would catch the breakage if the target were ever lowered.
  it("instanceof distinguishes a limit from a plain Error", () => {
    const e = new DailyLimitError("m", "vision", RESET_AT);
    expect(e instanceof DailyLimitError).toBe(true);
    expect(e instanceof Error).toBe(true);
    expect(isDailyLimitError(e)).toBe(true);
    expect(isDailyLimitError(new Error("m"))).toBe(false);
  });
});

describe("formatResetAt renders something a student can act on", () => {
  it("falls back to 'tomorrow' when resetAt is missing or unparseable", () => {
    expect(formatResetAt(null)).toBe("tomorrow");
    expect(formatResetAt("not-a-date")).toBe("tomorrow");
  });

  it("renders a time for a real timestamp", () => {
    expect(formatResetAt(RESET_AT)).toMatch(/\d/);
  });
});
