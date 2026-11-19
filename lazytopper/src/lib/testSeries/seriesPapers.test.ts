/**
 * TEST-SERIES-1 — the series papers are FIXED (real bank):
 *   - Chapter Test: the fixedSeed draw is the same paper twice, ignores served history, and differs from the default fresh draw;
 *     the default (no fixedSeed) behaviour is unchanged (seeded draws, served history still preferred away from).
 *   - Full-Length Test #n is the pack draw's paper n (#1–8 = PDF Mock #n): the same question ids, in the same order.
 */
import { describe, expect, it } from "vitest";
import { drawChapterTest } from "../../components/chaptertest/chapterTestBlueprint";
import { loadChapter, loadSubjectBank } from "../packs/packContent";
import { drawPackMocks } from "../packs/buildPackFiles";
import { MOCKS_PER_SUBJECT } from "../packs/packLabels";
import { drawSeriesFullMock } from "./seriesFullMock";
import { pinnedSpecOf } from "./pinnedSpec";
import { SERIES_BASE_MOCKS_PER_SUBJECT, SERIES_MAX_MOCKS_PER_SUBJECT, chapterTestSeriesSeed, seriesKeyOfWorksheetId, seriesMockWorksheetId } from "./testSeries";

const ids = (p: { paper: { questions: ReadonlyArray<{ id: string }> } }) => p.paper.questions.map((q) => q.id);

describe("Chapter Test fixed paper", () => {
  const base = { subject: "Maths" as const, topicKey: "polynomials", topicLabel: "Polynomials", createdAt: "2026-01-01T00:00:00.000Z" };
  it("same paper on every draw, whatever the seed, worksheet id or served history", async () => {
    await loadChapter("polynomials");
    const fixedSeed = chapterTestSeriesSeed("polynomials");
    const a = drawChapterTest({ ...base, worksheetId: "ct-1", fixedSeed });
    const b = drawChapterTest({ ...base, worksheetId: "ct-2", fixedSeed, seed: 12345 });
    const served = new Map(ids(a).map((id) => [id, 1_000] as const));
    const c = drawChapterTest({ ...base, worksheetId: "ct-3", fixedSeed, servedAt: served });
    expect(a.enoughQuestions).toBe(true);
    expect(ids(b)).toEqual(ids(a));
    expect(ids(c)).toEqual(ids(a));
    expect(c.repeatCount).toBe(0);
    expect(c.hasServedHistory).toBe(false);
    // Another chapter's fixed seed is another paper.
    expect(drawChapterTest({ ...base, worksheetId: "ct-4", fixedSeed: chapterTestSeriesSeed("x") }).paper.questions.map((q) => q.id)).not.toEqual(ids(a));
  }, 60_000);

  it("the default draw is unchanged: seeded, varies by seed, and still steers away from served questions", async () => {
    await loadChapter("polynomials");
    const fixed = ids(drawChapterTest({ ...base, worksheetId: "ct-f", fixedSeed: chapterTestSeriesSeed("polynomials") }));
    const s1 = drawChapterTest({ ...base, worksheetId: "ct-a", seed: 1 });
    const s1again = drawChapterTest({ ...base, worksheetId: "ct-b", seed: 1 });
    const s2 = drawChapterTest({ ...base, worksheetId: "ct-c", seed: 2 });
    expect(ids(s1again)).toEqual(ids(s1));
    expect(ids(s2)).not.toEqual(ids(s1));
    expect(ids(s1)).not.toEqual(fixed);
    const served = new Map(ids(s1).map((id) => [id, 1_000] as const));
    const fresh = drawChapterTest({ ...base, worksheetId: "ct-d", seed: 1, servedAt: served });
    expect(fresh.hasServedHistory).toBe(true);
    expect(ids(fresh)).not.toEqual(ids(s1));
  }, 60_000);
});

/** BANK-RETIRE-1 (19 Nov 2026, owner ruling: retire, not repair): with 515 generated rows out of the served bank the SEEDED online draw of Maths
 *  Full-Length Test 20 no longer equals the seeded pack draw n = 20 (the pool is smaller where the no-repeat fallback starts). The served paper is
 *  the PINNED one (TS-FM-M20, seriesPaperIds.json, acknowledged in pinnedPapers.test.ts), so no student sees a different paper; the seeded draws
 *  are only the kill-switch path. The identity and the pin are still asserted. Drop the entry when the draws agree again. */
const ACKNOWLEDGED_SEEDED_PARITY_DRIFT: readonly string[] = ["Maths:20", "Maths:3", "Maths:25", "Science:25"]; // Maths:25 - TS-MORE-1: the pin-only paper 25 chains from the pins (drawPackMockAfter), the online seeded draw does not; Maths:3 - STEPMARK-2 batch 1 (step-mark prefixes moved the seeded Maths draw)

describe("Full-Length Test #n === the pack draw's paper n (#1–8 = PDF Mock #n)", () => {
  it.each([
    ["Maths", 1],
    ["Maths", 3],
    ["Science", 2],
    ["Science", MOCKS_PER_SUBJECT],
    ["Maths", SERIES_BASE_MOCKS_PER_SUBJECT],
    ["Science", SERIES_MAX_MOCKS_PER_SUBJECT],
    ["Maths", SERIES_MAX_MOCKS_PER_SUBJECT],
  ] as const)("%s Full-Length Test %i has the pack draw's question ids", async (subject, n) => {
    const pack = subject === "Maths" ? "maths" : "science";
    await loadSubjectBank(pack);
    const pdf = drawPackMocks(pack, n).find((p) => p.n === n);
    expect(pdf, "the PDF paper exists").toBeTruthy();
    const worksheetId = seriesMockWorksheetId("fm-abc-def", subject, n);
    const online = drawSeriesFullMock(subject, n, { worksheetId, code: "FM-M-#01", name: "Maths Full Mock #01", createdAt: "2026-01-01T00:00:00.000Z" });
    expect(online).not.toBeNull();
    if (ACKNOWLEDGED_SEEDED_PARITY_DRIFT.includes(`${subject}:${n}`)) {
      expect(pinnedSpecOf(`TS-FM-${subject === "Maths" ? "M" : "S"}${n}`), "the served paper is pinned").not.toBeNull();
      if (n > SERIES_BASE_MOCKS_PER_SUBJECT) {
        // TS-MORE-1: the SERVED paper is the pin; the seeded draw is only the kill-switch path (which never reaches papers 21-25).
        expect(pinnedSpecOf(`TS-FM-${subject === "Maths" ? "M" : "S"}${n}`)!.ids.length).toBe(ids(online!).length);
      }
    } else {
      expect(ids(online!)).toEqual(ids(pdf!.drawn));
      expect(online!.paper.questions.map((q) => [q.section, q.marks])).toEqual(pdf!.drawn.paper.questions.map((q) => [q.section, q.marks]));
    }
    // The sitting's identity is the student's, and it is recognisable as series paper n.
    expect(online!.paper.worksheetId).toBe(worksheetId);
    expect(seriesKeyOfWorksheetId(online!.paper.worksheetId)).toEqual({ kind: "mock", subject, n });
    expect(online!.repeatCount).toBe(0);
  }, 120_000);

  it("drawPackMocks(upTo) draws the same first papers as the full set", async () => {
    await loadSubjectBank("maths");
    const all = drawPackMocks("maths");
    expect(all.length).toBe(MOCKS_PER_SUBJECT);
    const first2 = drawPackMocks("maths", 2);
    expect(first2.map((p) => p.n)).toEqual([1, 2]);
    expect(first2.map((p) => ids(p.drawn))).toEqual(all.slice(0, 2).map((p) => ids(p.drawn)));
    // Going past the pack's 8 leaves papers 1..8 untouched.
    const ten = drawPackMocks("maths", 10);
    expect(ten.slice(0, MOCKS_PER_SUBJECT).map((p) => ids(p.drawn))).toEqual(all.map((p) => ids(p.drawn)));
  }, 120_000);
});
