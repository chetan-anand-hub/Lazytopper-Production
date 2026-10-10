// @vitest-environment node
// FU-GLOBAL-SHED - the site-wide ceiling's `busy_today` reaches the student as the owner's sentence plus ONE
// call to action, as the existing student-facing limit error - never the generic "AI API request failed".

import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("./paidCallHeaders", () => ({
  UID_HEADER: "X-Lazytopper-Uid",
  paidJsonHeaders: async () => ({ "Content-Type": "application/json", "X-Lazytopper-Uid": "u", Authorization: "Bearer t" }),
}));

import { checkSolutionImage, isDailyLimitError, resetPaperPassCacheForTests } from "./aiClient";
import { gradingErrorMessage } from "./gradingTransport";

const BODY = (cta: string) => ({
  error: "busy_today",
  message:
    "LazyTopper's free AI checking is very busy today, so it's paused for free accounts until tomorrow. Practice, MCQs, CBQs, notes and saved solutions still work.",
  class: "global", scope: "free", cta, resetAt: "2026-10-11T18:30:00.000Z",
});
async function refused(body: unknown) {
  resetPaperPassCacheForTests();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: 429 })));
  return checkSolutionImage({ imageBase64: "x", imageMimeType: "image/png" } as never).catch((e) => e);
}
afterEach(() => vi.unstubAllGlobals());

describe("FU-GLOBAL-SHED · busy_today on the client", () => {
  it("★★ signed-out (cta trial): the owner's sentence + 'Start your free 7-day trial.' as the student-facing limit error", async () => {
    const err = await refused(BODY("trial"));
    expect(isDailyLimitError(err)).toBe(true);
    expect(err.message).toBe(`${BODY("trial").message} Start your free 7-day trial.`);
    expect(gradingErrorMessage(err, "FALLBACK")).toBe(err.message); // kept verbatim, not the generic fallback
    expect(err.message).not.toMatch(/AI API|failed|429|busy_today/i);
    expect(err.resetAt).toBe("2026-10-11T18:30:00.000Z");
  });
  it("★★ everyone else (cta plans): '… See plans.'", async () => {
    const err = await refused(BODY("plans"));
    expect(err.message.endsWith(" See plans.")).toBe(true);
  });
  it("★ a null cta (premium past the margin) adds no call to action", async () => {
    const err = await refused({ ...BODY("plans"), cta: null, scope: "all" });
    expect(err.message).toBe(BODY("plans").message);
  });
  it("CONTROL: the per-student daily_limit is untouched", async () => {
    const err = await refused({ error: "daily_limit", message: "You've hit today's limit for this. It resets tomorrow.", class: "vision", resetAt: null });
    expect(isDailyLimitError(err)).toBe(true);
    expect(err.message).toBe("You've hit today's limit for this. It resets tomorrow.");
  });
});
