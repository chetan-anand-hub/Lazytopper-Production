/**
 * CBQ Pack sets (BRIDGE-CODES-1 round 2, owner ruling 8 Nov 2026 20:17: "Go for option 2 on CBq packs, but ofc they will get the
 * complete pack when they buy it"). A chapter's CBQ list is divided into gradable SETS of about 10-15 questions, each its own paper
 * (`PK-<M|S>-<TOPIC>-CBQ<k>`). Every question of the chapter is in exactly one set: the pack's content is unchanged, only how it is
 * divided into papers.
 *
 *   - A CASE (rows that share one passage: the same first `CASE_STEM_CHARS` characters of the stem) is never split across sets.
 *   - The number of sets is ceil(n / CBQ_SET_MAX); each case/row is dealt, in the chapter's printing order (section A..E, then format,
 *     marks, id), to the set holding the fewest questions so far (ties: the lowest set). So every set is a small mixed paper with
 *     objective, short and case-study questions, in the same section order as the board paper.
 *   - Pure and deterministic: same rows, same sets. Any added / removed / edited row changes the sets of its chapter, and the pin in
 *     packSyllabus.guard.test.ts (`packPaperCodes.pin.json`) then fails until the changed codes are versioned (`-V<n>`), so a code
 *     never silently names a different paper.
 */
import type { CanonicalQuestion } from "../../data/predictionTypes";

export const CBQ_SET_MAX = 15;
/** Rows whose stems agree on this many leading characters (whitespace-normalised) are one case. */
export const CASE_STEM_CHARS = 120;

type Row = Pick<CanonicalQuestion, "id" | "questionText">;

function caseKey(q: Row): string | null {
  const t = String(q.questionText ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  return t.length >= CASE_STEM_CHARS ? t.slice(0, CASE_STEM_CHARS) : null;
}

/** The rows as indivisible units (a case's rows together, at its first row's place), in printing order. */
export function cbqUnits<T extends Row>(rows: readonly T[]): T[][] {
  const units: T[][] = [];
  const byKey = new Map<string, T[]>();
  for (const r of rows) {
    const k = caseKey(r);
    const hit = k ? byKey.get(k) : undefined;
    if (hit) {
      hit.push(r);
      continue;
    }
    const unit = [r];
    units.push(unit);
    if (k) byKey.set(k, unit);
  }
  return units;
}

/** The chapter's rows divided into sets (each in printing order, cases contiguous). Empty input -> no sets. */
export function cbqSets<T extends Row>(rows: readonly T[]): T[][] {
  if (rows.length === 0) return [];
  const n = Math.max(1, Math.ceil(rows.length / CBQ_SET_MAX));
  const sets: T[][] = Array.from({ length: n }, () => []);
  for (const unit of cbqUnits(rows)) {
    let best = 0;
    for (let i = 1; i < n; i += 1) if (sets[i].length < sets[best].length) best = i;
    sets[best].push(...unit);
  }
  // Units are dealt in printing order, so each set is already in printing order with every case contiguous.
  return sets;
}
