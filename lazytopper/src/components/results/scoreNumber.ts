/**
 * GUIDE-SCORE-1 — ONE way to print a score number, shared by the scorecard hero
 * (ResultsScorecard ScoreHero) and every line Byte and Ziggy say about it, so the two can never
 * disagree. Rounds to 2 decimals to drop float noise (7.000000001 → "7", 7.499999 → "7.5"),
 * never pads ("7", not "7.00"). A non-finite value prints as-is (never invented).
 */
export function formatScoreNumber(x: number): string {
  if (!Number.isFinite(x)) return String(x);
  const r = Math.round(x * 100) / 100;
  return String(Object.is(r, -0) ? 0 : r);
}
