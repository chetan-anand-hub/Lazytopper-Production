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

const MSG = "LazyTopper is very busy today. Come back after midnight, or subscribe for priority access.";
const BODY = (cta: string | null, message = MSG) => ({ error: "busy_today", message, class: "global", scope: "free", cta, resetAt: "2026-10-11T18:30:00.000Z" });
async function refused(body: unknown) {
  resetPaperPassCacheForTests();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: 429 })));
  return checkSolutionImage({ imageBase64: "x", imageMimeType: "image/png" } as never).catch((e) => e);
}
afterEach(() => vi.unstubAllGlobals());

describe("FU-GLOBAL-SHED · busy_today on the client", () => {
  it("★★ signed-in free account (cta plans): the owner's sentence + 'See plans.' as the student-facing limit error", async () => {
    const err = await refused(BODY("plans"));
    expect(isDailyLimitError(err)).toBe(true);
    expect(err.message).toBe(`${MSG} See plans.`);
    expect(gradingErrorMessage(err, "FALLBACK")).toBe(err.message);
    expect(err.message).not.toMatch(/AI API|failed|429|busy_today/i);
    expect(err.resetAt).toBe("2026-10-11T18:30:00.000Z");
  });
  it("★★ signed-out / premium past the margin (cta null): the sentence alone, no 'Start your free trial', no 'See plans'", async () => {
    const err = await refused(BODY(null, "LazyTopper is very busy today. Come back after midnight."));
    expect(err.message).toBe("LazyTopper is very busy today. Come back after midnight.");
    expect(err.message).not.toMatch(/trial|plans|subscribe/i);
  });
  it("CONTROL: the per-student daily_limit is untouched", async () => {
    const err = await refused({ error: "daily_limit", message: "You've hit today's limit for this. It resets tomorrow.", class: "vision", resetAt: null });
    expect(isDailyLimitError(err)).toBe(true);
    expect(err.message).toBe("You've hit today's limit for this. It resets tomorrow.");
  });
});
