import { seriesPaperKeyOfWorksheetId } from "./testSeries";
/**
 * TEST-SERIES-1 — who may have Chapter Test / Full Mock WRITTEN answers (Sections B–E) checked, and download / print the papers
 * (owner rulings 18 Nov 2026, 19:31 + 19:38 IST): a Board Pass holder (PAID premium) OR an owner of the `test_series` pack.
 * Trial and free accounts get Section A (MCQ) marking only. CLIENT-SIDE presentation only: the server grader and entitlements
 * are not touched here (the server-side check is separate work).
 */
export interface SeriesEntitlements {
  /** `isPaidPremium(status)`: a verified Board Pass or an admin grant. A trial is NOT paid. */
  paidPremium: boolean;
  /**
   * ★ TS-PACK-1 HOOK: true when /api/packs/mine lists a `test_series` pack. Nothing sets it yet (the SKU does not exist on this
   * branch); TS-PACK-1 wires it in `useSeriesPaperAccess` (components/testSeries/WrittenCheckGate.tsx).
   */
  ownsTestSeries?: boolean;
}

export function canCheckSeriesPapers(entitlements: SeriesEntitlements): boolean {
  return entitlements.paidPremium === true || entitlements.ownsTestSeries === true;
}

/**
 * PACK-DOWNLOAD-RESTORE: downloading / printing a paper is ALSO open to a student who owns a pack that COVERS it (a Chapter Pack of the
 * chapter, a Subject Pack, a Mock Pack for a mock, or the Bundle - `ownsChapter` / `ownsMocks`), exactly as before 18 Nov 2026.
 * Written-answer CHECKING is not widened by a PDF pack (`canCheckSeriesPapers`).
 */
export function canDownloadPaper(entitlements: SeriesEntitlements & { ownsCoveringPack?: boolean }): boolean {
  return canCheckSeriesPapers(entitlements) || entitlements.ownsCoveringPack === true;
}

/**
 * Owner ruling 18 Nov 2026, 19:44 IST — free and trial accounts may TAKE ONE test in total (a chapter test OR a full mock; its
 * MCQs are marked). Counted from the account's own session records (chapter-test + full-mock, any status: a submitted sitting
 * and a downloaded paper both count). CLIENT-SIDE: the records are the student's own Firestore/local history, so a determined
 * user could get round it (clearing a local-only history, or an unsubmitted sitting that never wrote a record); the server is
 * not consulted here.
 */
export const FREE_TESTS_ALLOWED = 1;

/**
 * MYPACKS-TS-1 (P1-5 / P1-7): the new rules start here (18 Nov 2026, 22:00 IST). A test sat BEFORE it never counts against the one free
 * test (so existing students still get theirs), and a paper started before it keeps the old rules (grandfathered, see below).
 */
export const SERIES_RULES_START_MS = Date.parse("2026-11-18T22:00:00+05:30");

/** Was this paper / sitting created before the new rules started? Unknown time -> NOT grandfathered (the new rules apply). */
export function isBeforeSeriesRules(createdMs: number | null | undefined): boolean {
  return typeof createdMs === "number" && Number.isFinite(createdMs) && createdMs > 0 && createdMs < SERIES_RULES_START_MS;
}

/**
 * TS-UX-SCORE-1 - should the partial scorecard drop its upload prompt? The SAME allow-logic the page's paywall uses
 * (`canCheck || grandfathered`), and only once the access read has settled (pending / failed keep today's prompt).
 */
export function scorecardUploadNotAllowed(a: { canCheck: boolean; createdMs: number | null | undefined; checking: boolean; failed: boolean }): boolean {
  return !(a.canCheck || isBeforeSeriesRules(a.createdMs)) && !a.checking && !a.failed;
}

/**
 * FREE-TEST-SERIES-ONLY (owner ruling 26 Nov 2026, 23:43 IST): a Basic account's ONE free test must be a TEST SERIES paper, so only a
 * sitting of a series paper (chapter test / full mock / focus set with a series key) after the rules started counts against it. An
 * ordinary (non-series) chapter test or full mock no longer uses it up. The server already marks the free series test on its own
 * (testSeriesChecks.freeTestGrade); this only decides what the client SHOWS and lets START. PURE.
 */
function isCountedFreeTestRecord(r: { surface: string; gradedAt?: number; worksheetId?: string }): boolean {
  if (r.surface !== "chapter-test" && r.surface !== "full-mock") return false;
  if (isBeforeSeriesRules(typeof r.gradedAt === "number" && Number.isFinite(r.gradedAt) ? r.gradedAt : null)) return false;
  return seriesPaperKeyOfWorksheetId(r.worksheetId) !== null;
}

export function countTestsTaken(records: ReadonlyArray<{ surface: string; gradedAt?: number; worksheetId?: string }>): number {
  return records.filter(isCountedFreeTestRecord).length;
}

/**
 * "This is your 1 free test": a signed-in free / trial account that has not used its one test yet.
 * TS-FREE-CHECK-1 (owner ruling 23 Nov 2026, 19:59 IST): the free test now includes written-answer marking (the photo of the answer
 * sheet, checked step by step, 2 checks on that paper). The server pins the free paper at the first written check
 * (server/services/testSeriesChecks.cjs) and refuses every other paper; this copy only describes it.
 */
export const FREE_TEST_NOTE = "This is your 1 free test — written answers marked step by step, like a CBSE examiner.";
/** The pre-TS-FREE-CHECK-1 note: still shown with the kill switch on, and on a paper the free written check cannot reach. */
export const FREE_TEST_NOTE_MCQ_ONLY = "This is your 1 free test. Its MCQs (Section A) are marked free.";

/**
 * TS-FREE-CHECK-1 client kill switch: VITE_TS_FREE_WRITTEN_CHECK_DISABLED=1 restores today's MCQ-only free test on the page (copy and
 * upload). The server's twin is TS_FREE_WRITTEN_CHECK_DISABLED (it also stops sending `freeTest`, which turns the page off by itself).
 */
export function freeWrittenCheckDisabled(): boolean {
  return import.meta.env?.VITE_TS_FREE_WRITTEN_CHECK_DISABLED === "1";
}

/** The free-test note for a paper: the written-marking line only when this paper's written answers will be checked. PURE. */
export function freeTestNote(written: boolean): string {
  return written ? FREE_TEST_NOTE : FREE_TEST_NOTE_MCQ_ONLY;
}

/**
 * The worksheetId of the account's FIRST counted test (the one FREE_TESTS_ALLOWED spends): the earliest SERIES-paper chapter-test /
 * full-mock record after the rules started, by `gradedAt`. null when none is counted yet. PURE.
 */
export function firstCountedTestWorksheetId(records: ReadonlyArray<{ surface: string; gradedAt?: number; worksheetId?: string }>): string | null {
  let best: { at: number; id: string } | null = null;
  for (const r of records) {
    if (!isCountedFreeTestRecord(r)) continue;
    const at = typeof r.gradedAt === "number" && Number.isFinite(r.gradedAt) ? r.gradedAt : null;
    const key = at ?? Number.POSITIVE_INFINITY;
    if (!best || key < best.at) best = { at: key, id: typeof r.worksheetId === "string" ? r.worksheetId : "" };
  }
  return best ? best.id : null;
}

/**
 * TS-FREE-CHECK-1 - may this (signed-in, not entitled) account upload written answers on this paper as its free test? PURE.
 *   - never with the kill switch, never on a non-series paper (`paperKey` null), never without the server's `freeTest` state;
 *   - the SERVER's pin wins: once a free paper is pinned, only that paper;
 *   - no pin yet: the paper the one-test rule picks - no test counted yet (this is it), or the first counted test is this paper.
 * The server decides every grade (it pins at the first written check and refuses any other paper); this only decides what is SHOWN.
 */
export function freeTestWrittenAllowed(args: {
  disabled: boolean;
  paperKey: string | null;
  server: { paperKey: string | null } | null;
  testsTaken: number;
  /** The paper key of the first counted test (null when it was not a series paper, or nothing is counted). */
  firstTestPaperKey: string | null;
}): boolean {
  if (args.disabled || !args.paperKey || !args.server) return false;
  if (args.server.paperKey !== null) return args.server.paperKey === args.paperKey;
  if (args.testsTaken < FREE_TESTS_ALLOWED) return true;
  return args.firstTestPaperKey === args.paperKey;
}

export type SeriesStartDecision = "start" | "sign-in" | "upgrade";

/** May this account START a new Chapter Test / Full Mock? (A resume of a paper already started is never asked.) */
export function seriesStartDecision(args: { entitled: boolean; signedIn: boolean; testsTaken: number }): SeriesStartDecision {
  if (args.entitled) return "start";
  if (!args.signedIn) return "sign-in";
  return args.testsTaken < FREE_TESTS_ALLOWED ? "start" : "upgrade";
}
