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

export function countTestsTaken(records: ReadonlyArray<{ surface: string; gradedAt?: number }>): number {
  return records.filter(
    (r) => (r.surface === "chapter-test" || r.surface === "full-mock") && !isBeforeSeriesRules(typeof r.gradedAt === "number" ? r.gradedAt : null),
  ).length;
}

/** "This is your 1 free test": a signed-in free / trial account that has not used its one test yet. */
export const FREE_TEST_NOTE = "This is your 1 free test. Its MCQs (Section A) are marked free.";

export type SeriesStartDecision = "start" | "sign-in" | "upgrade";

/** May this account START a new Chapter Test / Full Mock? (A resume of a paper already started is never asked.) */
export function seriesStartDecision(args: { entitled: boolean; signedIn: boolean; testsTaken: number }): SeriesStartDecision {
  if (args.entitled) return "start";
  if (!args.signedIn) return "sign-in";
  return args.testsTaken < FREE_TESTS_ALLOWED ? "start" : "upgrade";
}
