/**
 * The Test Series' paper counts, in a module with NO imports, so the Practice hub's first paint can state the series size without
 * pulling lib/testSeries/testSeries.ts (HUB-TS-1). testSeries.ts re-exports these: ONE definition each.
 *
 * TS-MORE-1 (owner, 19 Nov 2026): the series is 180 tests = 130 chapter tests (5 per chapter x 26) + 50 full-length tests (25 per
 * subject). The ORIGINAL series (papers CT-xx = chapter paper 1, FM-x1..FM-x20) is unchanged and pinned; TS-MORE-1 APPENDS chapter
 * papers 2..5 and full-length papers 21..25. VITE_TS_MORE_DISABLED (the kill switch) takes the client back to the 66-paper series.
 */

/** Kill switch: VITE_TS_MORE_DISABLED (any value but "", "0", "false") hides chapter papers 2..5, full-length 21..25 and the new copy. */
export function tsMoreDisabled(): boolean {
  const v = import.meta.env?.VITE_TS_MORE_DISABLED;
  if (typeof v !== "string") return false;
  const t = v.trim().toLowerCase();
  return t !== "" && t !== "0" && t !== "false";
}

/** The ORIGINAL series: Full-Length Tests per subject and papers per chapter (pinned; never changes). */
export const SERIES_BASE_MOCKS_PER_SUBJECT = 20;
export const SERIES_BASE_PAPERS_PER_CHAPTER = 1;
/** Everything TS-MORE-1 adds up to (what the pins, the generator and the server admit). */
export const SERIES_MAX_MOCKS_PER_SUBJECT = 25;
export const SERIES_MAX_PAPERS_PER_CHAPTER = 5;

/**
 * The Full-Length Tests per subject the client OFFERS: ONE constant. Papers 1..MOCKS_PER_SUBJECT(8) are the PDF Mock Pack's papers
 * (same seeds); 9+ continue the same seed scheme. Measured on the real bank (seriesMocks.guard.test.ts pins it): every paper meets
 * the full blueprint (A 20x1, B 5x2, C 6x3, D 4x5, E 3x4 = 80, CBSE unit marks exact) with NO question repeated across the papers.
 */
export const SERIES_MOCKS_PER_SUBJECT = tsMoreDisabled() ? SERIES_BASE_MOCKS_PER_SUBJECT : SERIES_MAX_MOCKS_PER_SUBJECT;
/** The series papers per chapter the client OFFERS (chapter paper 1 is the original; 2..5 are TS-MORE-1). */
export const SERIES_PAPERS_PER_CHAPTER = tsMoreDisabled() ? SERIES_BASE_PAPERS_PER_CHAPTER : SERIES_MAX_PAPERS_PER_CHAPTER;
