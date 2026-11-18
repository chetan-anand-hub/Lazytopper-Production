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
 * Owner ruling 18 Nov 2026, 19:44 IST — free and trial accounts may TAKE ONE test in total (a chapter test OR a full mock; its
 * MCQs are marked). Counted from the account's own session records (chapter-test + full-mock, any status: a submitted sitting
 * and a downloaded paper both count). CLIENT-SIDE: the records are the student's own Firestore/local history, so a determined
 * user could get round it (clearing a local-only history, or an unsubmitted sitting that never wrote a record); the server is
 * not consulted here.
 */
export const FREE_TESTS_ALLOWED = 1;

export function countTestsTaken(records: ReadonlyArray<{ surface: string }>): number {
  return records.filter((r) => r.surface === "chapter-test" || r.surface === "full-mock").length;
}

export type SeriesStartDecision = "start" | "sign-in" | "upgrade";

/** May this account START a new Chapter Test / Full Mock? (A resume of a paper already started is never asked.) */
export function seriesStartDecision(args: { entitled: boolean; signedIn: boolean; testsTaken: number }): SeriesStartDecision {
  if (args.entitled) return "start";
  if (!args.signedIn) return "sign-in";
  return args.testsTaken < FREE_TESTS_ALLOWED ? "start" : "upgrade";
}
