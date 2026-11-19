/**
 * HUB-TS-1 - the kill switch, in its own tiny module so the Practice hub reads it WITHOUT pulling the chooser.
 * VITE_HUB_TS_DISABLED (any value but "", "0", "false") -> today's hub, unchanged: the "Chapter Tests" card + picker and the
 * step-2 "Full Test" card.
 */
import { BOARD_CHAPTER_KEYS, chapterUnit } from "../../config/syllabusUnits2026-27";
import { SERIES_MOCKS_PER_SUBJECT } from "../../lib/testSeries/seriesCounts";

export function hubTsDisabled(): boolean {
  const v = import.meta.env?.VITE_HUB_TS_DISABLED;
  if (typeof v !== "string") return false;
  const t = v.trim().toLowerCase();
  return t !== "" && t !== "0" && t !== "false";
}

/** `?ts=full` opens the Test Series chooser on Full-length tests; `?ts=1` / `?ts=chapter` (and the old `?ct=1`) on Chapter tests. */
export const TS_HUB_PARAM = "ts" as const;
export type SeriesChooserTab = "chapter" | "full";

export function chooserTabFromParams(params: URLSearchParams): SeriesChooserTab {
  return (params.get(TS_HUB_PARAM) ?? "").toLowerCase() === "full" ? "full" : "chapter";
}

/** Does the URL ask for the chooser on arrival? (`?ct=1` as before, or `?ts=1|chapter|full`.) The caller still lets `?cbq=1` win. */
export function chooserRequested(params: URLSearchParams): boolean {
  const ts = (params.get(TS_HUB_PARAM) ?? "").toLowerCase();
  return params.get("ct") === "1" || ts === "1" || ts === "chapter" || ts === "full";
}

/**
 * The Test Series card's two lines, with NOTHING heavy behind them (the hub's first paint must not pull testSeries.ts): the counts are
 * the syllabus's board chapters and SERIES_MOCKS_PER_SUBJECT x 2 subjects. A test pins them equal to `seriesTotals()`.
 */
export const HUB_CARD_SHORT = "Chapter tests and full-length papers";
export function hubCardLine(): string {
  const chapterTests = BOARD_CHAPTER_KEYS.filter((k) => chapterUnit(k) !== null && chapterUnit(k) !== undefined).length;
  const fullMocks = SERIES_MOCKS_PER_SUBJECT * 2;
  return `${chapterTests} chapter tests and ${fullMocks} full-length board papers, numbered, with a pre-board calendar. Pick a subject, then a test.`;
}
