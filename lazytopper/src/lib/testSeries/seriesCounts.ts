/**
 * The Test Series' Full-Length Tests per subject, in a module with NO imports, so the Practice hub's first paint can state the series
 * size without pulling lib/testSeries/testSeries.ts (HUB-TS-1). testSeries.ts re-exports it: ONE constant, one definition.
 */
/**
 * Owner, 18 Nov 2026 19:47 IST ("we can easily create 40 full-length tests"): the series' Full-Length Tests per subject. ONE constant.
 * Papers 1..MOCKS_PER_SUBJECT are the PDF Mock Pack's papers 1..8 (same seeds); 9+ continue the same seed scheme.
 * Measured on the real bank (seriesMocks.guard.test.ts pins it): all 20 per subject meet the full blueprint (A 20x1, B 5x2, C 6x3,
 * D 4x5, E 3x4 = 80, CBSE unit marks exact) with NO question repeated across the 20 papers in any section.
 */
export const SERIES_MOCKS_PER_SUBJECT = 20;
