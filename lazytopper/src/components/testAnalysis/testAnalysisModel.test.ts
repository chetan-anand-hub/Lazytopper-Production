import { describe, it, expect } from "vitest";
import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../../ai/aiClient";
import type { SessionPerQuestionPayload, SessionRecord } from "../../services/sessionRecords";
import { bankIndexEntries } from "../../data/bankChapters/bankIdIndex";
import {
  analyseHistory,
  analyseTest,
  buildRetryPlan,
  chapterTestSecondsPerMark,
  formatDuration,
  FULL_MOCK_SECONDS_PER_MARK,
  notebookChapters,
  notebookEntries,
  questionTimeRows,
  retryCountFloor,
  retryPracticePath,
  seriesPlanTask,
  takenSeriesMocks,
  TS_RETRY_SRC,
  tsAnalysisDisabled,
  weakestChapters,
  weekPlan,
  type AnalysedQuestion,
} from "./testAnalysisModel";
import { mergeQuestionTime, MAX_PAPERS } from "./questionTimes";
import { seriesSchedule } from "../../lib/testSeries/testSeries";

function idsFor(topicKey: string, n: number): string[] {
  const out: string[] = [];
  for (const [id, meta] of bankIndexEntries()) {
    if (meta.topicKey === topicKey) out.push(id);
    if (out.length === n) break;
  }
  return out;
}

const graded = (qNumber: number, awarded: number, total: number): WorksheetQuestionGrade => ({
  qNumber,
  couldNotRead: false,
  ok: true,
  totalMarks: total,
  marksAwarded: awarded,
  annotatedSteps: [{ step: "x", status: awarded > 0 ? "correct" : "incorrect" } as never],
});
const pending = (qNumber: number, total: number): WorksheetQuestionGrade => ({ qNumber, couldNotRead: true, totalMarks: total, note: "pending" });

function resp(results: WorksheetQuestionGrade[]): WorksheetGradeResponse {
  return {
    ok: true,
    results,
    totalQuestions: results.length,
    gradedCount: results.filter((r) => !r.couldNotRead).length,
    pendingCount: results.filter((r) => r.couldNotRead).length,
    gradedMarksAwarded: 0,
    gradedMarksTotal: 0,
    worksheetTotalMarks: 0,
  };
}

const TRI = idsFor("triangles", 4);
const RN = idsFor("real-numbers", 3);

describe("TS-ANALYSIS-1 · feature 1 — re-attempt only the lost-marks questions", () => {
  it("fixture ids resolve in the served bank", () => {
    expect(TRI).toHaveLength(4);
    expect(RN).toHaveLength(3);
  });

  it("selects exactly the wrong / partial graded ids — never a full-marks or a pending question", () => {
    const rows = analyseTest({
      worksheetId: "ws-1",
      title: "Full Mock 2",
      surface: "full-mock",
      subject: "maths",
      gradedAt: 1,
      response: resp([graded(1, 1, 1), graded(2, 0, 1), graded(3, 1, 3), pending(4, 5), graded(5, 0, 2), graded(6, 2, 2), graded(7, 0, 1)]),
      questionIds: [TRI[0], TRI[1], TRI[2], TRI[3], RN[0], RN[1], "PRED-not-in-bank"],
    });
    expect(rows.map((r) => r.qNumber)).toEqual([1, 2, 3, 5, 6, 7]); // pending q4 skipped
    const plan = buildRetryPlan(rows, "/full-mock/10/Maths");
    expect(plan.missedCount).toBe(4); // q2, q3, q5, q7
    expect(plan.unroutable).toBe(1); // q7 has no bank row
    expect(plan.groups.map((g) => [g.label, g.ids])).toEqual([
      ["Triangles", [TRI[1], TRI[2]]],
      ["Real Numbers", [RN[0]]],
    ]);
    const sp = new URLSearchParams(plan.groups[0].to.split("?")[1]);
    expect(plan.groups[0].to.startsWith("/practice/10/Maths?")).toBe(true);
    expect(sp.get("focusBankIds")).toBe(`${TRI[1]},${TRI[2]}`);
    expect(sp.get("strictFocus")).toBe("true");
    expect(sp.get("count")).toBe("2");
    expect(sp.get("src")).toBe(TS_RETRY_SRC);
    expect(sp.get("topic")).toBe("triangles");
  });

  it("a chapter test files every question under its own chapter, and misaligned ids are an honest unknown", () => {
    const rows = analyseTest({
      worksheetId: "ws-2",
      title: "CT",
      surface: "chapter-test",
      subject: "Maths",
      gradedAt: 1,
      response: resp([graded(1, 0, 1), graded(2, 0, 2)]),
      questionIds: [TRI[0]], // length mismatch → ids untrusted
      chapterTopicKey: "triangles",
    });
    expect(rows.every((r) => r.chapter === "triangles" && r.id === null)).toBe(true);
    expect(buildRetryPlan(rows, "/x").unroutable).toBe(2);
  });

  it("Quick Practice floor: 1 for a re-attempt link, unchanged otherwise", () => {
    expect(retryCountFloor(TS_RETRY_SRC, 3)).toBe(1);
    expect(retryCountFloor(null, 3)).toBe(3);
    expect(retryCountFloor("start-here", 3)).toBe(3);
  });

  it("re-attempt path for one id carries count 1", () => {
    const to = retryPracticePath({ subject: "Science", chapter: "light", ids: ["A"], returnTo: "/chapter-test/10/Science/light" });
    expect(new URLSearchParams(to.split("?")[1]).get("count")).toBe("1");
  });
});

describe("TS-ANALYSIS-1 · feature 2 — time per question", () => {
  it("budget math: Full Mock 2.25 min/mark; chapter test uses its own clock", () => {
    expect(FULL_MOCK_SECONDS_PER_MARK).toBe(135);
    expect(chapterTestSecondsPerMark(40)).toBe((48 * 60) / 40); // round(40*1.2)=48 min
    expect(chapterTestSecondsPerMark(10)).toBe((15 * 60) / 10); // 15-min floor
  });

  it("over-time flag vs budget; unmeasured shows —", () => {
    const rows = questionTimeRows(
      [
        { qNumber: 2, marks: 3 },
        { qNumber: 1, marks: 1 },
        { qNumber: 3, marks: 5 },
      ],
      { 1: 200_000, 2: 300_000 },
      135,
    );
    expect(rows.map((r) => [r.qNumber, r.ms, r.budgetMs, r.over])).toEqual([
      [1, 200_000, 135_000, true],
      [2, 300_000, 405_000, false],
      [3, null, 675_000, false],
    ]);
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(135_000)).toBe("2:15");
  });

  it("no measurement at all → every row unmeasured", () => {
    expect(questionTimeRows([{ qNumber: 1, marks: 1 }], null, 135)[0].ms).toBeNull();
  });

  it("storage merge adds per question and keeps only the newest papers", () => {
    let store = mergeQuestionTime({}, "ws-a", 1, 1000, 1);
    store = mergeQuestionTime(store, "ws-a", 1, 500, 2);
    expect(store["ws-a"].ms["1"]).toBe(1500);
    for (let i = 0; i < MAX_PAPERS + 5; i++) store = mergeQuestionTime(store, `ws-${i}`, 1, 10, 100 + i);
    expect(Object.keys(store)).toHaveLength(MAX_PAPERS);
    expect(store["ws-a"]).toBeUndefined();
  });
});

const row = (p: Partial<AnalysedQuestion>): AnalysedQuestion => ({
  worksheetId: "w",
  testTitle: "T",
  surface: "chapter-test",
  subject: "Maths",
  gradedAt: 1,
  qNumber: 1,
  id: "id",
  chapter: "c",
  chapterLabel: "C",
  subtopic: null,
  awarded: 0,
  total: 1,
  miss: "wrong",
  ...p,
});

describe("TS-ANALYSIS-1 · feature 3 — weakest 3 chapters", () => {
  it("orders by lowest %, needs the minimum marks, skips perfect chapters", () => {
    const rows = [
      row({ chapter: "a", chapterLabel: "A", awarded: 5, total: 10 }), // 50%
      row({ chapter: "b", chapterLabel: "B", awarded: 2, total: 10 }), // 20%
      row({ chapter: "c", chapterLabel: "C", awarded: 0, total: 4 }), // below threshold
      row({ chapter: "d", chapterLabel: "D", awarded: 8, total: 8 }), // perfect
      row({ chapter: "e", chapterLabel: "E", awarded: 6, total: 10 }), // 60%
      row({ chapter: "f", chapterLabel: "F", awarded: 9, total: 10 }), // 90% → 4th
      row({ chapter: "c", chapterLabel: "C", awarded: 0, total: 4 }), // c now 0/8 → 0%
    ];
    const w = weakestChapters(rows);
    expect(w.map((x) => [x.chapter, x.pct])).toEqual([
      ["c", 0],
      ["b", 20],
      ["a", 50],
    ]);
    expect(w[0].practiseTo).toBe("/practice/10/Maths?topic=c");
  });

  it("empty when no chapter has enough data", () => {
    expect(weakestChapters([row({ total: 3 })])).toEqual([]);
  });
});

describe("TS-ANALYSIS-1 · feature 4 — mistake notebook from real history", () => {
  const rec = (p: Partial<SessionRecord>): SessionRecord =>
    ({
      id: "CT-M-TRI-01",
      worksheetId: "ws-h1",
      surface: "chapter-test",
      title: "Triangles #1",
      subject: "maths",
      topicKeys: ["triangles"],
      questionIds: [TRI[0], TRI[1]],
      marksAwarded: 1,
      marksTotal: 3,
      status: "graded",
      fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
      sectionBreakdown: null,
      gradedAt: 100,
      perQuestionRef: "ref-1",
      dedupKey: "d",
      ...p,
    }) as SessionRecord;
  const payload = (ref: string, r: WorksheetGradeResponse): SessionPerQuestionPayload =>
    ({ ref, code: "x", worksheetId: "w", surface: "chapter-test", gradedAt: 1, response: r }) as SessionPerQuestionPayload;

  it("reads chapter tests + full mocks only, skips pending / no-payload / the test on screen", () => {
    const records = [
      rec({}),
      rec({ id: "W-1", surface: "worksheet", perQuestionRef: "ref-w" }),
      rec({ id: "CT-2", worksheetId: "ws-pending", status: "pending-upload", perQuestionRef: "ref-2" }),
      rec({ id: "CT-3", worksheetId: "ws-now", perQuestionRef: "ref-3" }),
      rec({ id: "CT-4", worksheetId: "ws-nopayload", perQuestionRef: "ref-missing" }),
    ];
    const payloads = ["ref-1", "ref-w", "ref-2", "ref-3"].map((r) => payload(r, resp([graded(1, 1, 1), graded(2, 0, 2)])));
    const rows = analyseHistory(records, payloads, "ws-now");
    expect(rows.map((r) => [r.worksheetId, r.qNumber])).toEqual([
      ["ws-h1", 1],
      ["ws-h1", 2],
    ]);
    const nb = notebookEntries(rows, { subject: "all", chapter: "all" });
    expect(nb.map((r) => [r.qNumber, r.id, r.miss])).toEqual([[2, TRI[1], "wrong"]]);
  });

  it("filters by subject and chapter, newest first", () => {
    const rows = [
      row({ worksheetId: "a", gradedAt: 1, subject: "Maths", chapter: "x", chapterLabel: "X", qNumber: 3 }),
      row({ worksheetId: "b", gradedAt: 5, subject: "Science", chapter: "y", chapterLabel: "Y", qNumber: 1 }),
      row({ worksheetId: "a", gradedAt: 1, subject: "Maths", chapter: "x", chapterLabel: "X", qNumber: 1 }),
      row({ worksheetId: "c", gradedAt: 9, subject: "Maths", chapter: "z", chapterLabel: "Z", miss: null, awarded: 1 }),
    ];
    expect(notebookEntries(rows, { subject: "all", chapter: "all" }).map((r) => `${r.worksheetId}${r.qNumber}`)).toEqual(["b1", "a1", "a3"]);
    expect(notebookEntries(rows, { subject: "Maths", chapter: "all" }).map((r) => r.worksheetId)).toEqual(["a", "a"]);
    expect(notebookEntries(rows, { subject: "all", chapter: "y" })).toHaveLength(1);
    expect(notebookChapters(rows, "Maths")).toEqual([{ chapter: "x", label: "X" }]);
  });
});

describe("TS-ANALYSIS-1 · feature 5 — this week's plan (series calendar)", () => {
  const rows = seriesSchedule("2027-02-17")!;
  const cal = (todayIso: string, maths: number[] = []) => ({ rows, todayIso, takenMocks: { Maths: maths, Science: [] } });
  const weak = weakestChapters([
    row({ chapter: "triangles", chapterLabel: "Triangles", awarded: 2, total: 10 }),
    row({ chapter: "polynomials", chapterLabel: "Polynomials", awarded: 6, total: 10 }),
  ]);

  it("is deterministic: retry, weakest chapter test, the series task for today's calendar row", () => {
    const a = weekPlan({ retry: { count: 6, testTitle: "Full Mock 2" }, weakest: weak, subject: "Maths", calendar: cal("2026-11-18") });
    const b = weekPlan({ retry: { count: 6, testTitle: "Full Mock 2" }, weakest: weak, subject: "Maths", calendar: cal("2026-11-18") });
    expect(a).toEqual(b);
    expect(a.map((t) => t.text)).toEqual([
      "Re-attempt 6 lost-marks questions from Full Mock 2",
      "Chapter Test: Triangles (your weakest, 20%)",
      "Test Series: Chapter Tests, finish by 30 Nov",
    ]);
    expect(a[1].to).toBe("/chapter-test/10/Maths/triangles");
    expect(a[2].to).toBe("/test-series");
  });

  it("pre-board round 1: the next Full-Length Test the student has not sat", () => {
    const t = seriesPlanTask("Maths", cal("2026-12-05", [1, 2, 4]));
    expect(t).toEqual({ key: "series", text: "Maths Full-Length Test 3 of 20 (pre-board round 1, by 20 Dec)", to: "/full-mock/10/Maths?paper=3" });
  });

  it("round 2 in January; between rows the next row to start is used; final revision; no board date → none", () => {
    expect(seriesPlanTask("Science", cal("2027-01-10"))?.to).toBe("/full-mock/10/Science?paper=11");
    expect(seriesPlanTask("Maths", cal("2026-12-25"))?.text).toBe("Maths Full-Length Test 11 of 20 (pre-board round 2, by 31 Jan)");
    expect(seriesPlanTask("Maths", cal("2027-02-03"))?.text).toBe("Test Series final revision: re-attempt your lowest Full-Length Test by 14 Feb");
    expect(seriesPlanTask("Maths", cal("2027-03-01"))).toBeNull();
    expect(seriesPlanTask("Maths", { rows: null, todayIso: "2026-11-18", takenMocks: { Maths: [], Science: [] } })).toBeNull();
  });

  it("a round fully sat points back to the series page", () => {
    expect(seriesPlanTask("Maths", cal("2026-12-05", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))?.to).toBe("/test-series");
  });

  it("taken mocks come from series worksheet ids only", () => {
    expect(takenSeriesMocks(["fm-ts1-m3--a-b", "fm-ts1-s12--x-y", "fm-plain-1", "ct-ts1-triangles--a-b", "fm-ts1-m3--c-d"])).toEqual({ Maths: [3], Science: [12] });
  });

  it("without a retry, the second-weakest chapter fills the third slot when there's no series task", () => {
    const p = weekPlan({ retry: null, weakest: weak, subject: "Maths", calendar: cal("2027-03-01") });
    expect(p.map((t) => t.key)).toEqual(["chapter-test", "practise"]);
  });

  it("no data → no plan (honest empty)", () => {
    expect(weekPlan({ retry: null, weakest: [], subject: "Maths", calendar: cal("2026-11-18") })).toEqual([]);
  });
});

describe("TS-ANALYSIS-1 · kill switch", () => {
  it("VITE_TS_ANALYSIS_DISABLED=1 disables; unset does not", () => {
    expect(tsAnalysisDisabled("1")).toBe(true);
    expect(tsAnalysisDisabled(undefined)).toBe(false);
    expect(tsAnalysisDisabled("0")).toBe(false);
  });
});
