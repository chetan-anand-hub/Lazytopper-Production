/**
 * TS-MORE-1 (owner, 19 Nov 2026) - the Test Series' marketing lines that come from the price and the paper count:
 *   "₹6 per test"  = round(base price / total tests): 999 / 180 = 5.55 -> 6, on every date (PRICE-HOLD-1: the 1 Dec 1,499 / "8 per test" switch was cancelled).
 * The BASE price (what packBaseInr gives), so the line carries no "+ GST". The total is `seriesTotals().total` (180), never typed.
 * Copy only: the server prices every order. Read the line AFTER MOUNT inside a clock slot (components/packs/TestSeriesPerTest.tsx),
 * so a prerendered page never freezes the build machine's clock into a figure.
 */
import { packBaseInr } from "../../services/packs";
import { seriesTotals, tsMoreDisabled } from "./testSeries";

/** Whole rupees per test at `now`. */
export function testSeriesPerTestInr(now: Date | number = Date.now(), total: number = seriesTotals().total): number {
  return Math.round(packBaseInr("test_series", now) / Math.max(1, total));
}

/** "₹6 per test" - null when the TS-MORE-1 kill switch is set (the new copy is hidden with the new papers). */
export function testSeriesPerTestLine(now: Date | number = Date.now()): string | null {
  return tsMoreDisabled() ? null : `₹${testSeriesPerTestInr(now)} per test`;
}

/** The owner-approved line, verbatim. Null under the kill switch. */
export const TEST_SERIES_EXAMINER_LINE = "Your written answers marked step by step like a CBSE examiner, by CBSE's step-marking rules.";
export function testSeriesExaminerLine(): string | null {
  return tsMoreDisabled() ? null : TEST_SERIES_EXAMINER_LINE;
}
