import { describe, it, expect, beforeEach } from "vitest";
import { seriesPaperKeyOfRoute } from "./freeTsWeekly";
import { freeTsWeeklyMayOpen, freeTsWeeklyOpens, freeTsWeeklyRecord } from "./freeTsWeeklyStore";
import { canDownloadPaper, seriesStartDecision } from "./seriesAccess";

beforeEach(() => localStorage.clear());

describe("FREE-TS-WEEKLY - route classifier (the pages' own reading of their URL)", () => {
  it("series chapter papers, full-length tests and focus sets have a key; ordinary papers do not", () => {
    expect(seriesPaperKeyOfRoute("/chapter-test/10/Maths/real-numbers", "?series=1")).toBe("TS-CT-M01");
    expect(seriesPaperKeyOfRoute("/chapter-test/10/Maths/real-numbers", "?series=1&paper=2")).toBe("TS-CT-M01-2");
    expect(seriesPaperKeyOfRoute("/full-mock/10/Maths", "?paper=1")).toBe("TS-FM-M1");
    expect(seriesPaperKeyOfRoute("/full-mock/10/Science", "?focus=FS-S-NU-1")).toBe("TS-FS-S-NU-1");
    expect(seriesPaperKeyOfRoute("/chapter-test/10/Maths/real-numbers", "")).toBeNull();
    expect(seriesPaperKeyOfRoute("/chapter-test/10/Maths/real-numbers", "?series=1&paper=9")).toBeNull();
    expect(seriesPaperKeyOfRoute("/full-mock/10/Maths", "")).toBeNull();
    expect(seriesPaperKeyOfRoute("/chapter-test/10/Maths/not-a-board-chapter", "?series=1")).toBeNull();
    expect(seriesPaperKeyOfRoute("/mock-paper/x", "?paper=1")).toBeNull();
  });
});

describe("FREE-TS-WEEKLY - the device's rolling-week store", () => {
  it("3 signed in, 1 signed out; one open per paper; opens expire after 7 days", () => {
    const t0 = Date.now();
    for (const k of ["a", "b", "c"]) freeTsWeeklyRecord("u", k, t0);
    freeTsWeeklyRecord("u", "a", t0);
    expect(freeTsWeeklyOpens("u", t0)).toBe(3);
    expect(freeTsWeeklyMayOpen("u", "d", t0)).toBe(false);
    expect(freeTsWeeklyMayOpen("u", "a", t0)).toBe(true);
    expect(freeTsWeeklyMayOpen("u", "d", t0 + 7 * 24 * 3600 * 1000 + 1)).toBe(true);
    freeTsWeeklyRecord(null, "x", t0);
    expect(freeTsWeeklyMayOpen(null, "y", t0)).toBe(false);
  });
});

describe("FREE-TS-WEEKLY - start decision and downloads", () => {
  it("a signed-in free / trial account may START a series paper after its one free test; downloads stay entitlement-only", () => {
    expect(seriesStartDecision({ entitled: false, signedIn: true, testsTaken: 1 })).toBe("upgrade");
    expect(seriesStartDecision({ entitled: false, signedIn: true, testsTaken: 1, weeklyOpens: true })).toBe("start");
    expect(seriesStartDecision({ entitled: false, signedIn: false, testsTaken: 0, weeklyOpens: true })).toBe("sign-in");
    // a trial is NOT paid: no download entitlement without a Test Series, a Board Pass or a covering pack
    expect(canDownloadPaper({ paidPremium: false })).toBe(false);
    expect(canDownloadPaper({ paidPremium: false, ownsTestSeries: false, ownsCoveringPack: false })).toBe(false);
    expect(canDownloadPaper({ paidPremium: false, ownsCoveringPack: true })).toBe(true);
    expect(canDownloadPaper({ paidPremium: true })).toBe(true);
    expect(canDownloadPaper({ paidPremium: false, ownsTestSeries: true })).toBe(true);
  });
});
