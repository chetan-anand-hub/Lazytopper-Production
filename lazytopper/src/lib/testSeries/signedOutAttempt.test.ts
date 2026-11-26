// TS-FREE-SIGNEDOUT - the kept signed-out attempt: restored only onto the same paper (same question ids), never stale, never throws.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  SIGNED_OUT_ATTEMPT_KEY,
  SIGNED_OUT_ATTEMPT_MAX_AGE_MS,
  SIGNED_OUT_SAMPLES,
  SIGNED_OUT_SAMPLE_CODES,
  clearSignedOutAttempt,
  isSignedOutSample,
  readSignedOutAttempt,
  saveSignedOutAttempt,
  signInToMarkPath,
  tsFreeSignedOutDisabled,
} from "./signedOutAttempt";
import { seriesChapters, seriesFullMocks } from "./testSeries";

const NOW = Date.parse("2026-11-26T14:00:00Z");
const base = { surface: "chapter-test" as const, path: "/chapter-test/10/maths/real-numbers?series=1", ids: ["q1", "q2", "q3"], answers: { 1: "A", 3: "C" }, flags: [2], currentQNumber: 3, elapsedMs: 120000, timerEnabled: true };

beforeEach(() => window.sessionStorage.clear());
afterEach(() => vi.unstubAllEnvs());

describe("signedOutAttempt", () => {
  it("round-trips onto the same paper", () => {
    expect(saveSignedOutAttempt(base, NOW)).toBe(true);
    const got = readSignedOutAttempt("chapter-test", ["q1", "q2", "q3"], NOW + 1000);
    expect(got?.answers).toEqual({ 1: "A", 3: "C" });
    expect(got?.flags).toEqual([2]);
    expect(got?.elapsedMs).toBe(120000);
    expect(got?.currentQNumber).toBe(3);
  });
  it("is NOT restored onto another paper, another surface, or after a day", () => {
    saveSignedOutAttempt(base, NOW);
    expect(readSignedOutAttempt("chapter-test", ["q1", "q2"], NOW)).toBeNull();
    expect(readSignedOutAttempt("chapter-test", ["q1", "q3", "q2"], NOW)).toBeNull();
    expect(readSignedOutAttempt("full-mock", ["q1", "q2", "q3"], NOW)).toBeNull();
    expect(readSignedOutAttempt("chapter-test", ["q1", "q2", "q3"], NOW + SIGNED_OUT_ATTEMPT_MAX_AGE_MS + 1)).toBeNull();
  });
  it("an unreadable or empty entry is null; clear removes it", () => {
    window.sessionStorage.setItem(SIGNED_OUT_ATTEMPT_KEY, "{not json");
    expect(readSignedOutAttempt("chapter-test", ["q1"], NOW)).toBeNull();
    saveSignedOutAttempt({ ...base, ids: [] }, NOW);
    expect(readSignedOutAttempt("chapter-test", [], NOW)).toBeNull();
    saveSignedOutAttempt(base, NOW);
    clearSignedOutAttempt();
    expect(window.sessionStorage.getItem(SIGNED_OUT_ATTEMPT_KEY)).toBeNull();
  });
  it("the sign-in path returns to this paper and never off-site", () => {
    expect(signInToMarkPath("/full-mock/10/maths", "?paper=2")).toBe(`/login?redirect=${encodeURIComponent("/full-mock/10/maths?paper=2")}`);
    expect(signInToMarkPath("//evil.example", "")).toBe(`/login?redirect=${encodeURIComponent("/test-series")}`);
  });
  it("kill switch", () => {
    expect(tsFreeSignedOutDisabled()).toBe(false);
    vi.stubEnv("VITE_TS_FREE_SIGNEDOUT_DISABLED", "1");
    expect(tsFreeSignedOutDisabled()).toBe(true);
  });
  it("owner decision: the sample set is exactly the first chapter test + first full-length test of each subject, with their real links", () => {
    expect([...SIGNED_OUT_SAMPLE_CODES]).toEqual(["CT-M01", "CT-S01", "FM-M1", "FM-S1"]);
    const firstCt = (s: "Maths" | "Science") => seriesChapters().find((t) => t.subject === s)!;
    const firstFm = (s: "Maths" | "Science") => seriesFullMocks().find((t) => t.subject === s)!;
    for (const s of ["Maths", "Science"] as const) {
      expect(isSignedOutSample(firstCt(s).code)).toBe(true);
      expect(isSignedOutSample(firstFm(s).code)).toBe(true);
      expect(SIGNED_OUT_SAMPLES.find((x) => x.code === firstCt(s).code)?.href).toBe(firstCt(s).href);
      expect(SIGNED_OUT_SAMPLES.find((x) => x.code === firstFm(s).code)?.href).toBe(firstFm(s).href);
    }
    expect(isSignedOutSample("CT-M02")).toBe(false);
    expect(isSignedOutSample("CT-M01-2")).toBe(false);
    expect(isSignedOutSample("FM-M2")).toBe(false);
    expect(isSignedOutSample("FS-M-LA-1")).toBe(false);
    expect(isSignedOutSample(null)).toBe(false);
  });
});
