import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { hasResumableChapterTest, hasResumableFullMock, isResumingSavedPaper, paperRouteKey } from "../../lib/papers/resumablePaper";
import { claimNewPaperView } from "./MockViewGate";

/**
 * TS-MORE-1 - a saved in-progress sitting is resumed ONLY on its own series paper. Chapter papers 1..5 share one pathname and
 * full-length papers share one per subject, so the paper number (not the pathname alone) keys resume / claim.
 */
const CT = "/chapter-test/10/Maths/real-numbers";
const P1 = "?series=1";
const P3 = "?series=1&paper=3";
const P4 = "?series=1&paper=4";
const paper = { worksheetId: "ct-ts1-real-numbers--a", questions: [{ qNumber: 1, id: "q1", section: "A", marks: 1 }] };

function saveCt(key: string, route: string) {
  sessionStorage.setItem(key, JSON.stringify({ answers: {}, flags: [], elapsed: 1, currentQNumber: 1, timerEnabled: true, paper, route }));
}
function saveFm(code: string, worksheetId: string, subject = "Maths") {
  localStorage.setItem(
    `lazytopper.fm.session.v1.u1.${code}`,
    JSON.stringify({ code, subject, phase: "taking", paper: { ...paper, worksheetId }, startedAt: 1, durationMs: 1, answers: {}, flags: [], updatedAt: 1 }),
  );
}
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});
afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe("TS-MORE-1 route key", () => {
  it("only series papers 2..5 and full-length ?paper=n gain a query; every other key is today's pathname", () => {
    expect(paperRouteKey(CT)).toBe(CT.toLowerCase());
    expect(paperRouteKey(CT, "")).toBe(CT.toLowerCase());
    expect(paperRouteKey(CT, P1)).toBe(CT.toLowerCase());
    expect(paperRouteKey(CT, "?series=1&paper=1")).toBe(CT.toLowerCase());
    expect(paperRouteKey(CT, "?paper=3")).toBe(CT.toLowerCase()); // not a series request
    expect(paperRouteKey(CT, P3)).toBe(`${CT.toLowerCase()}?paper=3`);
    expect(paperRouteKey("/full-mock/10/Maths", "?paper=7")).toBe("/full-mock/10/maths?paper=7");
    expect(paperRouteKey("/full-mock/10/Maths", "")).toBe("/full-mock/10/maths");
  });
});

describe("TS-MORE-1 chapter paper resume", () => {
  it("paper 1 in progress: opening paper 3 is NOT a resume (a fresh paper 3 start)", () => {
    saveCt("lazytopper.ct.progress.CT-M-REAL-01", paperRouteKey(CT, P1));
    expect(hasResumableChapterTest(CT, P1)).toBe(true);
    expect(hasResumableChapterTest(CT, P3)).toBe(false);
    expect(isResumingSavedPaper(CT, "u1", P3)).toBe(false);
  });
  it("paper 3 in progress: paper 3 resumes, paper 1 and paper 4 do not", () => {
    saveCt("lazytopper.ct.progress.CT-M-REAL-01.p3", paperRouteKey(CT, P3));
    expect(hasResumableChapterTest(CT, P3)).toBe(true);
    expect(isResumingSavedPaper(CT, "u1", P3)).toBe(true);
    expect(hasResumableChapterTest(CT, P1)).toBe(false);
    expect(hasResumableChapterTest(CT, P4)).toBe(false);
  });
  it("a fresh non-series test is unchanged: its saved route is the bare pathname and still resumes", () => {
    saveCt("lazytopper.ct.progress.CT-M-REAL-02", CT.toLowerCase());
    expect(hasResumableChapterTest(CT)).toBe(true);
    expect(hasResumableChapterTest(CT, "")).toBe(true);
    expect(hasResumableChapterTest(CT, P3)).toBe(false);
  });
  it("claiming paper 3's view is independent of an uncounted resume mark on paper 1", () => {
    sessionStorage.setItem("lazytopper.dailyMockViews.uncounted", JSON.stringify([paperRouteKey(CT, P1)]));
    // paper 3 has no uncounted mark: it is a new paper already counted by the gate, so the claim is a no-op true.
    expect(claimNewPaperView(CT, "u1", false, P3)).toBe(true);
    expect(JSON.parse(sessionStorage.getItem("lazytopper.dailyMockViews.uncounted") || "[]")).toEqual([paperRouteKey(CT, P1)]);
  });
});

describe("TS-MORE-1 full-length paper resume", () => {
  it("a saved paper 3 resumes on ?paper=3, not on ?paper=5; with no ?paper the old subject rule holds", () => {
    saveFm("FM-M-01", "fm-ts1-m3--abc");
    expect(hasResumableFullMock("u1", "Maths", "?paper=3")).toBe(true);
    expect(hasResumableFullMock("u1", "Maths", "?paper=5")).toBe(false);
    expect(hasResumableFullMock("u1", "Maths", "?paper=13")).toBe(false);
    expect(hasResumableFullMock("u1", "Maths", "")).toBe(true);
    expect(hasResumableFullMock("u1", "Science", "?paper=3")).toBe(false);
  });
  it("paper 3 does not match paper 33-style prefixes (the id is anchored)", () => {
    saveFm("FM-M-02", "fm-ts1-m13--abc");
    expect(hasResumableFullMock("u1", "Maths", "?paper=1")).toBe(false);
    expect(hasResumableFullMock("u1", "Maths", "?paper=13")).toBe(true);
  });
});
