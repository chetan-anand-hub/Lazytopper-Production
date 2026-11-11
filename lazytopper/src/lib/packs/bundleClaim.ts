/**
 * PACKS-TIDY-2 (owner, 11 Nov 2026) - the Bundle's "<N>+ questions" number tile on /packs. A FLOOR, rounded DOWN, read by the page
 * and by bundleClaim.test.ts, which counts the REAL Bundle selection (every chapter's pack question sheets, `countChapterQuestions`
 * over all 26 pack chapters - the same count the Bundle pop-up shows), so CI goes red if the bank ever drops below the claim.
 * Measured 11 Nov 2026: 10,686 questions. PURE and tiny: no bank import here (the page must stay light).
 */
export const BUNDLE_QUESTIONS_MIN = 10000;
export const BUNDLE_QUESTIONS_CLAIM = `${BUNDLE_QUESTIONS_MIN.toLocaleString("en-IN")}+`;
