/**
 * TEST-SERIES-1 (owner, 18 Nov 2026: "make the Board Pass be the test series") — the Pre-Boards Test Series: what the Board Pass
 * already contains, presented as numbered, fixed papers. PURE and light (no bank, no services), so the public /test-series page,
 * the Chapter Test / Full Mock pages and the tests all read the same numbering.
 *
 *   Chapter Tests  one per board chapter, in syllabus order (BOARD_CHAPTER_KEYS): CT-M01..CT-M13, CT-S01..CT-S13.
 *                  A FIXED paper per chapter: drawChapterTest({ fixedSeed: "ts1:<topicKey>" }), served history ignored.
 *   Full Mocks     MOCKS_PER_SUBJECT per subject: FM-M1..FM-M8, FM-S1..FM-S8. Full Mock #n IS PDF Mock #n (drawPackMocks).
 *
 * Every count here is derived from code (the syllabus keys, MOCKS_PER_SUBJECT); nothing is typed. A sitting of a series paper is
 * recognised by its worksheet id (`ct-ts1-<topicKey>--…` / `fm-ts1-<m|s><n>--…`), which the session record keeps.
 * No price, no gate and no entitlement lives here.
 */
import { BOARD_CHAPTER_KEYS, chapterUnit } from "../../config/syllabusUnits2026-27";
import { desktopTopicBySlug } from "../desktop/topics";
import { MOCKS_PER_SUBJECT } from "../packs/packLabels";

export const TEST_SERIES_PATH = "/test-series";
export const TEST_SERIES_NAME = "Pre-Boards Test Series";
/** The series tag in seeds and worksheet ids. A new series (a re-numbered set of papers) would take a new tag. */
export const SERIES_TAG = "ts1";
/** `?series=1` on a Chapter Test URL opens the chapter's fixed series paper. */
export const CT_SERIES_PARAM = "series";
/** `?paper=<n>` on a Full Mock URL opens series Full Mock #n (= PDF Mock #n). */
export const FM_PAPER_PARAM = "paper";

export type SeriesSubject = "Maths" | "Science";

export interface SeriesChapterTest {
  kind: "chapter";
  /** "CT-M01" … "CT-S13". */
  code: string;
  subject: SeriesSubject;
  /** 1-based within the subject, in syllabus order. */
  index: number;
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

export function chapterTestSeriesHref(subject: SeriesSubject, topicKey: string): string {
  return `/chapter-test/10/${subject}/${topicKey}?${CT_SERIES_PARAM}=1`;
}

export function fullMockSeriesHref(subject: SeriesSubject, n: number): string {
  return `/full-mock/10/${subject}?${FM_PAPER_PARAM}=${n}`;
}

/** The numbered Chapter Tests, Maths then Science, each in syllabus order. */
export function seriesChapterTests(): SeriesChapterTest[] {
  const out: SeriesChapterTest[] = [];
  for (const subject of SUBJECTS) {
    let index = 0;
    for (const topicKey of BOARD_CHAPTER_KEYS) {
      if (subjectOfKey(topicKey) !== subject) continue;
      index += 1;
      out.push({
        kind: "chapter",
        code: `CT-${letter(subject)}${String(index).padStart(2, "0")}`,
        subject,
        index,
        topicKey,
        label: desktopTopicBySlug(topicKey)?.name ?? topicKey,
        href: chapterTestSeriesHref(subject, topicKey),
      });
    }
  }
  return out;
}

/** The numbered Full Mocks: MOCKS_PER_SUBJECT per subject. */
export function seriesFullMocks(): SeriesFullMock[] {
  const out: SeriesFullMock[] = [];
  for (const subject of SUBJECTS) {
    for (let n = 1; n <= MOCKS_PER_SUBJECT; n += 1) {
      out.push({ kind: "mock", code: `FM-${letter(subject)}${n}`, subject, n, href: fullMockSeriesHref(subject, n) });
    }
  }
  return out;
}

export interface SeriesTotals {
  chapterTests: number;
  chapterTestsPerSubject: Record<SeriesSubject, number>;
  fullMocks: number;
  mocksPerSubject: number;
  total: number;
}

export function seriesTotals(): SeriesTotals {
  const cts = seriesChapterTests();
  const mocks = seriesFullMocks();
  return {
    chapterTests: cts.length,
    chapterTestsPerSubject: {
      Maths: cts.filter((t) => t.subject === "Maths").length,
      Science: cts.filter((t) => t.subject === "Science").length,
    },
    fullMocks: mocks.length,
    mocksPerSubject: MOCKS_PER_SUBJECT,
    total: cts.length + mocks.length,
  };
}

/** "26 chapter tests + 16 full mocks" — counts from code. */
export function seriesContentsLine(t: SeriesTotals = seriesTotals()): string {
  return `${t.chapterTests} chapter tests + ${t.fullMocks} full mocks`;
}

/* ── URL params ──────────────────────────────────────────────────────────────── */

/** The fixed seed string of a chapter's series paper. */
export function chapterTestSeriesSeed(topicKey: string): string {
  return `${SERIES_TAG}:${topicKey}`;
}

/** True when a Chapter Test URL asks for the series paper (`?series=1`) of a board chapter. */
export function isChapterTestSeriesRequest(param: string | null, topicKey: string): boolean {
  return param === "1" && seriesChapterTests().some((t) => t.topicKey === topicKey);
}

/** `?paper=<n>` → n when it names a series Full Mock (1..MOCKS_PER_SUBJECT), else null (the normal fresh mock). */
export function seriesMockNumber(param: string | null): number | null {
  if (!param || !/^\d{1,2}$/.test(param)) return null;
  const n = Number(param);
  return n >= 1 && n <= MOCKS_PER_SUBJECT ? n : null;
}

export function seriesChapterTestOf(topicKey: string): SeriesChapterTest | null {
  return seriesChapterTests().find((t) => t.topicKey === topicKey) ?? null;
}

/** "Test Series · Chapter Test 3 of 13 (CT-M03)". */
export function chapterTestSeriesLabel(t: SeriesChapterTest, totals: SeriesTotals = seriesTotals()): string {
  return `Test Series · Chapter Test ${t.index} of ${totals.chapterTestsPerSubject[t.subject]} (${t.code})`;
}

/** "Test Series · Full Mock 3 of 8". */
export function fullMockSeriesLabel(n: number): string {
  return `Test Series · Full Mock ${n} of ${MOCKS_PER_SUBJECT}`;
}

/* ── Worksheet ids: how a sitting is recognised ─────────────────────────────── */

/** `ct-<t>-<r>` → `ct-ts1-<topicKey>--<t>-<r>`: the minted id stays unique; the prefix names the series paper. */
export function seriesChapterWorksheetId(baseId: string, topicKey: string): string {
  return baseId.replace(/^ct-/, `ct-${SERIES_TAG}-${topicKey}--`);
}

/** `fm-<t>-<r>` → `fm-ts1-m3--<t>-<r>`. */
export function seriesMockWorksheetId(baseId: string, subject: SeriesSubject, n: number): string {
  return baseId.replace(/^fm-/, `fm-${SERIES_TAG}-${letter(subject).toLowerCase()}${n}--`);
}

export type SeriesKey = { kind: "chapter"; topicKey: string } | { kind: "mock"; subject: SeriesSubject; n: number };

const CT_ID = new RegExp(`^ct-${SERIES_TAG}-([a-z0-9-]+?)--`);
const FM_ID = new RegExp(`^fm-${SERIES_TAG}-([ms])(\\d{1,2})--`);

/** The series paper a worksheet id belongs to, or null (an ordinary, freshly drawn test). */
export function seriesKeyOfWorksheetId(id: string | null | undefined): SeriesKey | null {
  const s = String(id ?? "");
  const ct = CT_ID.exec(s);
  if (ct) return { kind: "chapter", topicKey: ct[1] };
  const fm = FM_ID.exec(s);
  if (fm) return { kind: "mock", subject: fm[1] === "m" ? "Maths" : "Science", n: Number(fm[2]) };
  return null;
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
  /** Graded Full Mocks per subject, in paper order: the score trend. */
  mockTrend: Record<SeriesSubject, Array<{ n: number; code: string; percent: number }>>;
}

function codeOfKey(key: SeriesKey): string | null {
  if (key.kind === "mock") return key.n >= 1 && key.n <= MOCKS_PER_SUBJECT ? `FM-${letter(key.subject)}${key.n}` : null;
  return seriesChapterTestOf(key.topicKey)?.code ?? null;
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
  const half = Math.ceil(MOCKS_PER_SUBJECT / 2);
  const totals = seriesTotals();
  return [
    {
      id: "chapters",
      when: `Now – 30 Nov`,
      title: `Chapter Tests (${totals.chapterTests})`,
      body: "One test per chapter. Take your weakest chapters first.",
      from: null,
      to: `${prev}-11-30`,
    },
    {
      id: "round1",
      when: `1 – 20 Dec ${prev}`,
      title: "Pre-board round 1",
      body: `Full Mocks 1–${half} in Maths and Science.`,
      from: `${prev}-12-01`,
      to: `${prev}-12-20`,
    },
    {
      id: "round2",
      when: `January ${boardYear}`,
      title: "Pre-board round 2",
      body: `Full Mocks ${half + 1}–${MOCKS_PER_SUBJECT} in Maths and Science.`,
      from: `${boardYear}-01-01`,
      to: `${boardYear}-01-31`,
    },
    {
      id: "final",
      when: `1 – 14 Feb ${boardYear}`,
      title: "Final revision",
      body: `Re-attempt your two lowest mocks. Boards expected from ${longDate(boardIso)}.`,
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
