// src/lib/cbq/cbqClassification.ts
//
// CBQ-1 PR-1 — THE single source of truth for "is this a competency-based question (CBQ)?"
//
// What a CBQ is (CBSE, Circular No. Acad-30/2024, 3 April 2024, Classes IX-X): half of a
// board paper is "Competency Focused Questions in the form of MCQs/Case Based Questions,
// Source-based Integrated Questions or any other type = 50%". So a CBQ can carry 1, 2, 3, 4
// or 5 marks — it is NOT "the 4-mark Section-E case study".
//
// THE RULE (controller decision D1): a row is a CBQ IFF `competencyVerified === true`.
// One flag for LazyTopper-generated and official rows alike (official rows are tagged in
// src/data by the content lane). The bank's legacy `isCompetencyBased` is deliberately NOT
// read here: it is unreliable (see predictionTypes.ts `competencyVerified` comment — every
// chapter reads >= 72), and a classifier that trusted it would label ~5,000 rows "CBQ".
//
// Every student-facing surface (the CBQ label on the shared question card, the CBQ filter
// on Practice, the CBQ chooser, the Competency preset) calls THIS module. No second
// classifier anywhere.
//
// BANK-FREE BY DESIGN: pure functions over a row. It imports nothing, so the Practice Hub's
// static graph stays bank-free (src/config/bankReach.guard.test.ts) even though the hub's
// chooser imports from here.

/** The minimal row shape the classifier reads. Any bank row / PracticeQuestion fits. */
export interface CbqRowLike {
  competencyVerified?: unknown;
  marks?: unknown;
}

/** The mark values a CBSE Class X question can carry. */
export const CBQ_MARK_VALUES = [1, 2, 3, 4, 5] as const;
export type CbqMarkValue = (typeof CBQ_MARK_VALUES)[number];

/** The visible label text and its accessible name. */
export const CBQ_LABEL_TEXT = "CBQ";
export const CBQ_ARIA_LABEL = "Competency-based question";

/** The ONE rule: a CBQ iff the row carries the verified competency flag. */
export function isCbq(q: CbqRowLike | null | undefined): boolean {
  return !!q && q.competencyVerified === true;
}

/**
 * The CBQ flag to CARRY when a bank row is mapped to another shape (the practice engine's
 * row -> PracticeQuestion mapping): `{ competencyVerified: true }` for a CBQ, `{}` otherwise.
 * Keeps the flag's NAME inside this module (the one reader), so a mapper never re-derives it.
 */
export function cbqFlagOf(q: CbqRowLike | null | undefined): { competencyVerified?: true } {
  return isCbq(q) ? { competencyVerified: true } : {};
}

/** The same carry, but CLEARED: for a row derived from a CBQ that is NOT itself verified
 *  (an AI / cache variant spread from a CBQ seed) — never inherit the label. */
export const CBQ_FLAG_CLEARED: { competencyVerified?: true } = { competencyVerified: undefined };

/**
 * The row's real numeric mark value (1-5), or null when it has none. Reads `q.marks`
 * ONLY — never the fused "23" marks bucket (CLAUDE.md §7: the buckets cannot isolate a
 * single mark value).
 */
export function cbqMarks(q: CbqRowLike | null | undefined): CbqMarkValue | null {
  if (!q) return null;
  const m = Number(q.marks);
  return Number.isInteger(m) && m >= 1 && m <= 5 ? (m as CbqMarkValue) : null;
}

/** Only the CBQ rows, order preserved. */
export function filterCbqs<T extends CbqRowLike>(rows: readonly T[]): T[] {
  return rows.filter((q) => isCbq(q));
}

/** CBQ counts per mark value. `unknownMarks` = CBQs whose `marks` is not 1-5 (counted in total). */
export interface CbqMarkCounts {
  byMarks: Record<CbqMarkValue, number>;
  unknownMarks: number;
  total: number;
}

/** Count the CBQs among `rows`, per real mark value. */
export function countCbqsByMarks(rows: readonly CbqRowLike[]): CbqMarkCounts {
  const byMarks: Record<CbqMarkValue, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let unknownMarks = 0;
  let total = 0;
  for (const q of rows) {
    if (!isCbq(q)) continue;
    total += 1;
    const m = cbqMarks(q);
    if (m === null) unknownMarks += 1;
    else byMarks[m] += 1;
  }
  return { byMarks, unknownMarks, total };
}

/** Count CBQs per chapter x mark value (chapter key -> counts). */
export function countCbqsByChapter(
  rowsByChapter: Readonly<Record<string, readonly CbqRowLike[]>>,
): Record<string, CbqMarkCounts> {
  const out: Record<string, CbqMarkCounts> = {};
  for (const [chapter, rows] of Object.entries(rowsByChapter)) out[chapter] = countCbqsByMarks(rows);
  return out;
}

/**
 * Order a CBQ pool so ANY head slice spans mark values: round-robin across the mark
 * groups (1, 2, 3, 4, 5, then rows with unknown marks), each group keeping its incoming
 * order (the engine's predictionScore order). A permutation — nothing dropped, nothing added.
 */
export function interleaveCbqsByMarks<T extends CbqRowLike>(rows: readonly T[]): T[] {
  const groups = new Map<CbqMarkValue | 0, T[]>();
  const keys: Array<CbqMarkValue | 0> = [...CBQ_MARK_VALUES, 0];
  for (const k of keys) groups.set(k, []);
  for (const q of rows) groups.get(cbqMarks(q) ?? 0)!.push(q);
  const out: T[] = [];
  let progressed = true;
  for (let i = 0; progressed; i += 1) {
    progressed = false;
    for (const k of keys) {
      const g = groups.get(k)!;
      if (i < g.length) {
        out.push(g[i]);
        progressed = true;
      }
    }
  }
  return out;
}
