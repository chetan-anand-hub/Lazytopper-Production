// src/components/testAnalysis/seriesCalendar.ts
//
// TS-ANALYSIS-1 — the two clock/board-date reads the week plan needs, kept out of the pure model:
// the Pre-Boards Test Series calendar (TEST-SERIES-1) from the board date the app already predicts,
// and today's IST date (the calendar's own day key, as on /test-series).

import { predictCbseExamDate } from "../../services/cbseExamDate";
import { seriesSchedule, type SeriesScheduleRow } from "../../lib/testSeries/testSeries";

export function seriesCalendarRows(): SeriesScheduleRow[] | null {
  return seriesSchedule(predictCbseExamDate("10"));
}

export function currentIstDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
