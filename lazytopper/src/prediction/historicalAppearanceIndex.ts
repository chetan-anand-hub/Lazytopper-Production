// src/prediction/historicalAppearanceIndex.ts
//
// THE shared appearance primitive: appearances-per-subtopic-per-year over the
// canonical CBSE historical corpus.
//
// Extracted out of `getFilteredItems` / `computeHistoricalFrequencySignal` in
// `cbse5SignalScoring.ts` so that BOTH exam-trend signals read one appearance
// index instead of each re-deriving its own:
//
//   1. `computeHistoricalFrequencySignal` — "what will be asked" (serves the
//      live Highly Probable Questions surface).
//   2. `expectedMarks`                    — "what it is worth when asked".
//
// ─────────────────────────────────────────────────────────────────────────────
// ⚠ WHY THE DEFAULT STRATEGY IS STILL THE LEGACY FUZZY MATCHER
//
// `LEGACY_FUZZY_STRATEGY` reproduces the pre-extraction matching semantics
// EXACTLY, and it is the default. That is deliberate and load-bearing:
// `computeHistoricalFrequencySignal` ranks Highly Probable Questions for live
// students, and its output is pinned byte-for-byte by
// `cbse5SignalScoring.hpqPin.test.ts`.
//
// Routing the corpus labels through `resolveCanonicalSlug` instead was measured
// against the real 140-question live HPQ set and moves 52 of them (37%) — see
// `historicalAppearanceIndex.canonical.test.ts`, which asserts that divergence
// rather than describing it. The cause is that `resolveCanonicalSlug` is a
// CHAPTER-slug authority: it resolves topic keys via
// `desktopTopicForWeakAreaKey` and, for any label outside that registry — every
// SUBTOPIC — degrades to `normalizeTopicSlug`, a plain slugifier. Slug EQUALITY
// is far stricter than the fuzzy substring / 70%-word-overlap matcher it would
// replace, so a corpus subtopic like "Nature of Roots (Discriminant)" stops
// matching the HPQ subtopic "Discriminant".
//
// Switching the LIVE signal to canonical matching is therefore an OWNER
// DECISION about prediction quality, not a refactor. It is deliberately not
// taken here. See [FU-TRENDS-CANONICAL-SUBTOPIC-AUTHORITY].
// ─────────────────────────────────────────────────────────────────────────────
//
// ⚠ NOT to be confused with `getTopicAppearanceByYear` / `getSubtopicAppearanceByYear`
// in `historicalDataset.ts`. Those are a THIRD, older appearance helper pair with
// DIFFERENT semantics — they do not filter to `sourceType === "official_board"`
// and they normalise with a different `fuzzyNorm` (which expands "&" to " and ").
// Both have zero callers in the product. See [FU-TRENDS-DEAD-APPEARANCE-HELPERS].

import { getCanonicalHistoricalDataset, type HistoricalQuestionItem } from "./historicalDataset";
import { resolveCanonicalSlug } from "../data/syllabus/canonicalTopicSlug";

/** Compares a corpus label against a caller-supplied query label. */
export type LabelMatcher = (corpusLabel: string, queryLabel: string) => boolean;

export interface AppearanceMatchStrategy {
  /** Stable id, so a caller (and a test) can say which strategy produced a number. */
  readonly id: string;
  readonly matchTopic: LabelMatcher;
  readonly matchSubtopic: LabelMatcher;
}

/**
 * Label normaliser shared by the fuzzy matcher and the NEP / difficulty signals.
 * Moved here verbatim from `cbse5SignalScoring.ts` so there is ONE definition.
 */
export function normalizeLabel(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * The historical matcher, moved verbatim from `cbse5SignalScoring.ts`.
 * Exact match, or either string containing the other, or >=70% word overlap
 * when both sides carry at least two words.
 */
export function legacyFuzzyMatch(a: string, b: string): boolean {
  const na = normalizeLabel(a);
  const nb = normalizeLabel(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wordsA = new Set(na.split(" "));
  const wordsB = new Set(nb.split(" "));
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return Math.min(wordsA.size, wordsB.size) >= 2 && overlap / Math.min(wordsA.size, wordsB.size) >= 0.7;
}

/** True when two labels resolve to the same canonical `topics.ts` chapter slug. */
export function canonicalLabelMatch(a: string, b: string): boolean {
  const ra = resolveCanonicalSlug(a);
  return !!ra && ra === resolveCanonicalSlug(b);
}

/** Pre-extraction semantics, byte-for-byte. The default, because HPQ is pinned to it. */
export const LEGACY_FUZZY_STRATEGY: AppearanceMatchStrategy = {
  id: "legacy-fuzzy",
  matchTopic: legacyFuzzyMatch,
  matchSubtopic: legacyFuzzyMatch,
};

/**
 * Canonical CHAPTER resolution on the topic dimension, fuzzy on the subtopic.
 * `resolveCanonicalSlug` has no subtopic vocabulary, so applying it below
 * chapter level does not tighten matching — it silences it (47 of 140 live HPQ
 * questions lose their subtopic match entirely). Topic-level canonicalisation is
 * what the authority is actually for.
 */
export const CANONICAL_TOPIC_STRATEGY: AppearanceMatchStrategy = {
  id: "canonical-topic",
  matchTopic: canonicalLabelMatch,
  matchSubtopic: legacyFuzzyMatch,
};

/**
 * Canonical resolution on BOTH dimensions. Provided so the divergence it causes
 * can be asserted by a test rather than argued about. NOT used in production.
 */
export const CANONICAL_STRICT_STRATEGY: AppearanceMatchStrategy = {
  id: "canonical-strict",
  matchTopic: canonicalLabelMatch,
  matchSubtopic: canonicalLabelMatch,
};

export interface AppearanceIndexOptions {
  /** Exclude corpus items from this year onward (backtesting). */
  cutoffYear?: number;
  /** Defaults to `LEGACY_FUZZY_STRATEGY`. */
  strategy?: AppearanceMatchStrategy;
  /** Inject a corpus instead of the canonical dataset. Tests only. */
  corpus?: readonly HistoricalQuestionItem[];
}

export interface SubtopicAppearance {
  strategyId: string;
  /** Distinct official-board years present for this subject, in corpus order. */
  boardYears: number[];
  /** `Math.max(boardYears.length, 1)` — the Laplace denominator base. */
  totalBoardYears: number;
  /** Official-board years in which the TOPIC appeared. */
  yearsWithTopic: number[];
  /** Official-board years in which the TOPIC and SUBTOPIC both appeared. */
  yearsWithSubtopic: number[];
  /** Marks of every official-board item matching topic AND subtopic. */
  subtopicMarks: number[];
  /** Marks of every official-board item matching the topic. */
  topicMarks: number[];
  /** Marks of every official-board item in the subject. */
  subjectMarks: number[];
}

/** Corpus items for a subject, honouring the backtest cutoff. */
export function getAppearanceCorpus(
  subject: "Maths" | "Science",
  options: AppearanceIndexOptions = {}
): HistoricalQuestionItem[] {
  const all = options.corpus ?? getCanonicalHistoricalDataset().items;
  const withinCutoff =
    options.cutoffYear == null ? all : all.filter((i) => i.sourceYear < options.cutoffYear!);
  return withinCutoff.filter((i) => i.subject === subject);
}

/**
 * THE PRIMITIVE. One pass over the subject's official-board corpus, returning
 * both the per-year appearance sets and the marks observed alongside them.
 */
export function getSubtopicAppearance(
  subject: "Maths" | "Science",
  topic: string,
  subtopic: string,
  options: AppearanceIndexOptions = {}
): SubtopicAppearance {
  const strategy = options.strategy ?? LEGACY_FUZZY_STRATEGY;
  const items = getAppearanceCorpus(subject, options);

  const boardYearSet = new Set<number>();
  const yearsWithTopic = new Set<number>();
  const yearsWithSubtopic = new Set<number>();
  const subtopicMarks: number[] = [];
  const topicMarks: number[] = [];
  const subjectMarks: number[] = [];

  for (const item of items) {
    if (item.sourceType !== "official_board") continue;
    boardYearSet.add(item.sourceYear);
    subjectMarks.push(item.marks);
    if (!strategy.matchTopic(item.topic, topic)) continue;
    yearsWithTopic.add(item.sourceYear);
    topicMarks.push(item.marks);
    if (!strategy.matchSubtopic(item.subtopic, subtopic)) continue;
    yearsWithSubtopic.add(item.sourceYear);
    subtopicMarks.push(item.marks);
  }

  const boardYears = [...boardYearSet];
  return {
    strategyId: strategy.id,
    boardYears,
    totalBoardYears: Math.max(boardYears.length, 1),
    yearsWithTopic: [...yearsWithTopic],
    yearsWithSubtopic: [...yearsWithSubtopic],
    subtopicMarks,
    topicMarks,
    subjectMarks,
  };
}

/**
 * The Laplace (add-one) smoothed rate used by every exam-trend signal:
 * `(hits + 1) / (totalYears + 2)`. Never 0, never 1 — a subtopic that has never
 * appeared keeps a floor, and one that has always appeared never claims
 * certainty.
 */
export function laplaceRate(hits: number, totalYears: number): number {
  return (hits + 1) / (totalYears + 2);
}

/** Which observation set the mean-marks figure actually rests on. */
export type MarksBasis = "subtopic" | "topic" | "subject" | "none";

export interface ExpectedMarksResult {
  /** `meanMarks * appearanceRate`. The rankable figure. */
  expectedMarks: number;
  /** Mean marks of the observations named by `marksBasis`. */
  meanMarks: number;
  /**
   * Honest provenance. `"subtopic"` means the figure rests on real observations
   * of this subtopic; anything else means it was backed off to a broader pool
   * because the subtopic itself was never seen.
   */
  marksBasis: MarksBasis;
  /** Laplace-smoothed appearance rate — identical smoothing to the frequency signal. */
  appearanceRate: number;
  /** Official-board years in which this subtopic actually appeared. */
  appearances: number;
  totalBoardYears: number;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/**
 * Marks-weighted exam signal: **mean marks when it appeared × appearance rate**,
 * Laplace-smoothed with the same `(hits + 1) / (years + 2)` the frequency signal
 * uses.
 *
 * This is the figure `computeHistoricalFrequencySignal` cannot express: that
 * signal measures PRESENCE, so a subtopic asked every year as a 1-marker scores
 * identically to one asked every year as a 5-marker.
 *
 * When the subtopic has never been observed there is no subtopic mean to take,
 * so the mean backs off to the topic pool, then the subject pool. `marksBasis`
 * always reports which pool was used — the number is never presented as a
 * subtopic observation when it is not one.
 */
export function expectedMarks(
  subject: "Maths" | "Science",
  topic: string,
  subtopic: string,
  options: AppearanceIndexOptions = {}
): ExpectedMarksResult {
  const appearance = getSubtopicAppearance(subject, topic, subtopic, options);
  const appearanceRate = laplaceRate(
    appearance.yearsWithSubtopic.length,
    appearance.totalBoardYears
  );

  let marksBasis: MarksBasis = "none";
  let pool: readonly number[] = [];
  if (appearance.subtopicMarks.length > 0) {
    marksBasis = "subtopic";
    pool = appearance.subtopicMarks;
  } else if (appearance.topicMarks.length > 0) {
    marksBasis = "topic";
    pool = appearance.topicMarks;
  } else if (appearance.subjectMarks.length > 0) {
    marksBasis = "subject";
    pool = appearance.subjectMarks;
  }

  const meanMarks = mean(pool);
  return {
    expectedMarks: meanMarks * appearanceRate,
    meanMarks,
    marksBasis,
    appearanceRate,
    appearances: appearance.yearsWithSubtopic.length,
    totalBoardYears: appearance.totalBoardYears,
  };
}
