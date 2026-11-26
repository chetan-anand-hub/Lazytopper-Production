// TS-FREE-SIGNEDOUT - a signed-out visitor's kept sitting (this tab, sessionStorage) is a RESUME for the daily paper gate: a reload or a
// return from the sign-in page without signing in never spends another of the day's signed-out papers. Signed in it is not (the
// account's own count applies), and another paper's sitting is not.
import { describe, it, expect, beforeEach } from "vitest";
import { isResumingSavedPaper } from "./resumablePaper";
import { saveSignedOutAttempt } from "../testSeries/signedOutAttempt";

const base = { ids: ["a"], answers: {}, flags: [], currentQNumber: 1, elapsedMs: 0 };
beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe("resumablePaper · signed-out kept sitting", () => {
  it("Full Mock: the same paper is a resume signed out; another paper / signed in is not", () => {
    saveSignedOutAttempt({ ...base, surface: "full-mock", path: "/full-mock/10/Maths?paper=1" }, 1);
    expect(isResumingSavedPaper("/full-mock/10/maths", null, "?paper=1")).toBe(true);
    expect(isResumingSavedPaper("/full-mock/10/maths", null, "?paper=2")).toBe(false);
    expect(isResumingSavedPaper("/full-mock/10/maths", "student-1", "?paper=1")).toBe(false);
  });
  it("Chapter Test: the same paper is a resume signed out; another chapter is not", () => {
    saveSignedOutAttempt({ ...base, surface: "chapter-test", path: "/chapter-test/10/Maths/real-numbers?series=1" }, 1);
    expect(isResumingSavedPaper("/chapter-test/10/maths/real-numbers", null, "?series=1")).toBe(true);
    expect(isResumingSavedPaper("/chapter-test/10/maths/polynomials", null, "?series=1")).toBe(false);
    expect(isResumingSavedPaper("/chapter-test/10/maths/real-numbers", "student-1", "?series=1")).toBe(false);
  });
});
