/**
 * TEST-SERIES-1 — the series numbering, ids, progress and schedule. Every count is checked against its SOURCE (the syllabus keys,
 * SERIES_MOCKS_PER_SUBJECT), never against a typed figure alone.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BOARD_CHAPTER_KEYS, chapterUnit } from "../../config/syllabusUnits2026-27";
import {
  TEST_SERIES_BUY_PATH,
  chapterPaperCode,
  chapterTestSeriesHref,
  chapterTestSeriesSeed,
  seriesChapterPaperNumber,
  seriesChapters,
  currentScheduleRow,
  isChapterTestSeriesRequest,
  seriesChapterTests,
  seriesChapterWorksheetId,
  seriesContentsLine,
  seriesFullMocks,
  seriesKeyOfWorksheetId,
  seriesMockNumber,
  seriesMockRounds,
  seriesMockWorksheetId,
  seriesProgress,
  seriesSchedule,
  seriesTotals,
  SERIES_MOCKS_PER_SUBJECT,
  SERIES_PAPERS_PER_CHAPTER,
  type SeriesRecordLike,
} from "./testSeries";
import { canCheckSeriesPapers, countTestsTaken, seriesStartDecision, FREE_TESTS_ALLOWED } from "./seriesAccess";

describe("numbering — derived from the syllabus and SERIES_MOCKS_PER_SUBJECT", () => {
  it("one chapter test per board chapter, Maths then Science, in syllabus order", () => {
    const cts = seriesChapters();
    expect(cts.map((c) => c.topicKey)).toEqual(
      [...BOARD_CHAPTER_KEYS.filter((k) => chapterUnit(k)?.subject === "maths"), ...BOARD_CHAPTER_KEYS.filter((k) => chapterUnit(k)?.subject === "science")],
    );
    expect(cts.length).toBe(BOARD_CHAPTER_KEYS.length);
    const t = seriesTotals();
    expect(t.chaptersPerSubject).toEqual({ Maths: 13, Science: 13 });
    expect(cts[0]).toMatchObject({ code: "CT-M01", subject: "Maths", topicKey: "real-numbers", href: "/chapter-test/10/Maths/real-numbers?series=1" });
    expect(cts[12].code).toBe("CT-M13");
    expect(cts[13]).toMatchObject({ code: "CT-S01", subject: "Science", topicKey: "chemical-reactions-and-equations" });
    expect(new Set(cts.map((c) => c.code)).size).toBe(cts.length);
    expect(cts.every((c) => c.label && c.label !== c.topicKey)).toBe(true);
  });
  it("SERIES_MOCKS_PER_SUBJECT full mocks per subject; totals add up", () => {
    const mocks = seriesFullMocks();
    expect(mocks.length).toBe(2 * SERIES_MOCKS_PER_SUBJECT);
    expect(mocks[0]).toMatchObject({ code: "FM-M1", n: 1, href: "/full-mock/10/Maths?paper=1" });
    expect(mocks[mocks.length - 1].code).toBe(`FM-S${SERIES_MOCKS_PER_SUBJECT}`);
    const t = seriesTotals();
    expect(t.total).toBe(BOARD_CHAPTER_KEYS.length * SERIES_PAPERS_PER_CHAPTER + 2 * SERIES_MOCKS_PER_SUBJECT);
    expect(seriesContentsLine(t)).toBe(`${BOARD_CHAPTER_KEYS.length * SERIES_PAPERS_PER_CHAPTER} chapter tests + ${2 * SERIES_MOCKS_PER_SUBJECT} full-length tests`);
    // TS-MORE-1 (owner, 19 Nov 2026): 180 = 130 chapter tests (5 x 26) + 50 full-length tests (25 x 2).
    expect([t.total, t.chapterTests, t.fullMocks, t.chapters, t.papersPerChapter, t.mocksPerSubject]).toEqual([180, 130, 50, 26, 5, 25]);
  });
  it("llms.txt's line states the same counts", () => {
    const llms = readFileSync(resolve(__dirname, "../../../public/llms.txt"), "utf8");
    const line = llms.split("\n").find((l) => l.includes("/test-series"));
    const t = seriesTotals();
    expect(line).toContain(
      `${t.chapterTests} numbered chapter tests (${t.papersPerChapter} per chapter) and ${t.fullMocks} full-length board-pattern tests (${t.mocksPerSubject} per subject)`,
    );
    expect(line).toContain(`${t.total} tests in all`);
  });
});

describe("URL params and ids", () => {
  it("?paper=n is 1..SERIES_MOCKS_PER_SUBJECT only", () => {
    expect(seriesMockNumber("3")).toBe(3);
    expect(seriesMockNumber(String(SERIES_MOCKS_PER_SUBJECT))).toBe(SERIES_MOCKS_PER_SUBJECT);
    for (const bad of [null, "", "0", String(SERIES_MOCKS_PER_SUBJECT + 1), "-1", "2.5", "abc", "1e1"]) expect(seriesMockNumber(bad)).toBeNull();
  });
  it("?series=1 only for a board chapter", () => {
    expect(isChapterTestSeriesRequest("1", "polynomials")).toBe(true);
    expect(isChapterTestSeriesRequest("0", "polynomials")).toBe(false);
    expect(isChapterTestSeriesRequest(null, "polynomials")).toBe(false);
    expect(isChapterTestSeriesRequest("1", "not-a-chapter")).toBe(false);
    expect(chapterTestSeriesSeed("polynomials")).toBe("ts1:polynomials");
  });
  it("worksheet ids round-trip; an ordinary id is not a series sitting", () => {
    const ct = seriesChapterWorksheetId("ct-abc-def123", "pair-of-linear-equations");
    expect(ct).toBe("ct-ts1-pair-of-linear-equations--abc-def123");
    expect(seriesKeyOfWorksheetId(ct)).toEqual({ kind: "chapter", topicKey: "pair-of-linear-equations", paper: 1 });
    const fm = seriesMockWorksheetId("fm-abc-def123", "Science", 7);
    expect(fm).toBe("fm-ts1-s7--abc-def123");
    expect(seriesKeyOfWorksheetId(fm)).toEqual({ kind: "mock", subject: "Science", n: 7 });
    // TS-MORE-1: papers 2..5 carry their number in the id's own prefix (ct-ts1p3-...), never a prefix of paper 1's or of another paper's.
    const p3 = seriesChapterWorksheetId("ct-abc-def123", "pair-of-linear-equations", 3);
    expect(p3).toBe("ct-ts1p3-pair-of-linear-equations--abc-def123");
    expect(seriesKeyOfWorksheetId(p3)).toEqual({ kind: "chapter", topicKey: "pair-of-linear-equations", paper: 3 });
    expect(p3.startsWith("ct-ts1-")).toBe(false);
    expect(ct.startsWith("ct-ts1p")).toBe(false);
    expect(seriesKeyOfWorksheetId("ct-ts1p1-polynomials--a")).toBeNull();
    expect(seriesKeyOfWorksheetId("ct-abc-def123")).toBeNull();
    expect(seriesKeyOfWorksheetId("fm-abc-def123")).toBeNull();
    expect(seriesKeyOfWorksheetId(undefined)).toBeNull();
  });
});

describe("TS-MORE-1 — chapter papers 2..5 and the kill switch", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });
  it("paper codes, URLs, seeds and ?paper=k", () => {
    expect(chapterPaperCode("CT-M01", 1)).toBe("CT-M01");
    expect(chapterPaperCode("CT-M01", 3)).toBe("CT-M01-3");
    expect(chapterTestSeriesHref("Maths", "real-numbers")).toBe("/chapter-test/10/Maths/real-numbers?series=1");
    expect(chapterTestSeriesHref("Maths", "real-numbers", 3)).toBe("/chapter-test/10/Maths/real-numbers?series=1&paper=3");
    expect(chapterTestSeriesSeed("real-numbers")).toBe("ts1:real-numbers");
    expect(chapterTestSeriesSeed("real-numbers", 3)).toBe("ts1p3:real-numbers");
    expect(seriesChapterPaperNumber(null)).toBe(1);
    expect(seriesChapterPaperNumber("5")).toBe(5);
    for (const bad of ["0", "6", "-1", "2.5", "abc", "1e1", "03"]) expect(seriesChapterPaperNumber(bad)).toBeNull();
    const all = seriesChapterTests();
    expect(all).toHaveLength(BOARD_CHAPTER_KEYS.length * 5);
    expect(new Set(all.map((c) => c.code)).size).toBe(all.length);
    expect(all.find((c) => c.code === "CT-M01-3")).toMatchObject({ paper: 3, baseCode: "CT-M01", href: "/chapter-test/10/Maths/real-numbers?series=1&paper=3" });
  });
  it("the kill switch VITE_TS_MORE_DISABLED takes the client back to 66 tests and hides the new copy", async () => {
    vi.stubEnv("VITE_TS_MORE_DISABLED", "1");
    vi.resetModules();
    const ts = await import("./testSeries");
    const t = ts.seriesTotals();
    expect([t.total, t.chapterTests, t.fullMocks, t.papersPerChapter, t.mocksPerSubject]).toEqual([66, 26, 40, 1, 20]);
    expect(ts.seriesChapterTests().some((c) => c.paper > 1)).toBe(false);
    expect(ts.seriesFullMocks().some((m) => m.n > 20)).toBe(false);
    expect(ts.seriesChapterPaperNumber("3")).toBeNull();
    expect(ts.seriesMockNumber("21")).toBeNull();
    const copy = await import("./seriesPerTest");
    expect(copy.testSeriesPerTestLine()).toBeNull();
    expect(copy.testSeriesExaminerLine()).toBeNull();
  });
  it("the per-test line is round(base price / total): 6 now, 8 from 1 Dec; the examiner line is verbatim", async () => {
    const { testSeriesPerTestInr, testSeriesPerTestLine, testSeriesExaminerLine } = await import("./seriesPerTest");
    expect(testSeriesPerTestInr(Date.parse("2026-11-19T06:30:00Z"))).toBe(6);
    expect(testSeriesPerTestInr(Date.parse("2026-12-01T06:30:00Z"))).toBe(8);
    expect(testSeriesPerTestLine(Date.parse("2026-11-19T06:30:00Z"))).toBe("\u20b96 per test");
    expect(testSeriesPerTestLine(Date.parse("2026-12-01T06:30:00Z"))).toBe("\u20b98 per test");
    expect(testSeriesPerTestLine(Date.parse("2026-11-19T06:30:00Z"))).not.toMatch(/GST/);
    expect(testSeriesExaminerLine()).toBe("Your written answers marked step by step like a CBSE examiner, by CBSE's step-marking rules.");
  });
});

describe("progress — real records only", () => {
  const rec = (over: Partial<SeriesRecordLike>): SeriesRecordLike => ({
    worksheetId: "x",
    surface: "chapter-test",
    status: "graded",
    marksAwarded: 0,
    marksTotal: 0,
    gradedAt: 1,
    ...over,
  });
  it("no records: nothing done, every test not started, no trend", () => {
    const p = seriesProgress([]);
    expect(p.done).toBe(0);
    expect(p.total).toBe(seriesTotals().total);
    expect(Object.values(p.byCode).every((x) => x.status === "not-started" && x.score === null)).toBe(true);
    expect(p.mockTrend).toEqual({ Maths: [], Science: [] });
  });
  it("ordinary (non-series) sittings never count", () => {
    const p = seriesProgress([
      rec({ worksheetId: "ct-abc-1", marksAwarded: 10, marksTotal: 20 }),
      rec({ worksheetId: "fm-abc-1", surface: "full-mock", marksAwarded: 50, marksTotal: 80 }),
    ]);
    expect(p.done).toBe(0);
  });
  it("attempted vs graded, the latest graded score, and the mock trend in paper order", () => {
    const p = seriesProgress([
      rec({ worksheetId: "ct-ts1-polynomials--a", status: "pending-upload", gradedAt: 1 }),
      rec({ worksheetId: "ct-ts1-real-numbers--a", marksAwarded: 12, marksTotal: 30, gradedAt: 2 }),
      rec({ worksheetId: "ct-ts1-real-numbers--b", marksAwarded: 25, marksTotal: 30, gradedAt: 3 }),
      rec({ worksheetId: "fm-ts1-m3--a", surface: "full-mock", marksAwarded: 60, marksTotal: 80, gradedAt: 4 }),
      rec({ worksheetId: "fm-ts1-m1--a", surface: "full-mock", marksAwarded: 40, marksTotal: 80, gradedAt: 5 }),
      // A mismatched surface is not a series sitting.
      rec({ worksheetId: "fm-ts1-s2--a", surface: "chapter-test", marksAwarded: 1, marksTotal: 80, gradedAt: 6 }),
    ]);
    expect(p.byCode["CT-M02"]).toEqual({ status: "attempted", score: null });
    expect(p.byCode["CT-M01"]).toEqual({ status: "graded", score: { awarded: 25, total: 30 } });
    expect(p.byCode["FM-M3"]).toEqual({ status: "graded", score: { awarded: 60, total: 80 } });
    expect(p.byCode["FM-S2"].status).toBe("not-started");
    expect(p.done).toBe(4);
    expect(p.mockTrend.Maths).toEqual([
      { n: 1, code: "FM-M1", percent: 50 },
      { n: 3, code: "FM-M3", percent: 75 },
    ]);
    expect(p.mockTrend.Science).toEqual([]);
  });
});

describe("schedule — from the predicted board date", () => {
  it("years follow the board year; the board date is the prediction, never invented", () => {
    const rows = seriesSchedule("2027-02-17");
    expect(rows?.map((r) => r.when)).toEqual(["Any time till the boards", "1 – 20 Dec 2026", "January 2027", "1 – 14 Feb 2027"]);
    expect(rows?.[1].body).toBe(`Full-Length Tests 1–${Math.ceil(SERIES_MOCKS_PER_SUBJECT / 2)} in Maths and Science.`);
    expect(rows?.[3].body).toContain("Boards expected from 17 Feb 2027");
    expect(seriesSchedule("not a date")).toBeNull();
  });
  it("marks today's row", () => {
    const rows = seriesSchedule("2027-02-17")!;
    expect(currentScheduleRow(rows, "2026-11-18")).toBe("chapters");
    expect(currentScheduleRow(rows, "2026-12-05")).toBe("round1");
    expect(currentScheduleRow(rows, "2026-12-25")).toBeNull();
    expect(currentScheduleRow(rows, "2027-01-15")).toBe("round2");
    expect(currentScheduleRow(rows, "2027-02-14")).toBe("final");
  });
});

describe("price — the test_series SKU's, through the shared pricing helper (TS-PACK-1)", () => {
  it("₹999 + GST (after the GST cut-off), from PACK_PRICE_INR — no second constant", async () => {
    const { PACK_PRICE_INR, packPriceLabel } = await import("../../services/packs");
    expect(PACK_PRICE_INR.test_series).toBe(999);
    expect(packPriceLabel("test_series", Date.parse("2026-11-20T06:30:00Z"))).toBe("₹999 + GST");
    expect(TEST_SERIES_BUY_PATH).toBe("/packs?buy=test_series");
  });
});

describe("access — Board Pass or Test Series; one test for everyone else", () => {
  it("canCheckSeriesPapers: paid premium or a Test Series owner", () => {
    expect(canCheckSeriesPapers({ paidPremium: true })).toBe(true);
    expect(canCheckSeriesPapers({ paidPremium: false, ownsTestSeries: true })).toBe(true);
    expect(canCheckSeriesPapers({ paidPremium: false })).toBe(false);
    expect(canCheckSeriesPapers({ paidPremium: false, ownsTestSeries: false })).toBe(false);
  });
  it("one test in total for free / trial; sign in first when signed out; unlimited when entitled", () => {
    expect(FREE_TESTS_ALLOWED).toBe(1);
    const recs = [{ surface: "worksheet" }, { surface: "chapter-test" }, { surface: "full-mock" }, { surface: "check-improve" }];
    expect(countTestsTaken(recs)).toBe(2);
    expect(seriesStartDecision({ entitled: false, signedIn: true, testsTaken: 0 })).toBe("start");
    expect(seriesStartDecision({ entitled: false, signedIn: true, testsTaken: 1 })).toBe("upgrade");
    expect(seriesStartDecision({ entitled: false, signedIn: false, testsTaken: 0 })).toBe("sign-in");
    expect(seriesStartDecision({ entitled: true, signedIn: true, testsTaken: 30 })).toBe("start");
  });
});

describe("TS-PAGE-2 — seriesMockRounds", () => {
  it("splits the full-length tests exactly as the calendar does, covering every paper once", () => {
    const rounds = seriesMockRounds();
    expect(rounds.map((r) => r.id)).toEqual(["round1", "round2"]);
    expect(rounds[0].from).toBe(1);
    expect(rounds[1].from).toBe(rounds[0].to + 1);
    expect(rounds[1].to).toBe(seriesTotals().mocksPerSubject);
    const sched = seriesSchedule("2027-02-16") ?? [];
    expect(sched.find((r) => r.id === "round1")?.body).toContain(`1–${rounds[0].to}`);
    expect(sched.find((r) => r.id === "round2")?.body).toContain(`${rounds[1].from}–${rounds[1].to}`);
  });
});
