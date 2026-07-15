// src/components/practice/blueprintTake.ts
//
// The CBSE board-blueprint allocation for a Quick Practice set on the default
// (`marks="all"`) path: A 30% · B 20% · C 20% · D 20% · E 10%.
//
// ── WHY "all" IS OPINIONATED (owner-ratified 2026-07-15) ────────────────────
// The default is DELIBERATELY board-shaped, not a free/even mix. Freedom already lives
// in the ADVANCED FILTER — `parseMarksValue` accepts a comma SET ("1,5" = A+D together),
// plus source (PYQ/NCERT/all), difficulty, style, and count up to 50. So:
//     "all"    = "give me a realistic paper mix"
//     a filter = "give me exactly what I want"
// Two needs, two paths. Making "all" an even mix would DELETE the realistic-mix option
// and gain nothing. This is NOT a duplicate of Chapter Test / Full Mock: those are timed
// test surfaces blueprinting a WHOLE paper; this is a sensible default weighting for a
// practice set on ONE topic. Do not "simplify" it into an even split.
//
// ── WHY THIS MODULE EXISTS ──────────────────────────────────────────────────
// The 30/20/20/20/10 shape was a PRODUCT CLAIM THAT NOTHING GUARDED, and it had
// silently broken. The old fetch effect concatenated the five section batches in
// blueprint order and tail-sliced (`merged.slice(0, questionCount)`). Two stacked
// causes wrecked it:
//   1. MIN_QUESTION_COUNT=3 floors EVERY section's engine request to 3, so a requested
//      3/2/2/2/1 became 3/3/3/3/3 = 15 candidates;
//   2. the tail slice then kept A(3)+B(3)+C(3)+D(1)+E(0).
// Realised shape ≈ A30/B30/C30/D10/E0 — Section E (case-based) NEVER rendered on the
// default path, and D was starved with it. Extracted here as a PURE function so the
// shape is a pinned property, not a hope.
//
// The allocation is the LARGEST-REMAINDER (Hare quota) method: floor each ideal, then
// hand out the leftover slots to the largest unmet fractions. It is the standard
// apportionment rule — it sums EXACTLY, and it degrades predictably.

/** The five CBSE sections, in blueprint order. */
export type BlueprintSection = "A" | "B" | "C" | "D" | "E";

/** One section's engine batch, in the order the engine returned it (already
 *  predictionScore-ordered, and — once the fetch-layer seen-set is supplied —
 *  already unseen-first). */
export interface BlueprintBatch<T> {
  section: BlueprintSection;
  /** This section's blueprint weight. The five must sum to 1. */
  share: number;
  questions: T[];
}

/**
 * Allocate `total` slots across the section batches by blueprint weight.
 *
 * GUARANTEED PROPERTIES (each is pinned in blueprintTake.test.ts — they are the
 * contract, not examples):
 *
 *  · NEVER SHORT — `sum(take) === Math.min(total, sum(stock))`. If the bank can fill
 *    the set, it is filled.
 *  · NEVER PADDED — `take[s] <= stock[s]` always. A section with no stock contributes
 *    nothing; nothing is fabricated to hit a share. (Some topics genuinely have no
 *    case-based items — that is an honest gap, not a hole to paper over.)
 *  · SHAPE — with ample stock, every `take[s]` is within 1 of `total × share[s]`
 *    (the largest-remainder guarantee).
 *  · SECTION E SURVIVES THE DEFAULT — for `total >= 10` (the default count IS 10), any
 *    section with stock gets at least `floor(total × share)` ≥ 1, so E is never zeroed
 *    by rounding. At total=10 the allocation is EXACTLY 3/2/2/2/1.
 *    Below 10, E's 10% share is worth less than one whole question, so E can legitimately
 *    receive 0 — that is arithmetic (there are fewer slots than the weighting can seat),
 *    not the starvation bug. Pinned as expected behaviour so the distinction stays honest.
 *  · REDISTRIBUTION — a section with less stock than its share does not shorten the set:
 *    its surplus slots go to sections that still have stock, largest unmet fraction
 *    first, blueprint order breaking ties.
 *
 * Deduped across batches (first occurrence wins, in blueprint order) before allocating,
 * so a question that somehow appears in two batches can never be served twice or
 * inflate a section's apparent stock.
 *
 * Pure: no clock, no randomness, no I/O. Same inputs → same output.
 */
export function takeBlueprintShare<T>(
  batches: Array<BlueprintBatch<T>>,
  total: number,
  keyOf: (q: T) => string,
): T[] {
  const want = Math.max(0, Math.trunc(total));
  if (want === 0 || batches.length === 0) return [];

  // Dedup across batches, preserving each batch's own order. First occurrence wins, so
  // blueprint order decides which section keeps a shared question.
  const seenKeys = new Set<string>();
  const stock: T[][] = batches.map((b) => {
    const kept: T[] = [];
    for (const q of b.questions) {
      const k = String(keyOf(q) || "").trim();
      if (k && seenKeys.has(k)) continue;
      if (k) seenKeys.add(k);
      kept.push(q);
    }
    return kept;
  });

  // Largest-remainder: floor each ideal, capped by real stock.
  const ideal = batches.map((b) => want * b.share);
  const take = ideal.map((q, i) => Math.min(Math.floor(q), stock[i].length));

  // Hand out every remaining slot — both the fractional remainders AND any slots freed
  // by a stock-capped section — to whoever still has stock and the largest unmet share.
  let remaining = want - take.reduce((a, b) => a + b, 0);
  while (remaining > 0) {
    let best = -1;
    let bestDeficit = -Infinity;
    for (let i = 0; i < batches.length; i += 1) {
      if (take[i] >= stock[i].length) continue; // no headroom — honest, skip it
      const deficit = ideal[i] - take[i];
      // Strictly-greater keeps the earliest (blueprint-order) section on a tie, which
      // makes the tiebreak deterministic and weight-respecting (A before E at 0.5/0.5).
      if (deficit > bestDeficit) {
        bestDeficit = deficit;
        best = i;
      }
    }
    if (best < 0) break; // every section is exhausted — the bank genuinely has fewer
    take[best] += 1;
    remaining -= 1;
  }

  // Emit in blueprint order (A→E), taking each section's slots from the HEAD of its
  // batch — the engine already ordered it by predictionScore (and unseen-first, when a
  // seen-set was supplied), so the head is the right end to take from.
  const out: T[] = [];
  for (let i = 0; i < batches.length; i += 1) {
    for (let j = 0; j < take[i]; j += 1) out.push(stock[i][j]);
  }
  return out;
}
