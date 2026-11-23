/**
 * TS-BOARDSCORE-1 - the full-length test scorecard's board view: (a) the honest full-paper score line, (b) the trend across the
 * student's own full tests, (c) a board ESTIMATE (theory, out of 80).
 *
 * OWNER RULING (23 Nov 2026, 19:04 IST) - supersedes [FU-BOARD-READINESS-MODEL]'s "no projection, ever": build (a) the honest
 * full-paper score line, (b) a trend across the student's full tests, and (c) a board-readiness ESTIMATE.
 *
 * Pure and deterministic. Every number comes from the student's OWN graded papers - nothing is invented, smoothed from other
 * students or randomised. A paper counts only when it is a FULLY graded (nothing pending) 80-mark CBSE-pattern paper of the SAME
 * subject; a partial paper is never extrapolated to 80.
 *
 * Estimate (c), shown only with >= 2 such papers:
 *   - the last up to 5 scores, oldest -> newest, weights 1, 2, 3, 4, 5 (the most recent counts most);
 *   - centre m = weighted mean;
 *   - spread = max(4, round(sample standard deviation)) - with only 2 papers, spread = max(6, |s2 - s1|);
 *   - range = [round(m - spread), round(m + spread)], clipped to 0..80.
 *
 * Trend (b): the last up to 5 scores; the change line is newest minus the OLDEST chip shown ("since your first full test" with
 * <= 5 tests, "over your last 5 full tests" with more), so it always describes what is on screen.
 */

/** The theory paper's total in the CBSE pattern (A 20x1, B 5x2, C 6x3, D 4x5, E 3x4). */
export const BOARD_THEORY_TOTAL = 80;
/** How many recent full tests the trend and the estimate look at. */
export const BOARD_WINDOW = 5;

/** The fields of a saved session record this module reads (a SessionRecord satisfies it). */
export interface FullTestRecordLike {
  id: string;
  surface: string;
  subject: string;
  status: string;
  marksAwarded: number;
  marksTotal: number;
  gradedAt: number;
}

/** One fully graded full-length paper's score, as the board view uses it. */
export interface FullTestScore {
  id: string;
  score: number;
  gradedAt: number;
}

/** A saved record counts toward the trend / estimate only as a fully graded 80-mark full-length paper. */
export function isFullyGradedFullPaper(r: FullTestRecordLike): boolean {
  return (
    r.surface === "full-mock" &&
    r.status === "graded" && // "graded" = nothing pending (sessionRecords: pendingCount > 0 -> "partial")
    r.marksTotal === BOARD_THEORY_TOTAL &&
    Number.isFinite(r.marksAwarded) &&
    r.marksAwarded >= 0 &&
    r.marksAwarded <= BOARD_THEORY_TOTAL &&
    Number.isFinite(r.gradedAt)
  );
}

/**
 * The student's fully graded full-length scores for ONE subject, oldest -> newest.
 * - `current`: the paper on screen (a live result whose record may not be saved yet). It is put in as the NEWEST and any saved
 *   record with the same id is dropped, so it is never counted twice.
 * - `asOf`: a re-opened result - only papers graded at or before it count, so the card reads as it did on the day.
 */
export function fullTestScores(
  records: ReadonlyArray<FullTestRecordLike>,
  subject: string,
  opts: { current?: FullTestScore | null; asOf?: { id: string; gradedAt: number } | null } = {},
): FullTestScore[] {
  const { current, asOf } = opts;
  const out: FullTestScore[] = [];
  for (const r of records) {
    if (r.subject !== subject || !isFullyGradedFullPaper(r)) continue;
    if (current && r.id === current.id) continue;
    if (asOf && r.id !== asOf.id && r.gradedAt > asOf.gradedAt) continue;
    out.push({ id: r.id, score: r.marksAwarded, gradedAt: r.gradedAt });
  }
  out.sort((a, b) => a.gradedAt - b.gradedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (asOf) {
    // The re-opened paper is the newest point (a later re-grade of an older paper must not reorder history after it).
    const i = out.findIndex((s) => s.id === asOf.id);
    if (i < 0) return []; // the re-opened paper itself does not qualify: nothing to show
    const [self] = out.splice(i, 1);
    out.push(self);
  }
  if (current) out.push(current);
  return out;
}

export interface BoardEstimate {
  low: number;
  high: number;
  /** How many full tests the estimate used (2..5). */
  n: number;
  /** The weighted centre, unrounded (for tests and the copy's maths, never shown). */
  centre: number;
  spread: number;
}

/** The board estimate from scores oldest -> newest; null with fewer than 2. Only the last BOARD_WINDOW count. */
export function boardEstimate(scores: ReadonlyArray<number>): BoardEstimate | null {
  const s = scores.filter((x) => Number.isFinite(x)).slice(-BOARD_WINDOW);
  const n = s.length;
  if (n < 2) return null;
  let wSum = 0;
  let wxSum = 0;
  s.forEach((x, i) => {
    const w = i + 1; // oldest 1 ... newest n
    wSum += w;
    wxSum += w * x;
  });
  const centre = wxSum / wSum;
  let spread: number;
  if (n === 2) {
    spread = Math.max(6, Math.abs(s[1] - s[0]));
  } else {
    const mean = s.reduce((a, b) => a + b, 0) / n;
    const variance = s.reduce((a, x) => a + (x - mean) * (x - mean), 0) / (n - 1);
    spread = Math.max(4, Math.round(Math.sqrt(variance)));
  }
  const clip = (x: number) => Math.min(BOARD_THEORY_TOTAL, Math.max(0, x));
  return { low: clip(Math.round(centre - spread)), high: clip(Math.round(centre + spread)), n, centre, spread };
}

/** "58" / "57.5" - the scorecard hero's number format (no float noise). */
function fmt(x: number): string {
  const r = Math.round(x * 100) / 100;
  return String(Object.is(r, -0) ? 0 : r);
}

/** What the scorecard renders. Every string is final copy; absent parts render nothing. */
export interface BoardScoreView {
  /** (a) "You scored X / 80 on a full CBSE-pattern paper." - or, with marks not marked yet, "So far: X / 80 · N marks not marked yet". */
  scoreLine: string;
  /** (b) the last up to 5 scores, oldest -> newest (the last one is this paper); null with fewer than 2. */
  trend: { points: number[]; changeLine: string } | null;
  /** (c) the estimate; null with fewer than 2 papers. */
  estimate: { line: string; smallPrint: string } | null;
  /** (c) with exactly 1 paper: "Take one more full test to see your board estimate." */
  estimateHint: string | null;
}

export const BOARD_ESTIMATE_HINT = "Take one more full test to see your board estimate.";

export function boardEstimateSmallPrint(n: number): string {
  return (
    `From your last ${n} full tests on CBSE-pattern papers, recent tests weighted more. ` +
    "An estimate, not a promise — it moves as you take more tests. The 20 internal-assessment marks are not included."
  );
}

/**
 * The board view for the paper on screen, or null when it is not an 80-mark full-length paper (then the card shows nothing new).
 * `paper.total` is the paper's FULL marks; `paper.notMarkedMarks` the marks that could not be marked yet (owner ruling 23 Nov 2026,
 * 19:59 IST). With any not marked, only "So far: X / 80 · N marks not marked yet" shows - never the trend or the estimate.
 * `scores` are this subject's fully graded full tests oldest -> newest, ENDING with this paper (fullTestScores).
 * `estimateDisabled` (VITE_BOARD_ESTIMATE_DISABLED) hides the trend and the estimate; the score line stays.
 */
export function buildBoardScoreView(input: {
  paper: { awarded: number; total: number; pendingCount: number; notMarkedMarks?: number };
  scores: ReadonlyArray<FullTestScore>;
  estimateDisabled?: boolean;
}): BoardScoreView | null {
  const { paper, scores, estimateDisabled = false } = input;
  if (paper.total !== BOARD_THEORY_TOTAL || !Number.isFinite(paper.awarded)) return null;
  const notMarked = Math.max(0, Number(paper.notMarkedMarks) || 0);
  if (notMarked > 0) {
    const m = `${fmt(notMarked)} mark${notMarked === 1 ? "" : "s"}`;
    return { scoreLine: `So far: ${fmt(paper.awarded)} / ${BOARD_THEORY_TOTAL} \u00b7 ${m} not marked yet`, trend: null, estimate: null, estimateHint: null };
  }
  if (paper.pendingCount > 0) return null; // pending with no marks unaccounted for: an inconsistent grade, say nothing
  const scoreLine = `You scored ${fmt(paper.awarded)} / ${BOARD_THEORY_TOTAL} on a full CBSE-pattern paper.`;
  if (estimateDisabled) return { scoreLine, trend: null, estimate: null, estimateHint: null };

  const all = scores.map((s) => s.score);
  const n = all.length;
  let trend: BoardScoreView["trend"] = null;
  if (n >= 2) {
    // The change describes what is ON SCREEN: newest chip minus the OLDEST chip shown. With <= 5 tests the oldest chip IS the
    // first full test; with more, it is the first of the last 5.
    const points = all.slice(-BOARD_WINDOW);
    const change = Math.round((points[points.length - 1] - points[0]) * 100) / 100;
    const windowed = n > BOARD_WINDOW;
    const since = windowed ? `over your last ${BOARD_WINDOW} full tests` : "since your first full test";
    const changeLine =
      change > 0
        ? `Up ${fmt(change)} ${since}`
        : change < 0
          ? `Down ${fmt(-change)} ${since}`
          : windowed
            ? `Level over your last ${BOARD_WINDOW} full tests`
            : "Level with your first full test";
    trend = { points, changeLine };
  }
  const est = boardEstimate(all);
  return {
    scoreLine,
    trend,
    estimate: est
      ? {
          line: `Board estimate (theory): ${est.low}–${est.high} / ${BOARD_THEORY_TOTAL}`,
          smallPrint: boardEstimateSmallPrint(est.n),
        }
      : null,
    estimateHint: n === 1 ? BOARD_ESTIMATE_HINT : null,
  };
}
