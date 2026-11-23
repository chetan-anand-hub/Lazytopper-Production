/**
 * TS-THEMES-1 - the focus sets' codes, URLs, worksheet ids, progress and kill switch; and that the 180-test series' counts and copy
 * are UNCHANGED by them (they are a bonus, never counted in seriesTotals / "130 chapter tests + 50 full-length").
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FOCUS_PARAM,
  focusSetCodeOfWorksheetId,
  focusSetCount,
  focusSetLabel,
  focusSetMinutes,
  focusSetOf,
  focusSetProgress,
  focusSetWorksheetId,
  focusSets,
  loadFocusSetMeta,
} from "./focusSets";
import {
  seriesContentsLine,
  seriesKeyOfWorksheetId,
  seriesPaperKeyOfWorksheetId,
  seriesProgress,
  seriesTotals,
  testSeriesPackLine,
} from "./testSeries";
import { isSeriesPaperLocation } from "./seriesNav";
import { testSeriesPerTestInr } from "./seriesPerTest";

afterEach(() => vi.unstubAllEnvs());

describe("TS-THEMES-1 focus sets: codes and URLs", () => {
  it("30 sets: Maths LA / CB / SA and Science LA / CB / NU, 5 each, codes FS-<M|S>-<theme>-<n>", () => {
    const all = focusSets();
    expect(all).toHaveLength(30);
    expect(focusSetCount()).toBe(30);
    expect(new Set(all.map((f) => f.code)).size).toBe(30);
    expect(all.filter((f) => f.subject === "Maths").map((f) => f.theme)).toEqual([..."LLLLLCCCCCSSSSS"].map((c) => ({ L: "LA", C: "CB", S: "SA" })[c]));
    expect(all.filter((f) => f.subject === "Science").map((f) => f.theme)).toEqual([..."LLLLLCCCCCNNNNN"].map((c) => ({ L: "LA", C: "CB", N: "NU" })[c]));
    expect(all[0]).toMatchObject({ code: "FS-M-LA-1", href: "/full-mock/10/Maths?focus=FS-M-LA-1", themeTitle: "Long answers (5 marks)" });
    expect(all.find((f) => f.code === "FS-S-NU-5")?.href).toBe("/full-mock/10/Science?focus=FS-S-NU-5");
    expect(FOCUS_PARAM).toBe("focus");
  });

  it("?focus= resolves only a real code of the page's own subject; anything else -> null (the ordinary mock)", () => {
    expect(focusSetOf("FS-M-CB-3", "Maths")?.code).toBe("FS-M-CB-3");
    expect(focusSetOf("FS-M-CB-3", "Science")).toBeNull();
    expect(focusSetOf("FS-M-NU-1", "Maths")).toBeNull();
    expect(focusSetOf("FS-S-SA-1", "Science")).toBeNull();
    expect(focusSetOf("FS-M-LA-6", "Maths")).toBeNull();
    expect(focusSetOf("fs-m-la-1", "Maths")).toBeNull();
    expect(focusSetOf(null, "Maths")).toBeNull();
    expect(focusSetOf("FS-M-LA-1 ", "Maths")).toBeNull();
  });

  it("kill switch VITE_TS_FOCUS_SETS_DISABLED: no set resolves, and the paper-key helper stops naming them", () => {
    const id = focusSetWorksheetId("fm-abc-123", focusSets()[0]);
    vi.stubEnv("VITE_TS_FOCUS_SETS_DISABLED", "1");
    expect(focusSetOf("FS-M-LA-1", "Maths")).toBeNull();
    expect(seriesPaperKeyOfWorksheetId(id)).toBeNull();
    vi.stubEnv("VITE_TS_FOCUS_SETS_DISABLED", "0");
    expect(focusSetOf("FS-M-LA-1", "Maths")?.code).toBe("FS-M-LA-1");
  });

  it("worksheet ids: `fm-tsfs-<m|s><theme><n>--`, read back to the code and the server key; never a series (fm-ts1-) id", () => {
    for (const f of focusSets()) {
      const id = focusSetWorksheetId("fm-lq2x-9k", f);
      expect(id.startsWith(`fm-tsfs-${f.subject === "Maths" ? "m" : "s"}${f.theme.toLowerCase()}${f.n}--`)).toBe(true);
      expect(focusSetCodeOfWorksheetId(id)).toBe(f.code);
      expect(seriesPaperKeyOfWorksheetId(id)).toBe(`TS-${f.code}`);
      expect(seriesKeyOfWorksheetId(id)).toBeNull();
    }
    expect(focusSetCodeOfWorksheetId("fm-ts1-m3--abc")).toBeNull();
    expect(seriesPaperKeyOfWorksheetId("fm-ts1-m3--abc")).toBe("TS-FM-M3");
    expect(focusSetCodeOfWorksheetId("fm-tsfs-mnu1--abc")).toBeNull(); // Maths has no Numericals theme
  });

  it("minutes follow the Full Mock's pace (80 marks / 180 min), rounded up to 5", () => {
    expect(focusSetMinutes(20)).toBe(45);
    expect(focusSetMinutes(21)).toBe(50);
    expect(focusSetMinutes(24)).toBe(55);
    expect(focusSetMinutes(25)).toBe(60);
    expect(focusSetMinutes(80)).toBe(180);
  });

  it("the label names the theme, the set and the code", () => {
    expect(focusSetLabel(focusSets()[6])).toBe("Test Series · Focus set · Case-based questions (4 marks) · Set 2 of 5 (FS-M-CB-2)");
  });

  it("the picker meta comes from the pins: marks / minutes / questions per code", async () => {
    const meta = await loadFocusSetMeta();
    expect(meta).not.toBeNull();
    expect(Object.keys(meta!).sort()).toEqual(focusSets().map((f) => f.code).sort());
    for (const m of Object.values(meta!)) {
      expect(m.marks).toBeGreaterThanOrEqual(20);
      expect(m.marks).toBeLessThanOrEqual(25);
      expect(m.minutes).toBe(focusSetMinutes(m.marks));
      expect(m.questions).toBeGreaterThan(0);
    }
  });
});

describe("TS-THEMES-1 progress comes only from real records", () => {
  const rec = (worksheetId: string, status: "graded" | "partial", awarded = 0, total = 0, surface = "full-mock") => ({
    worksheetId,
    surface,
    status,
    marksAwarded: awarded,
    marksTotal: total,
    gradedAt: 1,
  });

  it("a focus sitting is attempted / graded under its own code; it never moves the series' own progress", () => {
    const f = focusSets()[2];
    const records = [rec(focusSetWorksheetId("fm-a-1", f), "partial"), rec(focusSetWorksheetId("fm-a-2", focusSets()[20]), "graded", 14, 20)];
    const p = focusSetProgress(records);
    expect(p[f.code]).toEqual({ status: "attempted", score: null });
    expect(p[focusSets()[20].code]).toEqual({ status: "graded", score: { awarded: 14, total: 20 } });
    expect(Object.values(p).filter((x) => x.status === "not-started")).toHaveLength(28);
    const s = seriesProgress(records);
    expect(s.done).toBe(0);
    expect(s.total).toBe(180);
  });

  it("a record on another surface is ignored", () => {
    const f = focusSets()[0];
    expect(focusSetProgress([rec(focusSetWorksheetId("fm-a-1", f), "graded", 5, 20, "chapter-test")])[f.code].status).toBe("not-started");
  });
});

describe("TS-THEMES-1 leaves every series count and claim exactly as it was", () => {
  it("180 tests = 130 chapter tests + 50 full-length; the pack line and the per-test figure are unchanged", () => {
    const t = seriesTotals();
    expect(t.total).toBe(180);
    expect(t.chapterTests).toBe(130);
    expect(t.fullMocks).toBe(50);
    expect(seriesContentsLine()).toBe("130 chapter tests + 50 full-length tests");
    expect(testSeriesPackLine().startsWith("130 chapter tests + 50 full-length tests, Maths + Science.")).toBe(true);
    // "₹6 per test" divides by the 180 tests (the focus sets are not in the denominator).
    expect(testSeriesPerTestInr(Date.parse("2026-11-23T12:00:00+05:30"))).toBe(Math.round(999 / 180));
  });

  it("a focus set URL is a series paper location (Back leads to /test-series); a plain mock is not", () => {
    expect(isSeriesPaperLocation("/full-mock/10/Maths", "?focus=FS-M-LA-1")).toBe(true);
    expect(isSeriesPaperLocation("/full-mock/10/Maths", "?focus=nope")).toBe(false);
    expect(isSeriesPaperLocation("/full-mock/10/Maths", "")).toBe(false);
  });
});
