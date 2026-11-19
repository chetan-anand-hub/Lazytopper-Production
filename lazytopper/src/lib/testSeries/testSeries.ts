/**
 * TEST-SERIES-1 (owner, 18 Nov 2026; corrected 19:38 IST: the Test Series is its OWN product, not the Board Pass) — the Pre-Boards
 * Test Series: the chapter tests and full mocks, presented as numbered, fixed papers. PURE and light (no bank, no services), so the public /test-series page,
 * the Chapter Test / Full Mock pages and the tests all read the same numbering.
 *
 *   Chapter Tests  SERIES_PAPERS_PER_CHAPTER (5) per board chapter, in syllabus order (BOARD_CHAPTER_KEYS): CT-M01..CT-M13,
 *                  CT-S01..CT-S13 are each chapter's paper 1 (seed "ts1:<topicKey>", unchanged); TS-MORE-1 adds papers 2..5
 *                  (CT-M01-2 … CT-S13-5, seed "ts1p<k>:<topicKey>", drawn so no question repeats across a chapter's papers).
 *                  FIXED papers, pinned (seriesPaperIds.json), served history ignored.
 *   Full-Length    SERIES_MOCKS_PER_SUBJECT per subject: FM-M1..FM-M25, FM-S1..FM-S25, drawn by the pack's own mock draw; #1–8 ARE
 *                  PDF Mocks #1–8 (drawPackMocks), #9+ continue the same seed scheme.
 *
 * Every count here is derived from code (the syllabus keys, SERIES_MOCKS_PER_SUBJECT); nothing is typed. A sitting of a series paper is
 * recognised by its worksheet id (`ct-ts1-<topicKey>--…` / `ct-ts1p<k>-<topicKey>--…` / `fm-ts1-<m|s><n>--…`), which the session record keeps.
 * No gate, no entitlement and no price live here: the price is the `test_series` SKU's (services/packs.ts PACK_PRICE_INR /
 * packPriceLabel("test_series"), the client copy of the server table in server/services/packProducts.cjs) - TS-PACK-1.
 */
import { BOARD_CHAPTER_KEYS, chapterUnit } from "../../config/syllabusUnits2026-27";
import { desktopTopicBySlug } from "../desktop/topics";
import { MOCKS_PER_SUBJECT, TEST_SERIES_CHECKS_PER_PAPER_COPY, TEST_SERIES_VALIDITY, TEST_SERIES_WRITTEN_SECTIONS } from "../packs/packLabels";

// HUB-TS-1: the constant lives in ./seriesCounts (import-free, for the Practice hub's first paint); re-exported here unchanged.
import {
  SERIES_BASE_MOCKS_PER_SUBJECT,
  SERIES_MAX_MOCKS_PER_SUBJECT,
  SERIES_MAX_PAPERS_PER_CHAPTER,
  SERIES_MOCKS_PER_SUBJECT,
  SERIES_PAPERS_PER_CHAPTER,
  tsMoreDisabled,
} from "./seriesCounts";
export {
  SERIES_BASE_MOCKS_PER_SUBJECT,
  SERIES_MAX_MOCKS_PER_SUBJECT,
  SERIES_MAX_PAPERS_PER_CHAPTER,
  SERIES_MOCKS_PER_SUBJECT,
  SERIES_PAPERS_PER_CHAPTER,
  tsMoreDisabled,
};
/** Full-Length Tests 1..PACK_MATCHED_MOCKS are the same papers as the printed Mock Pack's mocks. */
export const PACK_MATCHED_MOCKS = MOCKS_PER_SUBJECT;

export const TEST_SERIES_PATH = "/test-series";
export const TEST_SERIES_NAME = "Pre-Boards Test Series";
/**
 * OWNER CORRECTION 18 Nov 2026, 19:38 IST — the Test Series is its OWN product (not the Board Pass), ₹999 + GST till the boards.
 * TS-PACK-1: its price is the `test_series` SKU's — read it with packPriceLabel("test_series") (services/packs.ts); no copy here.
 */
/** Where "Get the Test Series" goes: the existing pack checkout (PacksShop readBuyResume -> the pack checkout sheet). */
export const TEST_SERIES_BUY_PATH = "/packs?buy=test_series";
/** TS-UX-PAGE-1: the same link with `from=test-series` - closing the checkout there returns to /test-series (PacksShop readReturnTo). */
export const TEST_SERIES_BUY_FROM_PATH = `${TEST_SERIES_BUY_PATH}&from=test-series`;
/** The series tag in seeds and worksheet ids. A new series (a re-numbered set of papers) would take a new tag. */
export const SERIES_TAG = "ts1";
/** `?series=1` on a Chapter Test URL opens the chapter's fixed series paper. */
export const CT_SERIES_PARAM = "series";
/** TS-MORE-1: `&paper=<k>` (k = 2..5) picks the chapter's k-th series paper; absent or 1 = the original paper (unchanged URL). */
export const CT_PAPER_PARAM = "paper";
/** `?paper=<n>` on a Full Mock URL opens series Full-Length Test #n (#1–8 = PDF Mock #n). */
export const FM_PAPER_PARAM = "paper";

export type SeriesSubject = "Maths" | "Science";

export interface SeriesChapterTest {
  kind: "chapter";
  /** "CT-M01" … "CT-S13" for the chapter's paper 1; "CT-M01-2" … "CT-S13-5" for papers 2..5 (TS-MORE-1). */
  code: string;
  /** The chapter's own code ("CT-M01"), the same on all of its papers. */
  baseCode: string;
  subject: SeriesSubject;
  /** 1-based within the subject, in syllabus order. */
  index: number;
  /** 1..SERIES_PAPERS_PER_CHAPTER: which of the chapter's series papers this is. */
  paper: number;
  topicKey: string;
  label: string;
  href: string;
}

export interface SeriesFullMock {
  kind: "mock";
  /** "FM-M1" … "FM-S8". */
  code: string;
  subject: SeriesSubject;
  n: number;
  href: string;
}

export type SeriesTest = SeriesChapterTest | SeriesFullMock;

const SUBJECTS: readonly SeriesSubject[] = ["Maths", "Science"];
const letter = (s: SeriesSubject): "M" | "S" => (s === "Maths" ? "M" : "S");

function subjectOfKey(key: string): SeriesSubject | null {
  const unit = chapterUnit(key);
  if (!unit) return null;
  return unit.subject === "maths" ? "Maths" : "Science";
}

/** The code of chapter paper k: paper 1 keeps the chapter's code ("CT-M01"); k > 1 appends "-k" ("CT-M01-3"). */
export function chapterPaperCode(baseCode: string, k: number): string {
  return k <= 1 ? baseCode : `${baseCode}-${k}`;
}

/** Chapter paper k's URL: k = 1 is EXACTLY the original `?series=1`; k > 1 adds `&paper=k` (TS-MORE-1). */
export function chapterTestSeriesHref(subject: SeriesSubject, topicKey: string, k = 1): string {
  const base = `/chapter-test/10/${subject}/${topicKey}?${CT_SERIES_PARAM}=1`;
  return k <= 1 ? base : `${base}&${CT_PAPER_PARAM}=${k}`;
}

export function fullMockSeriesHref(subject: SeriesSubject, n: number): string {
  return `/full-mock/10/${subject}?${FM_PAPER_PARAM}=${n}`;
}

/**
 * The numbered Chapter Tests: every chapter's papers 1..SERIES_PAPERS_PER_CHAPTER, Maths then Science, each chapter in syllabus
 * order (its papers together). `seriesChapters()` is the one-per-chapter list (paper 1).
 */
export function seriesChapterTests(): SeriesChapterTest[] {
  const out: SeriesChapterTest[] = [];
  for (const subject of SUBJECTS) {
    let index = 0;
    for (const topicKey of BOARD_CHAPTER_KEYS) {
      if (subjectOfKey(topicKey) !== subject) continue;
      index += 1;
      const baseCode = `CT-${letter(subject)}${String(index).padStart(2, "0")}`;
      for (let paper = 1; paper <= SERIES_PAPERS_PER_CHAPTER; paper += 1) {
        out.push({
          kind: "chapter",
          code: chapterPaperCode(baseCode, paper),
          baseCode,
          subject,
          index,
          paper,
          topicKey,
          label: desktopTopicBySlug(topicKey)?.name ?? topicKey,
          href: chapterTestSeriesHref(subject, topicKey, paper),
        });
      }
    }
  }
  return out;
}

/** One entry per chapter (its paper 1): the chapter list. */
export function seriesChapters(): SeriesChapterTest[] {
  return seriesChapterTests().filter((t) => t.paper === 1);
}

/** The numbered Full-Length Tests: SERIES_MOCKS_PER_SUBJECT per subject. */
export function seriesFullMocks(): SeriesFullMock[] {
  const out: SeriesFullMock[] = [];
  for (const subject of SUBJECTS) {
    for (let n = 1; n <= SERIES_MOCKS_PER_SUBJECT; n += 1) {
      out.push({ kind: "mock", code: `FM-${letter(subject)}${n}`, subject, n, href: fullMockSeriesHref(subject, n) });
    }
  }
  return out;
}

export interface SeriesTotals {
  /** Chapter TESTS (papers): chapters x papersPerChapter. */
  chapterTests: number;
  /** Chapter tests (papers) per subject. */
  chapterTestsPerSubject: Record<SeriesSubject, number>;
  /** Board chapters (26) and per subject (13). */
  chapters: number;
  chaptersPerSubject: Record<SeriesSubject, number>;
  papersPerChapter: number;
  fullMocks: number;
  mocksPerSubject: number;
  total: number;
}

export function seriesTotals(): SeriesTotals {
  const cts = seriesChapterTests();
  const chapters = seriesChapters();
  const mocks = seriesFullMocks();
  return {
    chapterTests: cts.length,
    chapterTestsPerSubject: {
      Maths: cts.filter((t) => t.subject === "Maths").length,
      Science: cts.filter((t) => t.subject === "Science").length,
    },
    chapters: chapters.length,
    chaptersPerSubject: {
      Maths: chapters.filter((t) => t.subject === "Maths").length,
      Science: chapters.filter((t) => t.subject === "Science").length,
    },
    papersPerChapter: SERIES_PAPERS_PER_CHAPTER,
    fullMocks: mocks.length,
    mocksPerSubject: SERIES_MOCKS_PER_SUBJECT,
    total: cts.length + mocks.length,
  };
}

/** "130 chapter tests + 50 full-length tests" — counts from code (66 = 26 + 40 under the VITE_TS_MORE_DISABLED kill switch). */
export function seriesContentsLine(t: SeriesTotals = seriesTotals()): string {
  return `${t.chapterTests} chapter tests + ${t.fullMocks} full-length tests`;
}

/**
 * TS-PACK-1 — the Test Series Pack's one line (the /packs row, its pop-up): "130 chapter tests + 50 full-length tests, Maths + Science.
 * Your written answers, Sections B–D (B–E in full-length tests), checked step by step, 2 checks per paper, till 31 May 2027 (after your boards)." Counts from code.
 */
export function testSeriesPackLine(t: SeriesTotals = seriesTotals()): string {
  return `${seriesContentsLine(t)}, Maths + Science. Your written answers, ${TEST_SERIES_WRITTEN_SECTIONS}, checked step by step, ${TEST_SERIES_CHECKS_PER_PAPER_COPY}, ${TEST_SERIES_VALIDITY}.`;
}

/* ── URL params ──────────────────────────────────────────────────────────────── */

/** The series tag of chapter paper k in seeds and worksheet ids: paper 1 is "ts1" (unchanged); paper k > 1 is "ts1p<k>". */
export function chapterPaperTag(k: number): string {
  return k <= 1 ? SERIES_TAG : `${SERIES_TAG}p${k}`;
}

/** The fixed seed string of a chapter's series paper (paper 1: "ts1:<topicKey>", unchanged). */
export function chapterTestSeriesSeed(topicKey: string, k = 1): string {
  return `${chapterPaperTag(k)}:${topicKey}`;
}

/** Board chapter key (already canonical: the callers pass `resolveCanonicalSlug(...)`) -> its paper-1 series test (the chapter). */
function chapterTestsByKey(): Map<string, SeriesChapterTest> {
  return new Map(seriesChapters().map((t) => [t.topicKey, t] as const));
}

/** True when a Chapter Test URL asks for the series paper (`?series=1`) of a board chapter. */
export function isChapterTestSeriesRequest(param: string | null, topicKey: string): boolean {
  return param === "1" && chapterTestsByKey().has(topicKey);
}

/** `?paper=<n>` → n when it names a series Full-Length Test (1..SERIES_MOCKS_PER_SUBJECT), else null (the normal fresh mock). */
export function seriesMockNumber(param: string | null): number | null {
  if (!param || !/^\d{1,2}$/.test(param)) return null;
  const n = Number(param);
  return n >= 1 && n <= SERIES_MOCKS_PER_SUBJECT ? n : null;
}

/**
 * `&paper=<k>` on a chapter series URL -> k (1 when absent), or null when it names no offered paper (not 1..SERIES_PAPERS_PER_CHAPTER,
 * or a non-digit): the page then opens the ordinary fresh test, as for any other unknown series param. With the TS-MORE-1 kill
 * switch set only paper 1 exists.
 */
export function seriesChapterPaperNumber(param: string | null): number | null {
  if (param === null || param === "") return 1;
  if (!/^[1-9]$/.test(param)) return null;
  const k = Number(param);
  return k >= 1 && k <= SERIES_PAPERS_PER_CHAPTER ? k : null;
}

/** The chapter's series paper k (default 1), or null for a non-chapter key / a paper that is not offered. */
export function seriesChapterTestOf(topicKey: string, k = 1): SeriesChapterTest | null {
  const base = chapterTestsByKey().get(topicKey);
  if (!base || k < 1 || k > SERIES_PAPERS_PER_CHAPTER) return null;
  return k === 1 ? base : { ...base, code: chapterPaperCode(base.baseCode, k), paper: k, href: chapterTestSeriesHref(base.subject, base.topicKey, k) };
}

/** "Test Series · Chapter Test 3 of 13 (CT-M03)"; with several papers per chapter: "… Chapter Test 3 of 13 · Paper 2 of 5 (CT-M03-2)". */
export function chapterTestSeriesLabel(t: SeriesChapterTest, totals: SeriesTotals = seriesTotals()): string {
  const paper = totals.papersPerChapter > 1 ? ` · Paper ${t.paper} of ${totals.papersPerChapter}` : "";
  return `Test Series · Chapter Test ${t.index} of ${totals.chaptersPerSubject[t.subject]}${paper} (${t.code})`;
}

/** "Test Series · Full-Length Test 3 of 25". */
export function fullMockSeriesLabel(n: number): string {
  return `Test Series · Full-Length Test ${n} of ${SERIES_MOCKS_PER_SUBJECT}`;
}

/* ── Worksheet ids: how a sitting is recognised ─────────────────────────────── */

/**
 * `ct-<t>-<r>` → `ct-ts1-<topicKey>--<t>-<r>` (paper 1) or `ct-ts1p<k>-<topicKey>--<t>-<r>` (papers 2..5): the minted id stays
 * unique; the prefix names the series paper. The server admits by `startsWith(prefix)` and every prefix ends in "--", so no paper's
 * prefix is a prefix of another's: "ct-ts1p3-" can never start with "ct-ts1-", and "…-x--" never starts "…-x-y--".
 */
export function seriesChapterWorksheetId(baseId: string, topicKey: string, k = 1): string {
  return baseId.replace(/^ct-/, `ct-${chapterPaperTag(k)}-${topicKey}--`);
}

/** `fm-<t>-<r>` → `fm-ts1-m3--<t>-<r>`. */
export function seriesMockWorksheetId(baseId: string, subject: SeriesSubject, n: number): string {
  return baseId.replace(/^fm-/, `fm-${SERIES_TAG}-${letter(subject).toLowerCase()}${n}--`);
}

export type SeriesKey = { kind: "chapter"; topicKey: string; paper: number } | { kind: "mock"; subject: SeriesSubject; n: number };

const CT_ID = new RegExp(`^ct-${SERIES_TAG}(?:p([2-9]))?-([a-z0-9-]+?)--`);
const FM_ID = new RegExp(`^fm-${SERIES_TAG}-([ms])(\\d{1,2})--`);

/** The series paper a worksheet id belongs to, or null (an ordinary, freshly drawn test). */
export function seriesKeyOfWorksheetId(id: string | null | undefined): SeriesKey | null {
  const s = String(id ?? "");
  const ct = CT_ID.exec(s);
  if (ct) return { kind: "chapter", topicKey: ct[2], paper: ct[1] ? Number(ct[1]) : 1 };
  const fm = FM_ID.exec(s);
  if (fm) return { kind: "mock", subject: fm[1] === "m" ? "Maths" : "Science", n: Number(fm[2]) };
  return null;
}

/**
 * TS-PACK-1 — the manifest `key` ("TS-CT-M01" / "TS-FM-S8", server/data/testSeriesPapers.json) of the series paper a worksheet id
 * belongs to, or null. The server counts a Test Series Pack's checks per paper under this key (GET /api/packs/mine `testSeries.used`).
 */
export function seriesPaperKeyOfWorksheetId(id: string | null | undefined): string | null {
  const k = seriesKeyOfWorksheetId(id);
  if (!k) return null;
  if (k.kind === "chapter") {
    const t = seriesChapterTestOf(k.topicKey, k.paper);
    return t ? `TS-${t.code}` : null;
  }
  const m = seriesFullMocks().find((x) => x.subject === k.subject && x.n === k.n);
  return m ? `TS-${m.code}` : null;
}

/* ── Progress (real session records only) ───────────────────────────────────── */

/** The fields of a session record progress reads (SessionRecord satisfies it). */
export interface SeriesRecordLike {
  worksheetId: string;
  surface: string;
  status: "graded" | "pending-upload" | "partial";
  marksAwarded: number;
  marksTotal: number;
  gradedAt: number;
}

export type SeriesStatus = "not-started" | "attempted" | "graded";

export interface SeriesTestProgress {
  status: SeriesStatus;
  /** The latest GRADED sitting's marks; null when none is graded. */
  score: { awarded: number; total: number } | null;
}

export interface SeriesProgress {
  byCode: Record<string, SeriesTestProgress>;
  /** Tests with at least one sitting (attempted or graded). */
  done: number;
  total: number;
  /** Graded Full-Length Tests per subject, in paper order: the score trend. */
  mockTrend: Record<SeriesSubject, Array<{ n: number; code: string; percent: number }>>;
}

function codeOfKey(key: SeriesKey): string | null {
  if (key.kind === "mock") return key.n >= 1 && key.n <= SERIES_MOCKS_PER_SUBJECT ? `FM-${letter(key.subject)}${key.n}` : null;
  return seriesChapterTestOf(key.topicKey, key.paper)?.code ?? null;
}

/** Progress from the student's REAL session records. A record that is not a series sitting is ignored; nothing is invented. */
export function seriesProgress(records: readonly SeriesRecordLike[]): SeriesProgress {
  const tests: SeriesTest[] = [...seriesChapterTests(), ...seriesFullMocks()];
  const byCode: Record<string, SeriesTestProgress> = {};
  for (const t of tests) byCode[t.code] = { status: "not-started", score: null };
  const sorted = [...records].sort((a, b) => (Number(a.gradedAt) || 0) - (Number(b.gradedAt) || 0));
  for (const r of sorted) {
    const key = seriesKeyOfWorksheetId(r.worksheetId);
    if (!key) continue;
    if (key.kind === "chapter" && r.surface !== "chapter-test") continue;
    if (key.kind === "mock" && r.surface !== "full-mock") continue;
    const code = codeOfKey(key);
    if (!code || !byCode[code]) continue;
    const cur = byCode[code];
    if (r.status === "graded" && Number(r.marksTotal) > 0) {
      byCode[code] = { status: "graded", score: { awarded: Number(r.marksAwarded) || 0, total: Number(r.marksTotal) } };
    } else if (cur.status === "not-started") {
      byCode[code] = { status: "attempted", score: null };
    }
  }
  const mockTrend: SeriesProgress["mockTrend"] = { Maths: [], Science: [] };
  for (const m of seriesFullMocks()) {
    const p = byCode[m.code];
    if (p.status === "graded" && p.score) {
      mockTrend[m.subject].push({ n: m.n, code: m.code, percent: Math.round((p.score.awarded / p.score.total) * 100) });
    }
  }
  return {
    byCode,
    done: Object.values(byCode).filter((p) => p.status !== "not-started").length,
    total: tests.length,
    mockTrend,
  };
}

/* ── The recommended schedule (NOT locked: every test is open today) ────────── */

export interface SeriesScheduleRow {
  id: "chapters" | "round1" | "round2" | "final";
  when: string;
  title: string;
  body: string;
  /** Inclusive IST date range "YYYY-MM-DD" used to mark the current row (start null = from now). */
  from: string | null;
  to: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/**
 * The calendar, from the board date the app already predicts (`predictCbseExamDate("10")` — the caller passes it). Years follow the
 * board year; the board-date text is that prediction, labelled "expected". Null when the date cannot be read (no invented date).
 */
export function seriesSchedule(boardIso: string): SeriesScheduleRow[] | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(boardIso)) return null;
  const boardYear = Number(boardIso.slice(0, 4));
  const prev = boardYear - 1;
  const half = Math.ceil(SERIES_MOCKS_PER_SUBJECT / 2);
  const totals = seriesTotals();
  return [
    {
      id: "chapters",
      // TS-MORE-1 (owner, 19 Nov 2026): the chapter tests are not limited to November - they run till the boards.
      when: "Any time till the boards",
      title: `Chapter Tests (${totals.chapterTests})`,
      body:
        totals.papersPerChapter > 1
          ? `${totals.papersPerChapter} tests per chapter. Take your weakest chapters first.`
          : "One test per chapter. Take your weakest chapters first.",
      // `from`/`to` are only the FOCUS window (which row is marked "Now" and what the weekly plan points at: the chapter tests until the
      // first full-length round starts). The tests themselves stay open all the way to the boards, as `when` says.
      from: null,
      to: `${prev}-11-30`,
    },
    {
      id: "round1",
      when: `1 – 20 Dec ${prev}`,
      title: "Pre-board round 1",
      body: `Full-Length Tests 1–${half} in Maths and Science.`,
      from: `${prev}-12-01`,
      to: `${prev}-12-20`,
    },
    {
      id: "round2",
      when: `January ${boardYear}`,
      title: "Pre-board round 2",
      body: `Full-Length Tests ${half + 1}–${SERIES_MOCKS_PER_SUBJECT} in Maths and Science.`,
      from: `${boardYear}-01-01`,
      to: `${boardYear}-01-31`,
    },
    {
      id: "final",
      when: `1 – 14 Feb ${boardYear}`,
      title: "Final revision",
      body: `Re-attempt your two lowest full-length tests. Boards expected from ${longDate(boardIso)}.`,
      from: `${boardYear}-02-01`,
      to: `${boardYear}-02-14`,
    },
  ];
}

/** The schedule row that covers `todayIso` (IST "YYYY-MM-DD"), or null between rows / after the last. */
export function currentScheduleRow(rows: readonly SeriesScheduleRow[], todayIso: string): SeriesScheduleRow["id"] | null {
  for (const r of rows) {
    if ((r.from === null || todayIso >= r.from) && todayIso <= r.to) return r.id;
  }
  return null;
}

/**
 * TS-PAGE-2 — the Full-Length Tests grouped by the calendar's two pre-board rounds (the SAME split `seriesSchedule` uses:
 * round 1 = tests 1..ceil(N/2), round 2 = the rest), so the page's grouping and the calendar can never disagree. Counts from code.
 */
export interface SeriesMockRound {
  id: "round1" | "round2";
  from: number;
  to: number;
}
export function seriesMockRounds(): SeriesMockRound[] {
  const half = Math.ceil(SERIES_MOCKS_PER_SUBJECT / 2);
  return [
    { id: "round1", from: 1, to: half },
    { id: "round2", from: half + 1, to: SERIES_MOCKS_PER_SUBJECT },
  ];
}
