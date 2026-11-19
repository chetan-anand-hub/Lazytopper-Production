/**
 * HUB-TS-1 - the Practice hub's Test Series card + chooser: PURE model (no React, no I/O). Every count and every URL comes from
 * lib/testSeries/testSeries.ts (seriesTotals, seriesChapterTests, seriesMockRounds, chapterTestSeriesHref, fullMockSeriesHref);
 * progress is `seriesProgress` over the student's own session records (the SAME source /test-series reads). Nothing is typed here.
 */
import {
  chapterTestSeriesHref,
  fullMockSeriesHref,
  seriesChapterTests,
  seriesFullMocks,
  seriesMockRounds,
  type SeriesChapterTest,
  type SeriesFullMock,
  type SeriesMockRound,
  type SeriesProgress,
  type SeriesSubject,
  type SeriesTestProgress,
} from "../../lib/testSeries/testSeries";

/**
 * Papers per chapter. Today every chapter has ONE series paper. The lane that makes it five replaces this constant (or the chooser's
 * `papersPerChapter` prop) - the UI renders 1..P with no other change (P = 1 skips the paper-tile step).
 */
export const CHAPTER_PAPERS_PER_CHAPTER = 1;
/** Query param carrying paper k (k > 1) on a chapter's series URL. PLACEHOLDER until the multi-paper lane defines it; k = 1 never uses it. */
export const CT_PAPER_PARAM = "paper";

export { HUB_CARD_SHORT, hubCardLine } from "./hubTsFlag";

/** The URL of chapter paper k (k = 1 is exactly `chapterTestSeriesHref`, what /test-series opens). */
export function chapterPaperHref(subject: SeriesSubject, topicKey: string, k: number): string {
  const base = chapterTestSeriesHref(subject, topicKey);
  return k <= 1 ? base : `${base}&${CT_PAPER_PARAM}=${k}`;
}

export type PaperProgressFn = (test: SeriesChapterTest, k: number) => SeriesTestProgress | undefined;

/** Default per-paper progress: the single series record is paper 1; papers 2..P have no record source yet -> not started. */
export const defaultPaperProgress =
  (progress: SeriesProgress | null): PaperProgressFn =>
  (test, k) =>
    k === 1 ? progress?.byCode[test.code] : undefined;

const started = (p: SeriesTestProgress | undefined): boolean => Boolean(p) && p!.status !== "not-started";

export interface ChapterRow {
  test: SeriesChapterTest;
  /** Papers (of P) with a sitting. */
  done: number;
  total: number;
  /** "Not started" / "k of P done"; null when signed out or the records have not loaded (no progress text at all). */
  label: string | null;
}

export function chapterRows(subject: SeriesSubject, progress: SeriesProgress | null, papersPerChapter: number, paperProgress?: PaperProgressFn): ChapterRow[] {
  const pp = paperProgress ?? defaultPaperProgress(progress);
  const P = Math.max(1, Math.floor(papersPerChapter));
  return seriesChapterTests()
    .filter((t) => t.subject === subject)
    .map((test) => {
      let done = 0;
      for (let k = 1; k <= P; k += 1) if (started(pp(test, k))) done += 1;
      const label = progress === null ? null : done === 0 ? "Not started" : `${done} of ${P} done`;
      return { test, done, total: P, label };
    });
}

/** The chapter to preselect: the first with an unstarted paper (signed in), else the first. */
export function defaultChapterKey(rows: readonly ChapterRow[], signedInProgress: boolean): string | null {
  if (rows.length === 0) return null;
  if (signedInProgress) {
    const next = rows.find((r) => r.done < r.total);
    if (next) return next.test.topicKey;
  }
  return rows[0].test.topicKey;
}

export interface PaperTile {
  k: number;
  href: string;
  status: "not-started" | "attempted" | "graded";
  score: { awarded: number; total: number } | null;
}

export function chapterPaperTiles(test: SeriesChapterTest, papersPerChapter: number, paperProgress: PaperProgressFn, hrefOf: (subject: SeriesSubject, topicKey: string, k: number) => string = chapterPaperHref): PaperTile[] {
  const P = Math.max(1, Math.floor(papersPerChapter));
  const out: PaperTile[] = [];
  for (let k = 1; k <= P; k += 1) {
    const p = paperProgress(test, k);
    out.push({ k, href: hrefOf(test.subject, test.topicKey, k), status: p?.status ?? "not-started", score: p?.score ?? null });
  }
  return out;
}

/** The paper to preselect: the first unstarted one (signed in), else paper 1. */
export function defaultPaperK(tiles: readonly PaperTile[], signedInProgress: boolean): number {
  if (signedInProgress) {
    const next = tiles.find((t) => t.status === "not-started");
    if (next) return next.k;
  }
  return 1;
}

export interface MockTile {
  n: number;
  code: string;
  href: string;
  status: "not-started" | "attempted" | "graded";
  score: { awarded: number; total: number } | null;
  /** The one "Next" tile: the first unstarted Full-Length Test of this subject (signed in only). */
  next: boolean;
}

export interface MockGroup {
  round: SeriesMockRound;
  tiles: MockTile[];
}

/** Full-length papers of a subject grouped by the calendar rounds (the same split `seriesSchedule` uses). */
export function mockGroups(subject: SeriesSubject, progress: SeriesProgress | null): MockGroup[] {
  const mocks: SeriesFullMock[] = seriesFullMocks().filter((m) => m.subject === subject);
  const nextN = progress ? mocks.find((m) => (progress.byCode[m.code]?.status ?? "not-started") === "not-started")?.n ?? null : null;
  return seriesMockRounds().map((round) => ({
    round,
    tiles: mocks
      .filter((m) => m.n >= round.from && m.n <= round.to)
      .map((m) => {
        const p = progress?.byCode[m.code];
        return {
          n: m.n,
          code: m.code,
          href: fullMockSeriesHref(subject, m.n),
          status: p?.status ?? "not-started",
          score: p?.score ?? null,
          next: nextN === m.n,
        };
      }),
  }));
}

export function defaultMockN(groups: readonly MockGroup[], progress: SeriesProgress | null): number {
  if (progress) for (const g of groups) for (const t of g.tiles) if (t.next) return t.n;
  return 1;
}
