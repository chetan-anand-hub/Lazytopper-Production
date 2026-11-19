import { TsClockSlot } from "./TestSeriesFoundingClause";
import { tsMoreDisabled } from "../../lib/testSeries/seriesCounts";
import { testSeriesExaminerLine, testSeriesPerTestLine } from "../../lib/testSeries/seriesPerTest";
import "./testSeriesPerTest.css";

/**
 * TS-MORE-1 - the highlighted "₹6 per test" badge (computed from packBaseInr("test_series", now) and seriesTotals().total; ₹8 from
 * 1 Dec). Inside a clock slot: the badge text is written only after mount and stripped from the prerender capture, so no build clock
 * is frozen into a static file; the reserved box (`lt-tspt`) keeps the layout still. Renders nothing under VITE_TS_MORE_DISABLED.
 */
export function TestSeriesPerTest({ testId = "ts-per-test", className = "" }: { testId?: string; className?: string }) {
  if (tsMoreDisabled()) return null;
  return (
    <p className={`lt-tspt ${className}`.trim()}>
      <TsClockSlot variant="tag" testId={testId}>
        <span className="lt-tspt__badge">{testSeriesPerTestLine()}</span>
      </TsClockSlot>
    </p>
  );
}

/** TS-MORE-1 - the examiner line, verbatim from the owner. Null under VITE_TS_MORE_DISABLED. */
export function TestSeriesExaminerLine({ testId = "ts-examiner-line", className = "" }: { testId?: string; className?: string }) {
  const line = testSeriesExaminerLine();
  if (!line) return null;
  return (
    <p className={`lt-tspt__examiner ${className}`.trim()} data-testid={testId}>
      {line}
    </p>
  );
}
